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
SIZE_WIDE = GS + b"!\x10"
SIZE_DOUBLE = GS + b"!\x11"
REVERSE_ON = GS + b"B\x01"
REVERSE_OFF = GS + b"B\x00"
FEED_AND_CUT = GS + b"V\x42\x00"
LF = b"\n"


def _line(text: str) -> bytes:
    return text.encode("cp1252", errors="replace") + LF


def _local(iso: str) -> datetime:
    return datetime.fromisoformat(iso).astimezone(ZoneInfo(settings.omilink_timezone))


def _cols() -> int:
    return settings.omilink_ticket_columns


def _thick_rule() -> bytes:
    return _line("=" * _cols())


def _thin_rule() -> bytes:
    return _line("-" * _cols())


def _banner(title: str) -> list[bytes]:
    """Full-width reverse-print header bar — falls back to bold text
    on printers that ignore GS B."""
    half = _cols() // 2
    padded = title.center(half)
    return [
        ALIGN_CENTER,
        _thick_rule(),
        REVERSE_ON, BOLD_ON, SIZE_DOUBLE,
        _line(padded),
        SIZE_NORMAL, BOLD_OFF, REVERSE_OFF,
        _thick_rule(),
    ]


def render_kitchen_ticket(order: dict) -> bytes:
    out: list[bytes] = [INIT, CODEPAGE_CP1252]

    if order["type"] == "collect":
        pickup = order["pickup_at"]
        out += _banner("À EMPORTER")
        out += [
            ALIGN_CENTER, LF,
            BOLD_ON, SIZE_DOUBLE,
            _line(order["customer_name"].upper()),
            SIZE_NORMAL, BOLD_OFF,
            _line(
                f"Retrait {_local(pickup):%H:%M}"
                if pickup
                else "Dès que possible"
            ),
        ]
    else:
        out += _banner(f"TABLE {order['tables']['number']}")

    out += [
        ALIGN_CENTER,
        _line(f"{_local(order['created_at']):%d/%m \xb7 %H:%M}"),
        ALIGN_LEFT, LF,
    ]

    for item in order["order_items"]:
        out += [
            SIZE_TALL, BOLD_ON,
            _line(f"  {item['quantity']} \xd7  {item['name']}"),
            BOLD_OFF, SIZE_NORMAL,
        ]
        for option in item["options"]:
            out.append(
                _line(f"       \xbb {option['groupName']} : {option['choiceName']}")
            )
        out.append(LF)

    out += [_thin_rule(), FEED_AND_CUT]
    return b"".join(out)


def render_test_ticket(printer_name: str, at: str) -> bytes:
    out: list[bytes] = [INIT, CODEPAGE_CP1252]
    out += _banner("TEST")
    out += [
        ALIGN_CENTER, LF,
        BOLD_ON, _line(printer_name), BOLD_OFF,
        _line(f"{_local(at):%d/%m \xb7 %H:%M}"),
        LF, ALIGN_LEFT,
        _line("Si vous lisez ceci, l'imprimante"),
        _line("est bien reli\xe9e \xe0 Ominin."),
        LF,
        _line("Accents : \xe0\xe9\xe8\xf9\xe7 œ €"),
        _thin_rule(),
        FEED_AND_CUT,
    ]
    return b"".join(out)


def render_job(job: dict) -> bytes:
    if job["kind"] == "order":
        return render_kitchen_ticket(job["orders"])
    return render_test_ticket(job["printers"]["name"], job["created_at"])
