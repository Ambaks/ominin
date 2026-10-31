"use client";

import { useState } from "react";
import { Field, GlassButton, Input, Select, Sheet } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import { DEFAULT_PRINTER_PORT } from "@/lib/gestion/constants";
import { describeError } from "@/lib/gestion/errors";
import type { OmilinkDevice, Printer, PrinterInput } from "@/lib/gestion/terminaux";

/** Bornes d'un port TCP ; étaient les attributs min/max du champ. */
const PORT_MIN = 1;
const PORT_MAX = 65535;

/**
 * Déclarer ou modifier une imprimante : son nom, son adresse sur le réseau
 * du restaurant, son port, et le boîtier qui la relie quand il y en a
 * plusieurs. Les manques se disent à côté du bouton, une adresse déjà prise
 * revient sur son champ, le reste part en toast.
 */
export function PrinterFormSheet({
  printer,
  devices,
  defaults,
  onSubmit,
  onDelete,
  onClose,
}: {
  /** Imprimante à modifier, ou null pour en déclarer une nouvelle. */
  printer: Printer | null;
  devices: OmilinkDevice[];
  /** Pré-remplissage d'une imprimante détectée par un boîtier. */
  defaults?: { host: string; deviceId: string };
  /** Enregistre ; rejette pour laisser le formulaire ouvert sur l'erreur. */
  onSubmit: (input: PrinterInput) => Promise<void>;
  /** Retirer l'imprimante modifiée : la page confirme. */
  onDelete?: () => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(printer?.name ?? "");
  const [host, setHost] = useState(printer?.host ?? defaults?.host ?? "");
  const [port, setPort] = useState(String(printer?.port ?? DEFAULT_PRINTER_PORT));
  const [deviceId, setDeviceId] = useState(
    printer?.device_id ?? defaults?.deviceId ?? devices[0]?.id ?? ""
  );
  const [busy, setBusy] = useState(false);
  const [portError, setPortError] = useState<string | null>(null);
  const [hostError, setHostError] = useState<string | null>(null);

  const verb = printer ? "enregistrer" : "ajouter";
  const missing = !name.trim()
    ? `Indiquez un nom pour ${verb}.`
    : !host.trim()
      ? `Indiquez l’adresse IP pour ${verb}.`
      : null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (missing || busy) return;
    // Port vide : celui que l'indication promet.
    const portNumber = port.trim() ? Number(port) : DEFAULT_PRINTER_PORT;
    if (!Number.isInteger(portNumber) || portNumber < PORT_MIN || portNumber > PORT_MAX) {
      setPortError(`Indiquez un nombre entre ${PORT_MIN} et ${PORT_MAX}.`);
      return;
    }
    setPortError(null);
    setHostError(null);
    setBusy(true);
    try {
      await onSubmit({ name: name.trim(), host: host.trim(), port: portNumber, deviceId });
    } catch (error) {
      const { text, message } = describeError(error);
      if (/adresse/i.test(text)) setHostError(text);
      else toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      title={printer ? "Modifier l’imprimante" : "Ajouter une imprimante"}
      onClose={onClose}
      footer={
        <>
          {busy ? <p>Un instant…</p> : missing && <p>{missing}</p>}
          <GlassButton onClick={onClose}>Annuler</GlassButton>
          <GlassButton variant="primary" type="submit" form="printer-form" disabled={busy || missing !== null}>
            {printer ? "Enregistrer" : "Ajouter"}
          </GlassButton>
        </>
      }
    >
      <form id="printer-form" onSubmit={submit} className="grid gap-4">
        <Field label="Nom" required>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Cuisine"
            autoComplete="off"
            autoCapitalize="words"
            data-autofocus
          />
        </Field>
        <Field
          label="Adresse IP"
          required
          hint="Sur le réseau du restaurant ; la page de test de l’imprimante l’indique."
          error={hostError ?? undefined}
        >
          <Input
            value={host}
            onChange={(event) => {
              setHost(event.target.value);
              setHostError(null);
            }}
            inputMode="url"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="192.168.1.50"
          />
        </Field>
        <Field
          label="Port"
          hint={`Laissez ${DEFAULT_PRINTER_PORT} sauf indication contraire de l’imprimante.`}
          error={portError ?? undefined}
        >
          <Input
            numeric
            inputMode="numeric"
            value={port}
            onChange={(event) => {
              setPort(event.target.value);
              setPortError(null);
              setHostError(null);
            }}
            placeholder={String(DEFAULT_PRINTER_PORT)}
          />
        </Field>
        {devices.length > 1 && (
          <Field label="Boîtier Omilink">
            <Select value={deviceId} onChange={(event) => setDeviceId(event.target.value)}>
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {onDelete && (
          <div className="mt-2 flex">
            <GlassButton variant="danger" className="w-full sm:w-auto" disabled={busy} onClick={onDelete}>
              Retirer l’imprimante
            </GlassButton>
          </div>
        )}
      </form>
    </Sheet>
  );
}
