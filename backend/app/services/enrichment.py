import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, datetime
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from app.clients.claude import parse_structured
from app.clients.supabase import get_supabase
from app.config import settings
from app.prompts.qualify import QUALIFY_SYSTEM, Qualification
from app.services import keepalive
from app.services.emailing import EMAIL_RE, is_suppressed

BAD_EMAIL_RE = re.compile(
    r"no-?reply|example\.|exemple\.|domaine\.|mysite\.com|votresite|@restaurant\.fr$|^nc@"
    r"|sentry|wixpress|wix\.com"
    r"|squarespace|schema\.org|ionos\.|@\d+x\.|\.(?:png|jpe?g|webp|svg|gif)$"
    # Platforms and agencies whose address rides on their clients' sites
    # (booking widgets, "site by…" credits): reaching them is not reaching
    # the restaurant — one such address was stored for 73 restaurants.
    r"|privateaser|udevweb|hrvprod|urecommend|wecheers"
    # Role addresses that are never the owner's sales contact.
    r"|^(?:recruit|recrutement|job|career|press|presse|dev|developer|webmaster)[\w.-]*@",
    re.IGNORECASE,
)
# Consumer mailboxes French restaurateurs actually use — the only foreign
# domains trusted for an address seen solely inside a page's scripts.
WEBMAIL_RE = re.compile(
    r"@(?:gmail|googlemail|hotmail|outlook|live|yahoo|icloud|me|orange|wanadoo"
    r"|free|sfr|laposte|bbox|neuf|aol|proton(?:mail)?)\.(?:com|fr|net)$",
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
    restaurants = [p["crm_restaurants"] for p in pending if p.get("crm_restaurants")]

    def _flush() -> None:
        if flush and stats["processed"] % 10 == 0:
            flush(stats)

    # Phase 1 — scrape concurrently. Verdicts the scrape alone settles are
    # recorded here; the rest queue for Claude.
    undecided: list[dict] = []
    with ThreadPoolExecutor(max_workers=settings.enrichment_workers) as pool:
        for future in as_completed(pool.submit(_scrape, sb, r) for r in restaurants):
            keepalive.ping_if_due()
            try:
                prepared = future.result()
            except Exception as exc:  # noqa: BLE001 — stays pending, retried next run
                stats["errors"] += 1
                stats["last_error"] = f"{type(exc).__name__}: {exc}"
                continue
            if prepared["verdict"]:
                _record(sb, prepared, prepared["verdict"], prepared["has_digital_menu"], None, stats)
                stats["processed"] += 1
            else:
                undecided.append(prepared)
            _flush()

    # Phase 2 — Claude, one call at a time. A run of consecutive failures
    # here is systematic (window exhausted, outage): stop, don't burn the
    # rest of the batch.
    consecutive = 0
    for prepared in undecided:
        keepalive.ping_if_due()
        try:
            _judge(sb, prepared, stats)
            stats["processed"] += 1
            consecutive = 0
        except Exception as exc:  # noqa: BLE001 — stays pending, retried next run
            stats["errors"] += 1
            stats["last_error"] = f"{type(exc).__name__}: {exc}"
            consecutive += 1
            if consecutive >= settings.max_consecutive_errors:
                stats["aborted"] = "consecutive errors — systematic failure"
                break
        _flush()

    return stats


def _scrape(sb, restaurant: dict) -> dict:
    """Everything that needs no Claude call.

    Claude is consulted only when the verdict is still open: a proven
    digital menu, no reachable address, or a suppressed one disqualifies
    whatever it would say — and notes are useless for a restaurant Léa
    can't write to. 'no_email' therefore means the address is the only
    thing missing, which is what a contact-form pipeline should target."""
    site = _fetch_site(restaurant["website"]) if restaurant.get("website") else None

    email = restaurant.get("email")
    email_source = None
    if not email and site:
        email = _pick_email(site["emails"], site["embedded_emails"], restaurant["website"])
        if email and _shared_domain(sb, email, restaurant["id"]):
            email = None
        if email:
            email_source = "website"
            sb.table("crm_restaurants").update({"email": email}).eq(
                "id", restaurant["id"]
            ).execute()

    has_digital_menu = site["has_digital_menu"] if site else None
    if has_digital_menu:
        verdict = ("disqualified", "has_digital_menu")
    elif not email:
        verdict = ("disqualified", "no_email")
    elif is_suppressed(email):
        verdict = ("disqualified", "suppressed")
    else:
        verdict = None
    return {
        "restaurant": restaurant,
        "site": site,
        "email_source": email_source,
        "has_digital_menu": has_digital_menu,
        "verdict": verdict,
    }


def _judge(sb, prepared: dict, stats: dict) -> None:
    site = prepared["site"]
    verdict = _qualify(prepared["restaurant"], site["text"] if site else None)
    if verdict.has_digital_menu:
        outcome = ("disqualified", "has_digital_menu")
    elif not verdict.worth_contacting:
        outcome = ("disqualified", "not_worth")
    else:
        outcome = ("qualified", None)
    _record(sb, prepared, outcome, verdict.has_digital_menu, verdict.ai_notes, stats)


def _record(
    sb,
    prepared: dict,
    outcome: tuple[str, str | None],
    has_digital_menu: bool | None,
    ai_notes: str | None,
    stats: dict,
) -> None:
    restaurant, site = prepared["restaurant"], prepared["site"]
    qualification, reason = outcome
    sb.table("outreach_prospects").update(
        {
            "qualification": qualification,
            "disqualify_reason": reason,
            "has_digital_menu": has_digital_menu,
            "email_source": prepared["email_source"],
            "ai_notes": ai_notes,
            "site_excerpt": site["text"] if site else None,
            "enriched_at": datetime.now(UTC).isoformat(),
        }
    ).eq("restaurant_id", restaurant["id"]).execute()
    _classify_lead(sb, restaurant["id"], qualification, reason)
    stats["qualified" if qualification == "qualified" else "disqualified"] += 1


def _classify_lead(sb, restaurant_id: str, qualification: str, reason: str | None) -> None:
    """'new' means discovered, not yet judged — every verdict leaves it.

    Qualified → to_contact (Léa's queue); no address → no_email (the
    contact-form pipeline's pool); anything else → lost with the reason.
    Only the agent-owned statuses are touched: a lead a human already moved
    is never regressed, and a re-scraped no_email lead may come back."""
    if qualification == "qualified":
        update = {"status": "to_contact"}
    elif reason == "no_email":
        update = {"status": "no_email"}
    else:
        update = {"status": "lost", "lost_reason": reason}
    sb.table("crm_leads").update(update).eq("restaurant_id", restaurant_id).in_(
        "status", ["new", "no_email"]
    ).execute()


def _fetch_site(website: str) -> dict | None:
    pages, bundles = _fetch_pages(website)
    if not pages:
        return None
    visible: list[str] = []
    embedded: list[str] = [e for js in bundles for e in EMAIL_RE.findall(js)]
    links: list[str] = []
    texts: list[str] = []
    for html in pages:
        soup = BeautifulSoup(html, "html.parser")
        for anchor in soup.find_all("a", href=True):
            href = anchor["href"]
            links.append(href)
            if href.lower().startswith("mailto:"):
                visible.append(href[7:].split("?")[0])
        text = soup.get_text(" ", strip=True)
        texts.append(text)
        visible.extend(EMAIL_RE.findall(text))
        # get_text() drops <script> contents: JSON-LD and the site-config
        # blobs site builders embed are where many owners' addresses live.
        embedded.extend(EMAIL_RE.findall(html))

    full_text = " ".join(texts)
    providers = [d.strip() for d in settings.qr_menu_provider_domains.split(",") if d.strip()]
    host = urlparse(website).netloc.lower()
    has_digital_menu = (
        any(p in host for p in providers)  # the "website" is the provider's page
        or any(p in link for link in links for p in providers)
        or bool(QR_KEYWORDS_RE.search(full_text))
    ) or None  # only a positive signal; absence proves nothing

    return {
        "text": full_text[: settings.qualify_excerpt_chars],
        "emails": visible,
        "embedded_emails": embedded,
        "has_digital_menu": has_digital_menu,
    }


def _fetch_pages(website: str) -> tuple[list[str], list[str]]:
    """HTML pages, plus the script bundles of a JS-shell homepage.

    A single-page app (Vite, React, Wix…) serves an empty <div id="root">
    and renders everything client-side; its contact address is a string
    literal in the bundle. Fetching the bundle is what a browser would do —
    without it the scraper never sees the page a visitor sees."""
    client = httpx.Client(
        follow_redirects=True,
        timeout=settings.scrape_timeout_seconds,
        headers={"User-Agent": "Mozilla/5.0 (compatible; OmininBot)"},
    )
    pages: list[str] = []
    bundles: list[str] = []
    try:
        home = client.get(website)
        home.raise_for_status()
        pages.append(home.text)

        soup = BeautifulSoup(home.text, "html.parser")
        domain = urlparse(str(home.url)).netloc
        anchors = soup.find_all("a", href=True)
        if not anchors or len(soup.get_text(" ", strip=True)) < settings.scrape_shell_text_chars:
            for script in soup.find_all("script", src=True):
                url = urljoin(str(home.url), script["src"])
                if urlparse(url).netloc != domain:
                    continue
                try:
                    with client.stream("GET", url) as response:
                        response.raise_for_status()
                        chunks: list[bytes] = []
                        size = 0
                        for chunk in response.iter_bytes():
                            chunks.append(chunk)
                            size += len(chunk)
                            if size >= settings.scrape_bundle_max_bytes:
                                break
                        bundles.append(b"".join(chunks).decode("utf-8", "ignore"))
                except httpx.HTTPError:
                    continue

        # Follow a couple of same-domain contact / mentions-légales pages:
        # that's where French restaurants publish their email.
        seen: set[str] = set()
        for anchor in anchors:
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
    return pages, bundles


def _pick_email(visible: list[str], embedded: list[str], website: str) -> str | None:
    """The site's own name first, else the first human-visible address.

    An address seen only inside scripts is trusted on the site's own name or
    a consumer mailbox alone: JS bundles carry third parties' addresses (a
    booking widget's privacy contact) that would get a stranger emailed.
    "Own name" compares the registrable label, not the exact domain — a
    restaurant on flatmyburger.fr writes from contact@flatmyburger.com."""
    site_label = _label(urlparse(website).netloc)

    def own(candidate: str) -> bool:
        return bool(site_label) and _label(candidate.rsplit("@", 1)[-1]) == site_label

    candidates = _clean(visible)
    candidates += [
        c for c in _clean(embedded)
        if c not in candidates and (own(c) or WEBMAIL_RE.search(c))
    ]
    return next((c for c in candidates if own(c)), candidates[0] if candidates else None)


def _shared_domain(sb, email: str, restaurant_id: str) -> bool:
    """Is this non-consumer domain already the address of several other
    restaurants? Then it is a platform or an agency riding on their sites
    (see email_shared_domain_max) — a blocklist only catches the ones
    already noticed."""
    if WEBMAIL_RE.search(email):
        return False
    domain = email.rsplit("@", 1)[-1]
    count = (
        sb.table("crm_restaurants")
        .select("id", count="exact")
        .ilike("email", f"%@{domain}")
        .neq("id", restaurant_id)
        .limit(1)
        .execute()
    ).count or 0
    return count >= settings.email_shared_domain_max


def _label(host: str) -> str:
    """Registrable name of a host: 'www.flatmyburger.fr' → 'flatmyburger'."""
    parts = host.lower().removeprefix("www.").split(".")
    return parts[-2] if len(parts) >= 2 else ""


def _clean(found: list[str]) -> list[str]:
    cleaned: list[str] = []
    for candidate in found:
        candidate = candidate.strip().lower().strip(".")
        if (
            candidate not in cleaned
            and EMAIL_RE.fullmatch(candidate)
            and not BAD_EMAIL_RE.search(candidate)
        ):
            cleaned.append(candidate)
    return cleaned


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
