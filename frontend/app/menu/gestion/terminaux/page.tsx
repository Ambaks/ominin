"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { FeatureLocked } from "@/components/gestion/feature-locked";
import {
  CheckIcon,
  ClockIcon,
  EditIcon,
  OfflineIcon,
  TrashIcon,
} from "@/components/gestion/icons";
import { DeviceAddSheet } from "@/components/gestion/terminaux/device-add-sheet";
import { PrinterFormSheet } from "@/components/gestion/terminaux/printer-form-sheet";
import {
  Chip,
  ConfirmSheet,
  EmptyState,
  ErrorNotice,
  GlassButton,
  GlassFrame,
  Plate,
  ReserveGerant,
  SectionHeading,
  Shimmer,
} from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import { DEFAULT_PRINTER_PORT, TERMINAUX_REFRESH_MS } from "@/lib/gestion/constants";
import { describeError } from "@/lib/gestion/errors";
import { formatDateTime, formatTime } from "@/lib/gestion/format";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import {
  createPrinter,
  deleteDevice,
  deletePrinter,
  deviceCode,
  fetchJobs,
  isRecent,
  isScanning,
  loadTerminaux,
  requestScan,
  requestTestPrint,
  updatePrinter,
  type OmilinkDevice,
  type Printer,
  type PrinterInput,
  type PrintJob,
} from "@/lib/gestion/terminaux";

/*
 * Le gérant voit ici son boîtier Omilink (le Raspberry Pi qui relie la
 * cuisine à Ominin) et ses imprimantes, leur état de santé relu en continu ;
 * il rattache un boîtier qui s'est annoncé, lui fait chercher les
 * imprimantes du réseau, déclare, modifie, teste ou retire une imprimante.
 * Deux cadres, dans l'ordre de l'installation : le boîtier, puis ce qu'il
 * relie. L'état est un constat calme : une pastille, une phrase, pas de
 * clignotement.
 */

type Health = "ok" | "ko" | "unknown";

/** Pastille d'état, posée : l'icône dit la famille, le mot reste en clair ; grenat seulement pour un problème. */
function HealthChip({ health, children }: { health: Health; children: ReactNode }) {
  if (health === "ko") {
    return (
      <Chip tone="problem" icon={<OfflineIcon />}>
        {children}
      </Chip>
    );
  }
  return <Chip icon={health === "ok" ? <CheckIcon /> : <ClockIcon />}>{children}</Chip>;
}

function secondsAgo(iso: string, now: number): number {
  return Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
}

/** Une carte d'appareil : le nom et son état sur la première ligne, le détail dessous, les gestes en pied. */
function Card({ name, title, chip, meta, children, actions }: {
  name: string;
  title?: string;
  chip: ReactNode;
  meta: ReactNode;
  children?: ReactNode;
  actions: ReactNode;
}) {
  return (
    <Plate className="flex flex-col gap-3 p-4">
      <div className="flex flex-col gap-1.5">
        <p className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-g-body font-semibold" title={title}>
            {name}
          </span>
          <span className="shrink-0">{chip}</span>
        </p>
        <p className="text-g-meta text-muted [overflow-wrap:anywhere]">{meta}</p>
      </div>
      {children}
      <div className="flex flex-wrap justify-end gap-2">{actions}</div>
    </Plate>
  );
}

function DeviceCard({
  device,
  declaredHosts,
  now,
  onScan,
  onAddPrinter,
  onDelete,
}: {
  device: OmilinkDevice;
  declaredHosts: Set<string>;
  now: number;
  onScan: () => void;
  onAddPrinter: (host: string) => void;
  onDelete: () => void;
}) {
  const online = isRecent(device.last_seen_at, now);
  const scanning = online && isScanning(device);
  const code = deviceCode(device.serial);
  const found = device.discovered_printers.filter((host) => !declaredHosts.has(host));
  const scanDone = online && device.scanned_at != null && !isScanning(device);
  const health: Health = online ? "ok" : device.last_seen_at ? "ko" : "unknown";
  return (
    <Card
      name={device.name}
      title={device.version ? `Version ${device.version.slice(0, 7)}` : undefined}
      chip={
        <HealthChip health={health}>
          {health === "ok" ? "Connecté" : health === "ko" ? "Hors ligne" : "Jamais connecté"}
        </HealthChip>
      }
      meta={
        <>
          {code && <span className="tabular-nums">n° {code} · </span>}
          {online && device.last_seen_at
            ? `Relié à Ominin — dernier signe de vie il y a ${secondsAgo(device.last_seen_at, now)} s`
            : device.last_seen_at
              ? `Hors ligne — dernier contact le ${formatDateTime(device.last_seen_at)}`
              : "En attente de sa première connexion"}
        </>
      }
      actions={
        <>
          {online && (
            <GlassButton onClick={onScan} disabled={scanning} aria-label={`Rechercher des imprimantes via ${device.name}`}>
              {scanning ? "Recherche en cours…" : "Rechercher des imprimantes"}
            </GlassButton>
          )}
          <GlassButton
            variant="icon"
            aria-label={`Retirer le boîtier ${device.name}`}
            title="Retirer le boîtier"
            onClick={onDelete}
          >
            <TrashIcon />
          </GlassButton>
        </>
      }
    >
      {scanDone &&
        (found.length ? (
          <ul className="grid gap-2" aria-label="Imprimantes détectées">
            {found.map((host) => (
              <li key={host}>
                <Plate className="flex min-h-g-control items-center justify-between gap-3 px-4 py-2">
                  <span className="min-w-0 truncate text-g-body">
                    Imprimante détectée · <span className="font-medium tabular-nums">{host}</span>
                  </span>
                  <GlassButton variant="primary" onClick={() => onAddPrinter(host)} aria-label={`Ajouter l’imprimante ${host}`}>
                    Ajouter
                  </GlassButton>
                </Plate>
              </li>
            ))}
          </ul>
        ) : device.discovered_printers.length === 0 ? (
          <p className="text-g-meta text-muted">
            Aucune imprimante trouvée sur le port {DEFAULT_PRINTER_PORT} — vérifiez qu’elle est allumée et
            reliée au même réseau que le boîtier.
          </p>
        ) : null)}
    </Card>
  );
}

function printerHealth(
  printer: Printer,
  deviceOnline: boolean,
  now: number
): { health: Health; label: string; text: string | null } {
  if (!deviceOnline) return { health: "unknown", label: "Boîtier hors ligne", text: null };
  if (!isRecent(printer.checked_at, now)) {
    return { health: "unknown", label: "Pas encore vérifiée", text: null };
  }
  if (printer.last_error) {
    return {
      health: "ko",
      label: "Injoignable",
      text: "Vérifiez qu’elle est allumée et reliée au réseau.",
    };
  }
  return { health: "ok", label: "En ligne", text: null };
}

/** Le dernier test lancé d'ici : imprimé (et quand), en route, ou bloqué. */
function TestChip({ job, now }: { job: PrintJob | undefined; now: number }) {
  if (!job) return null;
  if (job.status === "printed" && job.printed_at) {
    return <Chip icon={<CheckIcon />}>Test imprimé à {formatTime(job.printed_at)}</Chip>;
  }
  return isRecent(job.created_at, now) ? (
    <Chip icon={<ClockIcon />}>Test envoyé…</Chip>
  ) : (
    <Chip tone="problem" icon={<OfflineIcon />}>
      Test en attente : imprimante ou boîtier hors ligne
    </Chip>
  );
}

function PrinterCard({
  printer,
  deviceName,
  deviceOnline,
  test,
  now,
  onTest,
  onEdit,
}: {
  printer: Printer;
  deviceName: string | null;
  deviceOnline: boolean;
  test: PrintJob | undefined;
  now: number;
  onTest: () => void;
  onEdit: () => void;
}) {
  const { health, label, text } = printerHealth(printer, deviceOnline, now);
  return (
    <Card
      name={printer.name}
      chip={<HealthChip health={health}>{label}</HealthChip>}
      meta={
        <>
          <span className="tabular-nums">
            {printer.host}:{printer.port}
          </span>
          {deviceName && ` · via ${deviceName}`}
          {text && ` · ${text}`}
        </>
      }
      actions={
        <>
          <GlassButton onClick={onTest} aria-label={`Tester ${printer.name}`}>
            Tester
          </GlassButton>
          <GlassButton variant="icon" aria-label={`Modifier ${printer.name}`} title="Modifier" onClick={onEdit}>
            <EditIcon />
          </GlassButton>
        </>
      }
    >
      {test && (
        <p role="status" className="flex">
          <TestChip job={test} now={now} />
        </p>
      )}
    </Card>
  );
}

type Editing =
  | { mode: "new"; defaults?: { host: string; deviceId: string } }
  | { mode: "edit"; printer: Printer }
  | null;

function TerminauxManager({ etablissementId }: { etablissementId: string }) {
  const toast = useToast();
  const [devices, setDevices] = useState<OmilinkDevice[] | null>(null);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [error, setError] = useState<unknown>(null);
  // Dernier test lancé depuis cette page, par imprimante ; ceux encore en
  // attente sont relus à chaque rafraîchissement.
  const [tests, setTests] = useState<Record<string, PrintJob>>({});
  const pendingTests = useRef(new Set<string>());
  const [now, setNow] = useState(() => Date.now());
  const [addingDevice, setAddingDevice] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<OmilinkDevice | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [printerToDelete, setPrinterToDelete] = useState<Printer | null>(null);

  const refresh = useCallback(async () => {
    const [data, jobs] = await Promise.all([
      loadTerminaux(etablissementId),
      fetchJobs([...pendingTests.current]),
    ]);
    setDevices(data.devices);
    setPrinters(data.printers);
    setNow(Date.now());
    setError(null);
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

  // Une relecture manquée se dit une fois, en bandeau, et s'efface à la suivante.
  useEffect(() => {
    const load = () => refresh().catch(setError);
    load();
    const timer = setInterval(load, TERMINAUX_REFRESH_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const report = (error: unknown) => toast.error(describeError(error).message);

  const savePrinter = async (input: PrinterInput) => {
    if (editing?.mode === "edit") {
      await updatePrinter(editing.printer.id, input);
      toast.success(`${input.name} modifiée.`);
    } else {
      await createPrinter(etablissementId, input);
      toast.success(`${input.name} ajoutée : chaque nouvelle commande y sortira.`);
    }
    setEditing(null);
    await refresh();
  };

  const removePrinter = async (printer: Printer) => {
    setPrinterToDelete(null);
    try {
      await deletePrinter(printer.id);
      toast.success(`${printer.name} retirée.`);
      await refresh();
    } catch (error) {
      report(error);
    }
  };

  const removeDevice = async (device: OmilinkDevice) => {
    setDeviceToDelete(null);
    try {
      await deleteDevice(device.id);
      toast.success(`${device.name} retiré.`);
      await refresh();
    } catch (error) {
      report(error);
    }
  };

  const scan = async (device: OmilinkDevice) => {
    try {
      await requestScan(device.id);
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
    if (error != null) return <ErrorNotice error={error} onRetry={() => refresh().catch(setError)} />;
    return (
      <div aria-busy className="grid gap-g-gap">
        <Shimmer className="h-24 rounded-g-frame" />
        <Shimmer className="h-24 rounded-g-frame" />
      </div>
    );
  }

  const deviceById = new Map(devices.map((device) => [device.id, device]));
  const declaredHosts = new Set(printers.map((printer) => printer.host));
  const addDeviceButton = (
    <GlassButton variant="primary" onClick={() => setAddingDevice(true)}>
      Ajouter un boîtier
    </GlassButton>
  );

  return (
    <div className="grid gap-g-gap">
      {error != null && <ErrorNotice error={error} onRetry={() => refresh().catch(setError)} />}

      <section data-visite="terminaux-omilink" className="visite-encart">
        <GlassFrame i={1} entity="orders" eyebrow="1 · Le boîtier Omilink" className="grid gap-g-pad">
          {devices.length ? (
            devices.map((device) => (
              <DeviceCard
                key={device.id}
                device={device}
                declaredHosts={declaredHosts}
                now={now}
                onScan={() => void scan(device)}
                onAddPrinter={(host) => setEditing({ mode: "new", defaults: { host, deviceId: device.id } })}
                onDelete={() => setDeviceToDelete(device)}
              />
            ))
          ) : (
            <EmptyState
              text="Branchez le boîtier Omilink au réseau du restaurant, puis ajoutez-le ici : il apparaît en quelques secondes."
              action={addDeviceButton}
            />
          )}
          {devices.length > 0 && <div className="flex justify-end px-1 pb-1">{addDeviceButton}</div>}
        </GlassFrame>
      </section>

      <section data-visite="terminaux-imprimantes" className="visite-encart">
        <GlassFrame i={2} entity="orders" eyebrow="2 · Les imprimantes" className="grid gap-g-pad">
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
                />
              );
            })
          ) : (
            <EmptyState
              text={
                devices.length
                  ? "Aucune imprimante. Lancez « Rechercher des imprimantes » sur le boîtier, ou déclarez-en une à la main : chaque nouvelle commande y sortira en ticket."
                  : "Disponible une fois le boîtier ajouté."
              }
              action={
                devices.length > 0 ? (
                  <GlassButton variant="primary" onClick={() => setEditing({ mode: "new" })}>
                    Ajouter une imprimante
                  </GlassButton>
                ) : undefined
              }
            />
          )}
          {printers.length > 0 && (
            <div className="flex justify-end px-1 pb-1">
              <GlassButton variant="primary" onClick={() => setEditing({ mode: "new" })}>
                Ajouter une imprimante
              </GlassButton>
            </div>
          )}
        </GlassFrame>
      </section>

      {addingDevice && (
        <DeviceAddSheet
          etablissementId={etablissementId}
          onCreated={() => void refresh().catch(setError)}
          onClose={() => setAddingDevice(false)}
        />
      )}
      {deviceToDelete && (
        <ConfirmSheet
          title={`Retirer « ${deviceToDelete.name} » ?`}
          text="Le boîtier repasse en attente de rattachement : il pourra être ajouté à nouveau depuis « Ajouter un boîtier »."
          confirmLabel="Retirer le boîtier"
          destructive
          onConfirm={() => void removeDevice(deviceToDelete)}
          onClose={() => setDeviceToDelete(null)}
        />
      )}
      {editing && (
        <PrinterFormSheet
          printer={editing.mode === "edit" ? editing.printer : null}
          devices={devices}
          defaults={editing.mode === "new" ? editing.defaults : undefined}
          onSubmit={savePrinter}
          onDelete={
            editing.mode === "edit"
              ? () => {
                  setPrinterToDelete(editing.printer);
                  setEditing(null);
                }
              : undefined
          }
          onClose={() => setEditing(null)}
        />
      )}
      {printerToDelete && (
        <ConfirmSheet
          title={`Retirer « ${printerToDelete.name} » ?`}
          text="Elle ne recevra plus les tickets de commande. Ses tickets en attente sont abandonnés."
          confirmLabel="Retirer l’imprimante"
          destructive
          onConfirm={() => void removePrinter(printerToDelete)}
          onClose={() => setPrinterToDelete(null)}
        />
      )}
    </div>
  );
}

export default function TerminauxPage() {
  const state = useGestion();
  const { role, hasFeature } = useGestionAccess();

  if (!state) return null;
  if (!hasFeature("terminaux")) return <FeatureLocked feature="terminaux" />;

  return (
    <div className="grid gap-5">
      <div className="g-rise" style={{ "--g-i": 0 } as CSSProperties}>
        <SectionHeading
          level={1}
          title="Imprimantes"
          sub="Le boîtier Omilink et les imprimantes de la cuisine : état en direct, tests et réglages."
        />
      </div>
      {role === "gerant" ? (
        <TerminauxManager etablissementId={state.etablissement.id} />
      ) : (
        <ReserveGerant ask="régler les imprimantes" />
      )}
    </div>
  );
}
