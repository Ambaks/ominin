"""AutoResearch: autonomous outreach optimization (the Karpathy Loop for Lea).

Weekly. Measures the reply rate of every prompt variant in rotation, pairs a
sample of sent cold emails with the context Lea wrote them from (restaurant
data, ai_notes, scraped website excerpt) and their outcome (reply or
silence), and hands it all to Claude for pattern analysis. The findings then
score pending prospects so the most promising go out first, and may yield
one new prompt variant, inserted as a candidate for human approval.
"""

from datetime import UTC, datetime, timedelta

from app.clients.claude import parse_structured
from app.clients.supabase import get_supabase
from app.config import settings
from app.prompts.autoresearch import (
    ANALYSIS_SYSTEM,
    SCORING_SYSTEM,
    AnalysisFindings,
    ScoringResult,
)
from app.prompts.cold_email import COLD_EMAIL_RULES
from app.services import keepalive, notify

_STATUS_FR = {
    "baseline": "référence en rotation",
    "active": "variante en rotation",
    "candidate": "proposée, en attente d'examen",
    "retired": "retirée",
}


def run_autoresearch(*, flush=None) -> dict:
    sb = get_supabase()
    stats: dict = {"analyzed": 0, "scored": 0, "variant_proposed": False}
    cutoff = datetime.now(UTC) - timedelta(days=settings.autoresearch_reply_window_days)

    variants = _variant_performance(sb, cutoff)
    total_settled = sum(v["sent"] for v in variants)
    if total_settled < settings.autoresearch_min_emails:
        return {
            **stats,
            "skipped": True,
            "reason": f"only {total_settled} settled emails "
            f"(min {settings.autoresearch_min_emails})",
        }

    campaign = _build_campaign_data(sb, cutoff, variants)
    keepalive.ping_if_due()
    findings = _analyze(campaign)
    stats["analyzed"] = len(campaign["emails"])
    stats["variant_performance"] = [
        {k: v[k] for k in ("id", "name", "status", "sent", "responded")}
        for v in variants
    ]
    stats["findings"] = {
        "response_patterns": findings.response_patterns,
        "email_quality_insights": findings.email_quality_insights,
        "input_data_patterns": findings.input_data_patterns,
        "prompt_recommendations": findings.prompt_recommendations,
    }

    proposed = findings.proposed_variant
    if proposed and any(v["status"] == "candidate" for v in variants):
        # One proposal at a time: a backlog of unreviewed candidates is noise
        # for a solo operator, and the next run re-proposes with fresher data.
        stats["variant_skipped"] = "a candidate is already awaiting review"
    elif proposed:
        sb.table("outreach_variants").insert(
            {
                "name": proposed.name,
                "hypothesis": proposed.hypothesis,
                "prompt_rules": proposed.prompt_rules,
                "status": "candidate",
            }
        ).execute()
        stats["variant_proposed"] = True
        stats["variant_name"] = proposed.name
        notify.send(
            "Léa — nouvelle variante de prompt proposée",
            f"{proposed.name}\n\n{proposed.hypothesis}\n\n"
            f"À examiner : {settings.frontend_origin}/admin/lea",
        )

    if flush:
        flush(stats)

    pending = _pending_prospects(sb)
    if pending:
        keepalive.ping_if_due()
        scores = _score_prospects(findings, pending)
        for restaurant_id, score in scores.items():
            sb.table("outreach_prospects").update({"priority_score": score}).eq(
                "restaurant_id", restaurant_id
            ).execute()
        stats["scored"] = len(scores)

    return stats


def _variant_performance(sb, cutoff: datetime) -> list[dict]:
    """Every set of prompt rules with its settled sends and replies.

    The hardcoded rules are listed first: they are the baseline until a
    variant is promoted, and remain the label of the emails sent before
    that (no variant_id). Retired and candidate rows are included so the
    analyst knows what was already tried or is awaiting review."""
    rows = (
        sb.table("outreach_variants")
        .select("id, name, hypothesis, prompt_rules, status")
        .order("created_at")
        .execute()
    ).data
    counts = {
        row["variant_id"]: row
        for row in sb.rpc(
            "outreach_variant_stats", {"settled_before": cutoff.isoformat()}
        )
        .execute()
        .data
    }
    promoted = any(r["status"] == "baseline" for r in rows)
    variants = [
        {
            "id": None,
            "name": "Règles par défaut (code)",
            "hypothesis": "Règles de rédaction d'origine, définies dans le backend.",
            "prompt_rules": COLD_EMAIL_RULES,
            "status": "retired" if promoted else "baseline",
        },
        *rows,
    ]
    for variant in variants:
        count = counts.get(variant["id"], {})
        variant["sent"] = count.get("sent", 0)
        variant["responded"] = count.get("responded", 0)
    return variants


def _sent_cold(sb):
    return (
        sb.table("outreach_emails")
        .select("restaurant_id, subject, body_text, sent_at, metadata")
        .eq("direction", "outbound")
        .eq("kind", "cold")
        .eq("status", "sent")
    )


def _build_campaign_data(sb, cutoff: datetime, variants: list[dict]) -> dict:
    """The sample: every reply (most recent restaurants first) plus the most
    recent settled silences, each with the inputs Lea composed from."""
    inbound = (
        sb.table("outreach_emails")
        .select("restaurant_id, classification, body_text, received_at")
        .eq("direction", "inbound")
        .eq("status", "received")
        .or_("classification.is.null,classification.neq.bounce")
        .order("received_at", desc=True)
        .execute()
    ).data
    # Rows arrive newest first: a restaurant keeps its rank (latest reply)
    # while the stored row ends up being its first reply — the reaction to
    # the cold email itself.
    replies: dict[str, dict] = {}
    for reply in inbound:
        replies[reply["restaurant_id"]] = reply

    sample_size = settings.autoresearch_sample_size
    replied_ids = list(replies)[:sample_size]
    responded_emails = (
        _sent_cold(sb).in_("restaurant_id", replied_ids).execute().data
        if replied_ids
        else []
    )
    silent_emails: list[dict] = []
    room = sample_size - len(responded_emails)
    if room > 0:
        settled = (
            _sent_cold(sb)
            .lt("sent_at", cutoff.isoformat())
            .order("sent_at", desc=True)
            .limit(sample_size)
            .execute()
        ).data
        silent_emails = [e for e in settled if e["restaurant_id"] not in replies][:room]

    sent = responded_emails + silent_emails
    restaurant_ids = list({e["restaurant_id"] for e in sent})
    restaurants: dict[str, dict] = {}
    prospects: dict[str, dict] = {}
    if restaurant_ids:
        restaurants = {
            r["id"]: r
            for r in (
                sb.table("crm_restaurants")
                .select("id, name, city, category, cuisine, website")
                .in_("id", restaurant_ids)
                .execute()
            ).data
        }
        prospects = {
            p["restaurant_id"]: p
            for p in (
                sb.table("outreach_prospects")
                .select("restaurant_id, ai_notes, site_excerpt, email_source")
                .in_("restaurant_id", restaurant_ids)
                .execute()
            ).data
        }

    names = {v["id"]: v["name"] for v in variants}
    emails = []
    for e in sent:
        rid = e["restaurant_id"]
        reply = replies.get(rid)
        emails.append(
            {
                "restaurant": restaurants.get(rid, {}),
                "prospect": prospects.get(rid, {}),
                "email": {
                    "subject": e.get("subject"),
                    "body": e.get("body_text"),
                    "sent_at": e.get("sent_at"),
                    "variant": names.get((e.get("metadata") or {}).get("variant_id")),
                },
                "outcome": {
                    "responded": reply is not None,
                    "classification": reply.get("classification") if reply else None,
                    "reply_text": reply.get("body_text") if reply else None,
                },
            }
        )

    return {
        "emails": emails,
        "variants": variants,
        "total_settled": sum(v["sent"] for v in variants),
        "total_responded": sum(v["responded"] for v in variants),
    }


def _rate(responded: int, sent: int) -> str:
    return f"{responded / sent * 100:.1f} %" if sent else "—"


def _analyze(campaign: dict) -> AnalysisFindings:
    responded = [e for e in campaign["emails"] if e["outcome"]["responded"]]
    silent = [e for e in campaign["emails"] if not e["outcome"]["responded"]]
    rule = "=" * 60

    parts = [
        (
            f"STATISTIQUES GLOBALES : {campaign['total_settled']} e-mails envoyés "
            f"(hors envois de moins de {settings.autoresearch_reply_window_days} "
            f"jours sans réponse), {campaign['total_responded']} réponses "
            f"({_rate(campaign['total_responded'], campaign['total_settled'])})"
        ),
        "",
        rule,
        "RÈGLES DE RÉDACTION ET LEUR PERFORMANCE",
        rule,
    ]
    for v in campaign["variants"]:
        parts.append(
            f"\n--- {v['name']} [{_STATUS_FR[v['status']]}] : {v['sent']} envoyés, "
            f"{v['responded']} réponses ({_rate(v['responded'], v['sent'])}) ---"
        )
        parts.append(f"Hypothèse : {v['hypothesis']}")
        if v["status"] in ("baseline", "active"):
            parts.append(f"Règles :\n{v['prompt_rules']}")

    parts.extend(
        [
            "",
            rule,
            (
                f"ÉCHANTILLON ANALYSÉ : {len(responded)} e-mails avec réponse, "
                f"{len(silent)} sans réponse"
            ),
            rule,
            "",
            rule,
            "E-MAILS AVEC RÉPONSE (analyser en priorité)",
            rule,
        ]
    )
    for i, entry in enumerate(responded, 1):
        parts.append(_format_entry(i, entry))

    parts.extend(["", rule, "E-MAILS SANS RÉPONSE", rule])
    for i, entry in enumerate(silent, 1):
        parts.append(_format_entry(i, entry))

    return parse_structured(ANALYSIS_SYSTEM, "\n".join(parts), AnalysisFindings)


def _format_entry(index: int, entry: dict) -> str:
    r = entry["restaurant"]
    p = entry["prospect"]
    e = entry["email"]
    o = entry["outcome"]

    tag = (
        f"RÉPONSE ({o['classification'] or 'non classée'})"
        if o["responded"]
        else "PAS DE RÉPONSE"
    )
    lines = [
        f"\n--- #{index} -> {tag} ---",
        "DONNÉES D'ENTRÉE :",
        f"  Restaurant : {r.get('name', '?')}",
        f"  Ville : {r.get('city', '?')}",
        f"  Catégorie : {r.get('category', '?')}",
        f"  Cuisine : {r.get('cuisine', '?')}",
        f"  Site web : {r.get('website') or 'aucun'}",
        f"  Source e-mail : {p.get('email_source', '?')}",
        f"  Notes d'analyse : {p.get('ai_notes') or 'aucune'}",
    ]
    if p.get("site_excerpt"):
        lines.append(f"  Extrait du site web :\n    {p['site_excerpt']}")

    lines.extend(
        [
            "E-MAIL ENVOYÉ :",
            f"  Règles : {e.get('variant') or 'inconnues'}",
            f"  Objet : {e.get('subject', '?')}",
            f"  Corps :\n    {e.get('body', '?')}",
        ]
    )
    if o.get("reply_text"):
        lines.extend(
            [
                "RÉPONSE DU RESTAURATEUR :",
                f"  Texte : {o['reply_text']}",
            ]
        )

    return "\n".join(lines)


def _pending_prospects(sb) -> list[dict]:
    return (
        sb.table("outreach_prospects")
        .select(
            "restaurant_id, ai_notes, email_source,"
            " crm_restaurants(id, name, city, category, cuisine, website)"
        )
        .eq("qualification", "qualified")
        .order("priority_score", nullsfirst=True)
        .order("created_at")
        .limit(settings.autoresearch_scoring_batch_size)
        .execute()
    ).data


def _score_prospects(findings: AnalysisFindings, prospects: list[dict]) -> dict[str, int]:
    """Scores keyed by restaurant_id, restricted to the prospects actually
    submitted (the model may drop or invent ids) and clamped to 0-100."""
    criteria = (
        "PATTERNS DE RÉPONSE :\n"
        + "\n".join(f"- {p}" for p in findings.response_patterns)
        + "\n\nFACTEURS DANS LES DONNÉES D'ENTRÉE :\n"
        + "\n".join(f"- {p}" for p in findings.input_data_patterns)
        + "\n\nINSIGHTS SUR LA QUALITÉ DES E-MAILS :\n"
        + "\n".join(f"- {p}" for p in findings.email_quality_insights)
    )

    lines = []
    for p in prospects:
        r = p.get("crm_restaurants") or {}
        lines.append(
            f"restaurant_id={p['restaurant_id']} | "
            f"{r.get('name', '?')} | {r.get('city', '?')} | "
            f"{r.get('category', '?')} | {r.get('cuisine', '?')} | "
            f"site={'oui' if r.get('website') else 'non'} | "
            f"source_email={p.get('email_source', '?')} | "
            f"notes={p.get('ai_notes') or 'aucune'}"
        )

    content = f"{criteria}\n\nPROSPECTS À SCORER ({len(lines)}) :\n" + "\n".join(lines)
    result = parse_structured(SCORING_SYSTEM, content, ScoringResult)

    known = {p["restaurant_id"] for p in prospects}
    return {
        s.restaurant_id: max(0, min(100, s.score))
        for s in result.scores
        if s.restaurant_id in known
    }
