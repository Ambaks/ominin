"""Boucle Omilink. À chaque tour : synchronisation avec le backend (signe de
vie, état des imprimantes observé depuis le tour précédent, configuration à
jour des imprimantes, tickets en attente), envoi de chaque ticket à son
imprimante, accusé. Un ticket n'est acquitté qu'une fois ses octets transmis ;
une imprimante injoignable est signalée au tour suivant et le ticket
réessayé. Toute erreur est journalisée et la boucle continue."""

import base64
import logging
import socket
import time

import httpx

from omilink.config import settings

log = logging.getLogger("omilink")


def connect(printer: dict) -> socket.socket:
    return socket.create_connection(
        (printer["host"], printer["port"]), timeout=settings.printer_timeout_seconds
    )


class Bridge:
    def __init__(self, backend: httpx.Client) -> None:
        self.backend = backend
        self.printers: list[dict] = []
        # id d'imprimante → erreur (None = joignable), alimenté par les
        # impressions et le contrôle périodique, vidé à chaque synchronisation.
        self.status: dict[str, str | None] = {}
        self.checked_at = float("-inf")

    def sync(self) -> list[dict]:
        response = self.backend.post(
            "/omilink/sync",
            json={
                "hostname": socket.gethostname(),
                "version": settings.version,
                "printers": [{"id": id, "error": error} for id, error in self.status.items()],
            },
        )
        response.raise_for_status()
        payload = response.json()
        self.printers = payload["printers"]
        self.status = {}
        return payload["jobs"]

    def print_jobs(self, jobs: list[dict]) -> None:
        printers = {printer["id"]: printer for printer in self.printers}
        for job in jobs:
            printer = printers[job["printer_id"]]
            try:
                with connect(printer) as conn:
                    conn.sendall(base64.b64decode(job["data"]))
            except OSError as exc:
                self.status[printer["id"]] = str(exc)
                log.warning("job %s: %s unreachable (%s)", job["id"], printer["host"], exc)
                continue
            self.status[printer["id"]] = None
            self.backend.post(f"/omilink/jobs/{job['id']}/printed").raise_for_status()
            log.info("printed job %s on %s", job["id"], printer["host"])

    def check_printers(self) -> None:
        if time.monotonic() - self.checked_at < settings.printer_check_interval_seconds:
            return
        self.checked_at = time.monotonic()
        for printer in self.printers:
            try:
                connect(printer).close()
                self.status[printer["id"]] = None
            except OSError as exc:
                self.status[printer["id"]] = str(exc)

    def run_once(self) -> None:
        self.print_jobs(self.sync())
        self.check_printers()


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    # httpx journalise chaque requête : une ligne toutes les 3 s, sans intérêt.
    logging.getLogger("httpx").setLevel(logging.WARNING)
    log.info(
        "omilink %s polling %s every %ss",
        settings.version,
        settings.backend_url,
        settings.poll_interval_seconds,
    )
    with httpx.Client(
        base_url=settings.backend_url,
        headers={"Authorization": f"Bearer {settings.device_token}"},
        timeout=settings.backend_timeout_seconds,
    ) as backend:
        bridge = Bridge(backend)
        while True:
            try:
                bridge.run_once()
            except (httpx.HTTPError, OSError) as exc:
                log.warning("%s", exc)
            time.sleep(settings.poll_interval_seconds)


if __name__ == "__main__":
    main()
