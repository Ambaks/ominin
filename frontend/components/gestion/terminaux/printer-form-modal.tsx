"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { DEFAULT_PRINTER_PORT } from "@/lib/gestion/constants";
import type {
  OmilinkDevice,
  Printer,
  PrinterInput,
} from "@/lib/gestion/terminaux";

export function PrinterFormModal({
  printer,
  devices,
  defaults,
  onSubmit,
  onClose,
}: {
  /** Imprimante à modifier, ou null pour en déclarer une nouvelle. */
  printer: Printer | null;
  devices: OmilinkDevice[];
  /** Pré-remplissage d'une imprimante détectée par un boîtier. */
  defaults?: { host: string; deviceId: string };
  /** Ne rejette jamais : l'appelant signale l'erreur et laisse le formulaire ouvert. */
  onSubmit: (input: PrinterInput) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(printer?.name ?? "");
  const [host, setHost] = useState(printer?.host ?? defaults?.host ?? "");
  const [port, setPort] = useState(String(printer?.port ?? DEFAULT_PRINTER_PORT));
  const [deviceId, setDeviceId] = useState(
    printer?.device_id ?? defaults?.deviceId ?? devices[0]?.id ?? ""
  );
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await onSubmit({
        name: name.trim(),
        host: host.trim(),
        port: Number(port),
        deviceId,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={printer ? "Modifier l'imprimante" : "Ajouter une imprimante"}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold text-muted transition-colors hover:text-foreground"
          >
            Annuler
          </button>
          <button
            type="submit"
            form="printer-form"
            disabled={busy}
            className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
          >
            {printer ? "Enregistrer" : "Ajouter"}
          </button>
        </>
      }
    >
      <form id="printer-form" onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Nom" required>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            placeholder="Cuisine"
            className={inputClass}
          />
        </Field>
        <Field
          label="Adresse IP"
          required
          hint="Sur le réseau du restaurant — la page de test de l'imprimante l'indique. Réservez-lui une adresse fixe dans la box pour qu'elle ne change pas."
        >
          <input
            value={host}
            onChange={(event) => setHost(event.target.value)}
            required
            inputMode="decimal"
            placeholder="192.168.1.50"
            className={inputClass}
          />
        </Field>
        <Field label="Port" hint="Laissez 9100 sauf indication contraire de l'imprimante.">
          <input
            type="number"
            min={1}
            max={65535}
            value={port}
            onChange={(event) => setPort(event.target.value)}
            required
            className={inputClass}
          />
        </Field>
        {devices.length > 1 && (
          <Field label="Boîtier Omilink">
            <select
              value={deviceId}
              onChange={(event) => setDeviceId(event.target.value)}
              className={inputClass}
            >
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                </option>
              ))}
            </select>
          </Field>
        )}
      </form>
    </Modal>
  );
}
