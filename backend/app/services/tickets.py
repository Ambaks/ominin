"""Tickets rendus en ESC/POS. Omilink envoie ces octets tels quels à
l'imprimante (port 9100) : la mise en page vit ici et se déploie avec le
backend, sans toucher aux appareils installés."""

from datetime import datetime
from zoneinfo import ZoneInfo

from app.config import settings

ESC = b"\x1b"
GS = b"\x1d"
INIT = ESC + b"@"
# Page de code 16 = Windows-1252 : accents français, œ et symbole euro
# (PC858 n'a pas le œ des bœuf/œuf).
CODEPAGE_CP1252 = ESC + b"t\x10"
ALIGN_LEFT = ESC + b"a\x00"
ALIGN_CENTER = ESC + b"a\x01"
BOLD_ON = ESC + b"E\x01"
BOLD_OFF = ESC + b"E\x00"
SIZE_NORMAL = GS + b"!\x00"
SIZE_TALL = GS + b"!\x01"
SIZE_DOUBLE = GS + b"!\x11"
FEED_AND_CUT = GS + b"V\x42\x00"
LF = b"\n"


def _line(text: str) -> bytes:
    return text.encode("cp1252", errors="replace") + LF


def _local(iso: str) -> datetime:
    return datetime.fromisoformat(iso).astimezone(ZoneInfo(settings.omilink_timezone))


def _rule() -> bytes:
    return _line("-" * settings.omilink_ticket_columns)


def _group_by_category(order_items: list[dict]) -> list[tuple[str, list[dict]]]:
    """Group items by category name, sorted by category position."""
    groups: dict[tuple[int, str], list[dict]] = {}
    for oi in order_items:
        cat = (oi.get("items") or {}).get("categories") or {}
        key = (cat.get("position", 9999), cat.get("name", ""))
        groups.setdefault(key, []).append(oi)
    return [(name, items) for (_, name), items in sorted(groups.items())]


def _render_items(order_items: list[dict]) -> list[bytes]:
    out: list[bytes] = []
    for cat_name, items in _group_by_category(order_items):
        if cat_name:
            out += [BOLD_ON, _line(cat_name.upper()), BOLD_OFF, LF]
        for item in items:
            out += [
                SIZE_TALL, BOLD_ON,
                _line(f"{item['quantity']} \xd7 {item['name']}"),
                BOLD_OFF, SIZE_NORMAL,
            ]
            for opt in item["options"]:
                out.append(_line(f"    \xbb {opt['groupName']} : {opt['choiceName']}"))
            out.append(LF)
    return out


def render_kitchen_ticket(order: dict, restaurant_name: str) -> bytes:
    out: list[bytes] = [INIT, CODEPAGE_CP1252]

    out += [
        ALIGN_CENTER, BOLD_ON, SIZE_DOUBLE,
        _line(f"* {restaurant_name.upper()} *"),
        SIZE_NORMAL, BOLD_OFF, LF,
    ]

    if order["type"] == "collect":
        pickup = order["pickup_at"]
        out += [
            BOLD_ON, SIZE_TALL,
            _line("À EMPORTER"),
            SIZE_NORMAL,
            _line(order["customer_name"]),
            BOLD_OFF,
            _line(
                f"Retrait {_local(pickup):%H:%M}"
                if pickup
                else "Dès que possible"
            ),
        ]
    else:
        out += [
            BOLD_ON, SIZE_TALL,
            _line(f"TABLE {order['tables']['number']}"),
            SIZE_NORMAL, BOLD_OFF,
        ]

    out += [ALIGN_LEFT, _rule(), LF]
    out += _render_items(order["order_items"])
    out += [
        _rule(),
        ALIGN_CENTER,
        _line(f"{_local(order['created_at']):%H:%M}"),
        FEED_AND_CUT,
    ]
    return b"".join(out)


def render_test_ticket(printer_name: str, at: str, restaurant_name: str) -> bytes:
    out: list[bytes] = [
        INIT, CODEPAGE_CP1252,
        ALIGN_CENTER, BOLD_ON, SIZE_DOUBLE,
        _line(f"* {restaurant_name.upper()} *"),
        SIZE_NORMAL,
        _line("TEST"),
        BOLD_OFF, LF,
        _line(printer_name),
        LF, ALIGN_LEFT,
        _line("Si vous lisez ceci, l'imprimante"),
        _line("est bien reliée à Ominin."),
        _line("Accents : àéèùç œ €"),
        _rule(),
        ALIGN_CENTER,
        _line(f"{_local(at):%H:%M}"),
        FEED_AND_CUT,
    ]
    return b"".join(out)


def render_job(job: dict, restaurant_name: str = "") -> bytes:
    if job["kind"] == "order":
        return render_kitchen_ticket(job["orders"], restaurant_name)
    return render_test_ticket(job["printers"]["name"], job["created_at"], restaurant_name)
