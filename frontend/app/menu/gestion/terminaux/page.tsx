"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FeatureLocked } from "@/components/gestion/feature-locked";
import { EditIcon, TrashIcon } from "@/components/gestion/icons";
import { PrinterFormModal } from "@/components/gestion/terminaux/printer-form-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { TERMINAUX_REFRESH_MS } from "@/lib/gestion/constants";
import { formatDateTime, formatTime } from "@/lib/gestion/format";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import {
  createPrinter,
  deletePrinter,
  fetchJobs,
  isRecent,
  loadTerminaux,
  requestTestPrint,
  updatePrinter,
  type OmilinkDevice,
  type Printer,
  type PrinterInput,
  type PrintJob,
} from "@/lib/gestion/terminaux";

/*
 * Le gérant voit ici ses boîtiers Omilink (le Raspberry Pi qui relie la
 * cuisine à Ominin) et ses imprimantes, leur état de santé rafraîchi en
 * continu, et déclare, modifie, teste ou retire une imprimante.
 */

const cardClass = "rounded-2xl border border-hairline bg-surface px-4 py-3";
const iconButtonClass =
  "rounded-full border border-hairline p-2 text-muted transition-colors hover:border-ember-2/40 hover:text-foreground";

type Health = "ok" | "ko" | "unknown";

const DOT_CLASS: Record<Health, string> = {
  ok: "bg-ember-1",
  ko: "bg-ember-3",
  unknown: "bg-faint",
};

function StatusDot({ health }: { health: Health }) {
  return <span className={`size-2 shrink-0 rounded-full ${DOT_CLASS[health]}`} />;
}

function DeviceCard({ device, now }: { device: OmilinkDevice; now: number }) {
  const online = isRecent(device.last_seen_at, now);
  return (
    <div className={cardClass}>
      <p className="flex items-center gap-2 text-sm font-medium">
        <StatusDot health={online ? "ok" : "ko"} />
        <span className="truncate">{device.name}</span>
      </p>
      <p className="text-xs text-faint">
        {online
          ? "En ligne"
          : device.last_seen_at
            ? `Hors ligne — dernier contact le ${formatDateTime(device.last_seen_at)}`
            : "Jamais connecté"}
        {device.version && ` · version ${device.version.slice(0, 7)}`}
      </p>
    </div>
  );
}

function printerHealth(
  printer: Printer,
  deviceOnline: boolean,
  now: number
): { health: Health; label: string } {
  if (!deviceOnline) return { health: "unknown", label: "Boîtier Omilink hors ligne" };
  if (!isRecent(printer.checked_at, now)) {
    return { health: "unknown", label: "Vérification en cours…" };
  }
  if (printer.last_error) {
    return {
      health: "ko",
      label: "Injoignable — vérifiez qu'elle est allumée et reliée au réseau",
    };
  }
  return { health: "ok", label: "En ligne" };
}

function testLabel(job: PrintJob | undefined, now: number): string | null {
  if (!job) return null;
  if (job.status === "printed" && job.printed_at) {
    return `Test imprimé à ${formatTime(job.printed_at)}.`;
  }
  return isRecent(job.created_at, now)
    ? "Test envoyé…"
    : "Test en attente : l'imprimante ou le boîtier est hors ligne.";
}

function PrinterCard({
  printer,
  deviceName,
  deviceOnline,
  test,
  now,
  onTest,
  onEdit,
  onDelete,
}: {
  printer: Printer;
  deviceName: string | null;
  deviceOnline: boolean;
  test: PrintJob | undefined;
  now: number;
  onTest: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { health, label } = printerHealth(printer, deviceOnline, now);
  const testStatus = testLabel(test, now);
  return (
    <div className={`${cardClass} flex items-start justify-between gap-3`}>
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-medium">
          <StatusDot health={health} />
          <span className="truncate">{printer.name}</span>
        </p>
        <p className="text-xs text-faint">
          {printer.host}:{printer.port}
          {deviceName && ` · via ${deviceName}`} · {label}
        </p>
        {testStatus && <p className="mt-1 text-xs text-muted">{testStatus}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onTest}
          className="rounded-full border border-hairline px-3.5 py-2 text-xs font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
        >
          Tester
        </button>
        <button type="button" onClick={onEdit} aria-label="Modifier" className={iconButtonClass}>
          <EditIcon className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Supprimer"
          className="rounded-full border border-hairline p-2 text-muted transition-colors hover:border-ember-3/50 hover:text-ember-3"
        >
          <TrashIcon className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

type Editing = { mode: "new" } | { mode: "edit"; printer: Printer } | null;

function TerminauxManager({ etablissementId }: { etablissementId: string }) {
  const toast = useToast();
  const [devices, setDevices] = useState<OmilinkDevice[] | null>(null);
  const [printers, setPrinters] = useState<Printer[]>([]);
  // Dernier test lancé depuis cette page, par imprimante ; ceux encore en
  // attente sont relus à chaque rafraîchissement.
  const [tests, setTests] = useState<Record<string, PrintJob>>({});
  const pendingTests = useRef(new Set<string>());
  const [now, setNow] = useState(() => Date.now());
  const [editing, setEditing] = useState<Editing>(null);
  const [toDelete, setToDelete] = useState<Printer | null>(null);

  const refresh = useCallback(async () => {
    const [data, jobs] = await Promise.all([
      loadTerminaux(etablissementId),
      fetchJobs([...pendingTests.current]),
    ]);
    setDevices(data.devices);
    setPrinters(data.printers);
    setNow(Date.now());
    if (jobs.length) {
      setTests((current) => {
        const next = { ...current };
        for (const job of jobs) {
          next[job.printer_id] = job;
          if (job.status !== "pending") pendingTests.current.delete(job.id);
        }
        return next;
      });
    }
  }, [etablissementId]);

  useEffect(() => {
    const load = () =>
      refresh().catch((error) =>
        toast.error(
          error instanceof Error ? error.message : "Une erreur est survenue."
        )
      );
    load();
    const timer = setInterval(load, TERMINAUX_REFRESH_MS);
    return () => clearInterval(timer);
    // toast est stable (contexte) ; on ne recharge que par établissement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  const report = (error: unknown) =>
    toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");

  const save = async (input: PrinterInput) => {
    try {
      if (editing?.mode === "edit") {
        await updatePrinter(editing.printer.id, input);
        toast.success(`${input.name} modifiée.`);
      } else {
        await createPrinter(etablissementId, input);
        toast.success(`${input.name} ajoutée : chaque nouvelle commande y sortira.`);
      }
      setEditing(null);
      await refresh();
    } catch (error) {
      report(error);
    }
  };

  const remove = async (printer: Printer) => {
    setToDelete(null);
    try {
      await deletePrinter(printer.id);
      toast.success(`${printer.name} retirée.`);
      await refresh();
    } catch (error) {
      report(error);
    }
  };

  const test = async (printer: Printer) => {
    try {
      const job = await requestTestPrint(etablissementId, printer.id);
      pendingTests.current.add(job.id);
      setTests((current) => ({ ...current, [printer.id]: job }));
      toast.success(`Ticket de test envoyé à ${printer.name}.`);
    } catch (error) {
      report(error);
    }
  };

  if (!devices) {
    return (
      <div aria-busy className="flex flex-col gap-3">
        <div className="shimmer h-16 rounded-2xl" />
        <div className="shimmer h-16 rounded-2xl" />
      </div>
    );
  }

  const deviceById = new Map(devices.map((device) => [device.id, device]));

  return (
    <div className="flex max-w-xl flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-medium">Boîtier Omilink</h2>
        {devices.length ? (
          devices.map((device) => (
            <DeviceCard key={device.id} device={device} now={now} />
          ))
        ) : (
          <EmptyState
            title="Aucun boîtier Omilink"
            body="Le boîtier Omilink relie vos imprimantes à Ominin. Il est fourni et configuré par Ominin : contactez-nous pour équiper votre établissement."
          />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-medium">Imprimantes</h2>
          {devices.length > 0 && (
            <button
              type="button"
              onClick={() => setEditing({ mode: "new" })}
              className="ember-gradient rounded-full px-4 py-2 text-xs font-semibold text-background"
            >
              Ajouter
            </button>
          )}
        </div>
        {printers.length ? (
          printers.map((printer) => {
            const device = deviceById.get(printer.device_id);
            return (
              <PrinterCard
                key={printer.id}
                printer={printer}
                deviceName={devices.length > 1 ? (device?.name ?? null) : null}
                deviceOnline={isRecent(device?.last_seen_at ?? null, now)}
                test={tests[printer.id]}
                now={now}
                onTest={() => void test(printer)}
                onEdit={() => setEditing({ mode: "edit", printer })}
                onDelete={() => setToDelete(printer)}
              />
            );
          })
        ) : (
          devices.length > 0 && (
            <EmptyState
              title="Aucune imprimante"
              body="Déclarez l'imprimante de la cuisine : chaque nouvelle commande y sortira en ticket."
            />
          )
        )}
      </section>

      {editing && (
        <PrinterFormModal
          printer={editing.mode === "edit" ? editing.printer : null}
          devices={devices}
          onSubmit={save}
          onClose={() => setEditing(null)}
        />
      )}
      {toDelete && (
        <ConfirmDialog
          title="Retirer l'imprimante"
          message={`${toDelete.name} ne recevra plus les tickets de commande. Ses tickets en attente sont abandonnés.`}
          confirmLabel="Retirer"
          destructive
          onConfirm={() => void remove(toDelete)}
          onClose={() => setToDelete(null)}
        />
      )}
    </div>
  );
}

export default function TerminauxPage() {
  const state = useGestion();
  const { role, hasFeature } = useGestionAccess();

  if (!state) return null;
  if (!hasFeature("commandes")) return <FeatureLocked />;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-medium tracking-tight lg:text-3xl">
          Terminaux
        </h1>
        <p className="mt-1 text-sm text-muted">
          Le boîtier Omilink et les imprimantes de la cuisine : état en direct,
          tests et réglages.
        </p>
      </div>

      {role === "gerant" ? (
        <TerminauxManager etablissementId={state.etablissement.id} />
      ) : (
        <EmptyState
          title="Réservé au gérant"
          body="Seul le gérant gère les terminaux de l'établissement."
        />
      )}
    </div>
  );
}
