"""Endpoints interrogés par les appareils Omilink (voir omilink/). Le même
contrat — « quels tickets sortir ? » puis accusé par ticket — servira aux
imprimantes Star CloudPRNT, qui interrogent elles-mêmes un serveur."""

import base64
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.clients.supabase import get_supabase
from app.deps import Device, require_device
from app.services.tickets import render_job

router = APIRouter(prefix="/omilink")


class PrinterStatus(BaseModel):
    id: str
    error: str | None = None


class SyncRequest(BaseModel):
    hostname: str
    version: str
    printers: list[PrinterStatus] = []


@router.post("/sync")
def sync(body: SyncRequest, device: Device = Depends(require_device)) -> dict:
    supabase = get_supabase()
    printers = (
        supabase.rpc(
            "omilink_sync",
            {
                "p_device_id": device.id,
                "p_hostname": body.hostname,
                "p_version": body.version,
                "p_printers": [status.model_dump() for status in body.printers],
            },
        )
        .execute()
        .data
    )
    jobs = []
    if printers:
        rows = (
            supabase.table("print_jobs")
            .select(
                "id, kind, printer_id, created_at, printers(name), "
                "orders(type, created_at, customer_name, pickup_at, "
                "tables(number), order_items(name, quantity, options))"
            )
            .in_("printer_id", [printer["id"] for printer in printers])
            .eq("status", "pending")
            .order("created_at")
            .execute()
            .data
        )
        jobs = [
            {
                "id": row["id"],
                "printer_id": row["printer_id"],
                "data": base64.b64encode(render_job(row)).decode(),
            }
            for row in rows
        ]
    return {"printers": printers, "jobs": jobs}


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
