"""Endpoints interrogés par les appareils Omilink (voir omilink/). Le même
contrat — « quels tickets sortir ? » puis accusé par ticket — servira aux
imprimantes Star CloudPRNT, qui interrogent elles-mêmes un serveur."""

import base64
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.clients.supabase import get_supabase
from app.config import settings
from app.deps import Device, require_device
from app.services.tickets import render_job

router = APIRouter(prefix="/omilink")


def _build_routing(supabase, printer_ids: list[str]) -> dict[str, set[str]]:
    """Return {printer_id: {item_id, …}} for printers that have routing rules."""
    rows = (
        supabase.table("item_printers")
        .select("item_id, printer_id")
        .in_("printer_id", printer_ids)
        .execute()
        .data
    )
    routing: dict[str, set[str]] = {}
    for r in rows:
        routing.setdefault(r["printer_id"], set()).add(r["item_id"])
    return routing


def _apply_routing(row: dict, routing: dict[str, set[str]]) -> None:
    """Filter a print-job's order_items in place based on routing rules."""
    if row["kind"] != "order" or not row.get("orders"):
        return
    pid = row["printer_id"]
    if pid not in routing:
        return
    allowed = routing[pid]
    row["orders"]["order_items"] = [
        oi
        for oi in row["orders"]["order_items"]
        if oi.get("item_id") is None or oi["item_id"] in allowed
    ]


class EnrollRequest(BaseModel):
    serial: str = Field(max_length=64)
    token_hash: str = Field(pattern=r"^[0-9a-f]{64}$")
    hostname: str
    lan_ip: str | None = None
    version: str


class PrinterStatus(BaseModel):
    id: str
    error: str | None = None


class SyncRequest(BaseModel):
    hostname: str
    version: str
    printers: list[PrinterStatus] = []
    # Adresses répondant sur le port des imprimantes quand un balayage vient
    # d'avoir lieu ; absent sinon.
    discovered: list[str] | None = None


@router.post("/enroll")
def enroll(body: EnrollRequest, request: Request) -> dict:
    """Annonce d'un boîtier pas encore rattaché — sans jeton, donc sans auth."""
    # Render pose X-Forwarded-For ; en local, l'adresse de la socket.
    forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    public_ip = forwarded or (request.client.host if request.client else "")
    claimed = (
        get_supabase()
        .rpc(
            "omilink_enroll",
            {
                "p_serial": body.serial,
                "p_token_hash": body.token_hash,
                "p_hostname": body.hostname,
                "p_lan_ip": body.lan_ip,
                "p_public_ip": public_ip,
                "p_version": body.version,
                "p_ttl_seconds": settings.omilink_enrollment_ttl_seconds,
            },
        )
        .execute()
        .data
    )
    return {"claimed": claimed}


@router.post("/sync")
def sync(body: SyncRequest, device: Device = Depends(require_device)) -> dict:
    supabase = get_supabase()
    payload = (
        supabase.rpc(
            "omilink_sync",
            {
                "p_device_id": device.id,
                "p_hostname": body.hostname,
                "p_version": body.version,
                "p_printers": [status.model_dump() for status in body.printers],
                "p_discovered": body.discovered,
            },
        )
        .execute()
        .data
    )
    printers = payload["printers"]
    jobs: list[dict] = []
    if printers:
        printer_ids = [printer["id"] for printer in printers]
        etab_row = (
            supabase.table("etablissements")
            .select("name")
            .eq("id", device.etablissement_id)
            .single()
            .execute()
            .data
        )
        restaurant_name = etab_row["name"] if etab_row else ""
        rows = (
            supabase.table("print_jobs")
            .select(
                "id, kind, printer_id, created_at, printers(name), "
                "orders(type, created_at, customer_name, pickup_at, "
                "tables(number), "
                "order_items(id, item_id, name, quantity, options, "
                "items(categories(name, position))))"
            )
            .in_("printer_id", printer_ids)
            .eq("status", "pending")
            .order("created_at")
            .execute()
            .data
        )
        routing = _build_routing(supabase, printer_ids)
        cancelled: list[str] = []
        for row in rows:
            _apply_routing(row, routing)
            if row["kind"] == "order" and row.get("orders") and not row["orders"]["order_items"]:
                cancelled.append(row["id"])
                continue
            jobs.append(
                {
                    "id": row["id"],
                    "printer_id": row["printer_id"],
                    "data": base64.b64encode(render_job(row, restaurant_name)).decode(),
                }
            )
        if cancelled:
            supabase.table("print_jobs").update({"status": "cancelled"}).in_("id", cancelled).execute()
    return {"printers": printers, "jobs": jobs, "scan": payload["scan"]}


@router.post("/jobs/{job_id}/printed", status_code=204)
def mark_printed(job_id: str, device: Device = Depends(require_device)) -> None:
    rows = (
        get_supabase()
        .table("print_jobs")
        .update({"status": "printed", "printed_at": datetime.now(UTC).isoformat()})
        .eq("id", job_id)
        .eq("etablissement_id", device.etablissement_id)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(status_code=404, detail="unknown job")
