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
# Avance le papier jusqu'au massicot puis coupe (fonction B).
FEED_AND_CUT = GS + b"V\x42\x00"


def _line(text: str) -> bytes:
    return text.encode("cp1252", errors="replace") + b"\n"


def _local(iso: str) -> datetime:
    return datetime.fromisoformat(iso).astimezone(ZoneInfo(settings.omilink_timezone))


def _rule() -> bytes:
    return _line("-" * settings.omilink_ticket_columns)


def _header(title: str) -> list[bytes]:
    return [INIT, CODEPAGE_CP1252, ALIGN_CENTER, BOLD_ON, SIZE_DOUBLE, _line(title), SIZE_NORMAL]


def render_kitchen_ticket(order: dict) -> bytes:
    if order["type"] == "collect":
        pickup = order["pickup_at"]
        out = _header("À EMPORTER") + [
            _line(order["customer_name"]),
            _line(f"Retrait {_local(pickup):%H:%M}" if pickup else "Retrait dès que possible"),
        ]
    else:
        out = _header(f"TABLE {order['tables']['number']}")
    out += [BOLD_OFF, _line(f"{_local(order['created_at']):%d/%m %H:%M}"), ALIGN_LEFT, _rule()]
    for item in order["order_items"]:
        out += [SIZE_TALL, BOLD_ON, _line(f"{item['quantity']} x {item['name']}"), BOLD_OFF, SIZE_NORMAL]
        for option in item["options"]:
            out.append(_line(f"    {option['groupName']} : {option['choiceName']}"))
    out += [_rule(), FEED_AND_CUT]
    return b"".join(out)


def render_test_ticket(printer_name: str, at: str) -> bytes:
    out = _header("TEST OMININ") + [
        _line(printer_name),
        BOLD_OFF,
        _line(f"{_local(at):%d/%m %H:%M}"),
        ALIGN_LEFT,
        _rule(),
        _line("Si vous lisez ceci, l'imprimante est"),
        _line("bien reliée à Ominin."),
        _line("Accents : àéèùç œ €"),
        _rule(),
        FEED_AND_CUT,
    ]
    return b"".join(out)


def render_job(job: dict) -> bytes:
    if job["kind"] == "order":
        return render_kitchen_ticket(job["orders"])
    return render_test_ticket(job["printers"]["name"], job["created_at"])
