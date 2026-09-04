"""Boucle Omilink. Un boîtier neuf génère son jeton, n'en confie que
l'empreinte au backend et s'annonce (enroll) jusqu'à ce qu'un gérant le
rattache dans l'onglet Terminaux. Rattaché, chaque tour synchronise (signe de
vie, état des imprimantes observé depuis le tour précédent, configuration à
jour, tickets en attente, éventuel résultat de balayage), envoie chaque ticket
à son imprimante et l'acquitte. Un ticket n'est acquitté qu'une fois ses
octets transmis ; une imprimante injoignable est signalée au tour suivant et
le ticket réessayé. Un 401 (boîtier retiré) renvoie en appairage. Toute
erreur est journalisée et la boucle continue."""

import base64
import hashlib
import ipaddress
import logging
import secrets
import socket
import time
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlsplit

import httpx
from pydantic import ValidationError

from omilink.config import Settings

log = logging.getLogger("omilink")

# Même longueur que le jeton frappé par omilink_provision_device (32 octets).
TOKEN_BYTES = 32
ENV_FILE = Settings.model_config["env_file"]


def read_serial(path: str) -> str:
    try:
        with open(path) as cpuinfo:
            for line in cpuinfo:
                if line.startswith("Serial"):
                    return line.split(":", 1)[1].strip()
    except OSError:
        pass
    return socket.gethostname()


def ensure_token(settings: Settings, serial: str) -> str:
    """Le jeton stocké ne vaut que pour la machine qui l'a généré : une carte
    clonée sur un autre boîtier repart avec un jeton neuf."""
    if settings.device_token and settings.device_serial == serial:
        return settings.device_token
    token = secrets.token_hex(TOKEN_BYTES)
    try:
        with open(ENV_FILE) as env:
            kept = [
                line for line in env
                if not line.startswith(("DEVICE_TOKEN=", "DEVICE_SERIAL="))
            ]
    except FileNotFoundError:
        kept = []
    if kept and not kept[-1].endswith("\n"):
        kept[-1] += "\n"
    # Réécriture en place (même inode) : le montage du fichier suit.
    with open(ENV_FILE, "w") as env:
        env.writelines(kept)
        env.write(f"DEVICE_TOKEN={token}\nDEVICE_SERIAL={serial}\n")
    return token


class Bridge:
    def __init__(self, backend: httpx.Client, settings: Settings, serial: str, token_hash: str) -> None:
        self.backend = backend
        self.settings = settings
        self.serial = serial
        self.token_hash = token_hash
        # Optimiste : un 401 à la synchronisation renvoie en appairage.
        self.claimed = True
        self.printers: list[dict] = []
        # id d'imprimante → erreur (None = joignable), alimenté par les
        # impressions et le contrôle périodique, vidé à chaque synchronisation.
        self.status: dict[str, str | None] = {}
        self.checked_at = float("-inf")
        # Résultat du dernier balayage, livré à la prochaine synchronisation.
        self.discovered: list[str] | None = None

    @property
    def code(self) -> str:
        return self.serial[-self.settings.serial_code_length:].upper()

    def lan_ip(self) -> str | None:
        """Adresse locale par laquelle on joint le backend (UDP connect :
        aucun paquet émis)."""
        url = urlsplit(self.settings.backend_url)
        port = url.port or (443 if url.scheme == "https" else 80)
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as probe:
                probe.connect((url.hostname or "", port))
                return probe.getsockname()[0]
        except OSError:
            return None

    def connect(self, printer: dict) -> socket.socket:
        return socket.create_connection(
            (printer["host"], printer["port"]), timeout=self.settings.printer_timeout_seconds
        )

    def enroll(self) -> bool:
        response = self.backend.post(
            "/omilink/enroll",
            json={
                "serial": self.serial,
                "token_hash": self.token_hash,
                "hostname": socket.gethostname(),
                "lan_ip": self.lan_ip(),
                "version": self.settings.version,
            },
        )
        response.raise_for_status()
        return response.json()["claimed"]

    def sync(self) -> dict:
        response = self.backend.post(
            "/omilink/sync",
            json={
                "hostname": socket.gethostname(),
                "version": self.settings.version,
                "printers": [{"id": id, "error": error} for id, error in self.status.items()],
                "discovered": self.discovered,
            },
        )
        response.raise_for_status()
        payload = response.json()
        self.printers = payload["printers"]
        self.status = {}
        self.discovered = None
        return payload

    def print_jobs(self, jobs: list[dict]) -> None:
        printers = {printer["id"]: printer for printer in self.printers}
        for job in jobs:
            printer = printers[job["printer_id"]]
            try:
                with self.connect(printer) as conn:
                    conn.sendall(base64.b64decode(job["data"]))
            except OSError as exc:
                self.status[printer["id"]] = str(exc)
                log.warning("job %s: %s unreachable (%s)", job["id"], printer["host"], exc)
                continue
            self.status[printer["id"]] = None
            self.backend.post(f"/omilink/jobs/{job['id']}/printed").raise_for_status()
            log.info("printed job %s on %s", job["id"], printer["host"])

    def check_printers(self) -> None:
        if time.monotonic() - self.checked_at < self.settings.printer_check_interval_seconds:
            return
        self.checked_at = time.monotonic()
        for printer in self.printers:
            try:
                self.connect(printer).close()
                self.status[printer["id"]] = None
            except OSError as exc:
                self.status[printer["id"]] = str(exc)

    def scan(self) -> list[str]:
        """Hôtes du réseau local répondant sur le port des imprimantes."""
        ip = self.lan_ip()
        if ip is None:
            return []
        network = ipaddress.ip_network(f"{ip}/{self.settings.scan_prefix_length}", strict=False)

        def probe(host: ipaddress.IPv4Address | ipaddress.IPv6Address) -> str | None:
            try:
                socket.create_connection(
                    (str(host), self.settings.scan_port), timeout=self.settings.scan_timeout_seconds
                ).close()
                return str(host)
            except OSError:
                return None

        with ThreadPoolExecutor(self.settings.scan_workers) as pool:
            return [host for host in pool.map(probe, network.hosts()) if host]

    def run_once(self) -> None:
        if not self.claimed:
            if not self.enroll():
                return
            self.claimed = True
            log.info("appairé")
        payload = self.sync()
        self.print_jobs(payload["jobs"])
        self.check_printers()
        if payload.get("scan"):
            self.discovered = self.scan()
            log.info("imprimantes détectées : %s", self.discovered)

    def tick(self) -> None:
        try:
            self.run_once()
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 401 and self.claimed:
                self.claimed = False
                log.info(
                    "boîtier non appairé — code %s, en attente dans l'onglet Terminaux",
                    self.code,
                )
            else:
                log.warning("%s", exc)
        except (httpx.HTTPError, OSError) as exc:
            log.warning("%s", exc)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    # httpx journalise chaque requête : une ligne toutes les 3 s, sans intérêt.
    logging.getLogger("httpx").setLevel(logging.WARNING)
    try:
        settings = Settings()
    except ValidationError as exc:
        missing = ", ".join(str(error["loc"][0]).upper() for error in exc.errors())
        log.error(
            "configuration incomplète (%s) : renseignez omilink.env sur la carte SD "
            "du boîtier, puis redémarrez-le",
            missing,
        )
        raise SystemExit(1) from None
    serial = read_serial(settings.serial_file)
    token = ensure_token(settings, serial)
    log.info(
        "omilink %s polling %s every %ss",
        settings.version,
        settings.backend_url,
        settings.poll_interval_seconds,
    )
    with httpx.Client(
        base_url=settings.backend_url,
        headers={"Authorization": f"Bearer {token}"},
        timeout=settings.backend_timeout_seconds,
    ) as backend:
        bridge = Bridge(backend, settings, serial, hashlib.sha256(token.encode()).hexdigest())
        while True:
            bridge.tick()
            time.sleep(settings.poll_interval_seconds)


if __name__ == "__main__":
    main()
