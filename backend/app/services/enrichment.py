import re
from datetime import UTC, datetime
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from app.clients.claude import parse_structured
from app.clients.supabase import get_supabase
from app.config import settings
from app.prompts.qualify import QUALIFY_SYSTEM, Qualification
from app.services import keepalive
from app.services.emailing import is_suppressed

EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
BAD_EMAIL_RE = re.compile(
    r"no-?reply|example\.|sentry|wixpress|\.png$|\.jpe?g$|\.webp$|\.svg$",
    re.IGNORECASE,
)
CONTACT_LINK_RE = re.compile(r"contact|mentions[- ]?l[ée]gales", re.IGNORECASE)
QR_KEYWORDS_RE = re.compile(
    r"menu digital|commander en ligne|click\s?&\s?collect|qr\s?code",
    re.IGNORECASE,
)


def run_enrichment(*, flush=None) -> dict:
    sb = get_supabase()
    stats = {"processed": 0, "qualified": 0, "disqualified": 0, "errors": 0}
    pending = (
        sb.table("outreach_prospects")
        .select("restaurant_id, crm_restaurants(id, name, city, category, email, website, phone)")
        .eq("qualification", "pending")
        .order("created_at")
        .limit(settings.enrichment_batch_size)
        .execute()
    ).data

    consecutive = 0
    for prospect in pending:
        restaurant = prospect.get("crm_restaurants")
        if not restaurant:
            continue
        keepalive.ping_if_due()
        try:
            _enrich_one(sb, restaurant, stats)
            stats["processed"] += 1
            consecutive = 0
        except Exception as exc:  # noqa: BLE001 — stays pending, retried next run
            stats["errors"] += 1
            stats["last_error"] = f"{type(exc).__name__}: {exc}"
            consecutive += 1
            if consecutive >= settings.max_consecutive_errors:
                stats["aborted"] = "consecutive errors — systematic failure"
                break
        if flush and stats["processed"] % 10 == 0:
            flush(stats)

    return stats


def _enrich_one(sb, restaurant: dict, stats: dict) -> None:
    site = _fetch_site(restaurant["website"]) if restaurant.get("website") else None

    email = restaurant.get("email")
    email_source = None
    if not email and site:
        email = _pick_email(site["emails"], restaurant["website"])
        if email:
            email_source = "website"
            sb.table("crm_restaurants").update({"email": email}).eq(
                "id", restaurant["id"]
            ).execute()

    has_digital_menu = site["has_digital_menu"] if site else None
    verdict = _qualify(restaurant, site["text"] if site else None)
    if has_digital_menu is not True:
        has_digital_menu = verdict.has_digital_menu

    if has_digital_menu:
        qualification, reason = "disqualified", "has_digital_menu"
    elif not verdict.worth_contacting:
        qualification, reason = "disqualified", "not_worth"
    elif not email:
        qualification, reason = "disqualified", "no_email"
    elif is_suppressed(email):
        qualification, reason = "disqualified", "suppressed"
    else:
        qualification, reason = "qualified", None

    sb.table("outreach_prospects").update(
        {
            "qualification": qualification,
            "disqualify_reason": reason,
            "has_digital_menu": has_digital_menu,
            "email_source": email_source,
            "ai_notes": verdict.ai_notes,
            "enriched_at": datetime.now(UTC).isoformat(),
        }
    ).eq("restaurant_id", restaurant["id"]).execute()
    stats["qualified" if qualification == "qualified" else "disqualified"] += 1


def _fetch_site(website: str) -> dict | None:
    pages = _fetch_pages(website)
    if not pages:
        return None
    emails: list[str] = []
    links: list[str] = []
    texts: list[str] = []
    for html in pages:
        soup = BeautifulSoup(html, "html.parser")
        for anchor in soup.find_all("a", href=True):
            href = anchor["href"]
            links.append(href)
            if href.lower().startswith("mailto:"):
                emails.append(href[7:].split("?")[0])
        text = soup.get_text(" ", strip=True)
        texts.append(text)
        emails.extend(EMAIL_RE.findall(text))

    full_text = " ".join(texts)
    providers = [d.strip() for d in settings.qr_menu_provider_domains.split(",") if d.strip()]
    has_digital_menu = (
        any(p in link for link in links for p in providers)
        or bool(QR_KEYWORDS_RE.search(full_text))
    ) or None  # only a positive signal; absence proves nothing

    return {
        "text": full_text[: settings.qualify_excerpt_chars],
        "emails": emails,
        "has_digital_menu": has_digital_menu,
    }


def _fetch_pages(website: str) -> list[str]:
    client = httpx.Client(
        follow_redirects=True,
        timeout=settings.scrape_timeout_seconds,
        headers={"User-Agent": "Mozilla/5.0 (compatible; OmininBot)"},
    )
    pages: list[str] = []
    try:
        home = client.get(website)
        home.raise_for_status()
        pages.append(home.text)

        # Follow a couple of same-domain contact / mentions-légales pages:
        # that's where French restaurants publish their email.
        soup = BeautifulSoup(home.text, "html.parser")
        domain = urlparse(str(home.url)).netloc
        seen: set[str] = set()
        for anchor in soup.find_all("a", href=True):
            if len(seen) >= settings.scrape_max_extra_pages:
                break
            label = f"{anchor['href']} {anchor.get_text()}"
            if not CONTACT_LINK_RE.search(label):
                continue
            url = urljoin(str(home.url), anchor["href"])
            if urlparse(url).netloc != domain or url in seen:
                continue
            seen.add(url)
            try:
                extra = client.get(url)
                extra.raise_for_status()
                pages.append(extra.text)
            except httpx.HTTPError:
                continue
    except httpx.HTTPError:
        pass
    finally:
        client.close()
    return pages


def _pick_email(candidates: list[str], website: str) -> str | None:
    cleaned = []
    for candidate in candidates:
        candidate = candidate.strip().lower().strip(".")
        if candidate and not BAD_EMAIL_RE.search(candidate):
            cleaned.append(candidate)
    if not cleaned:
        return None
    site_domain = urlparse(website).netloc.removeprefix("www.")
    for candidate in cleaned:
        if site_domain and candidate.endswith("@" + site_domain):
            return candidate
    return cleaned[0]


def _qualify(restaurant: dict, site_text: str | None) -> Qualification:
    facts = [
        f"Nom : {restaurant['name']}",
        f"Ville : {restaurant.get('city') or 'inconnue'}",
        f"Catégorie Google : {restaurant.get('category')}",
        f"Site web : {restaurant.get('website') or 'aucun'}",
        f"Téléphone : {restaurant.get('phone') or 'inconnu'}",
    ]
    content = "\n".join(facts)
    if site_text:
        content += f"\n\nExtrait du site web :\n{site_text}"
    # Raises on failure → the prospect stays pending, retried next run.
    return parse_structured(QUALIFY_SYSTEM, content, Qualification)
