"use client";

import { useEffect, useRef, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { UNCLAIMED_POLL_MS } from "@/lib/gestion/constants";
import {
  claimDevice,
  deviceCode,
  fetchUnclaimed,
  type UnclaimedDevice,
} from "@/lib/gestion/terminaux";

const secondaryButtonClass =
  "rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold text-muted transition-colors hover:text-foreground";
const primaryButtonClass =
  "ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60";

function seenAgo(iso: string, now: number): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  return `vu il y a ${seconds} s`;
}

/**
 * Les boîtiers branchés au réseau du restaurant s'annoncent d'eux-mêmes ; le
 * gérant reconnaît le sien au code de l'étiquette, le nomme, et il est
 * rattaché.
 */
export function DeviceAddModal({
  etablissementId,
  onCreated,
  onClose,
}: {
  etablissementId: string;
  onCreated: () => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const [candidates, setCandidates] = useState<UnclaimedDevice[] | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [selected, setSelected] = useState<UnclaimedDevice | null>(null);
  const [name, setName] = useState("Cuisine");
  const [busy, setBusy] = useState(false);
  const reported = useRef(false);

  useEffect(() => {
    const load = () =>
      fetchUnclaimed(etablissementId)
        .then((devices) => {
          setCandidates(devices);
          setNow(Date.now());
        })
        .catch((error) => {
          // Une seule alerte : la relecture continue en silence.
          if (reported.current) return;
          reported.current = true;
          toast.error(
            error instanceof Error ? error.message : "Une erreur est survenue."
          );
        });
    load();
    const timer = setInterval(load, UNCLAIMED_POLL_MS);
    return () => clearInterval(timer);
  }, [etablissementId, toast]);

  const claim = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      await claimDevice(selected.serial, etablissementId, name.trim());
      toast.success(
        `${name.trim()} rattaché : il passe « En ligne » dans quelques secondes.`
      );
      onCreated();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    } finally {
      setBusy(false);
    }
  };

  if (selected) {
    return (
      <Modal
        title={`Boîtier n° ${deviceCode(selected.serial)}`}
        onClose={onClose}
        footer={
          <>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className={secondaryButtonClass}
            >
              Retour
            </button>
            <button
              type="submit"
              form="claim-form"
              disabled={busy}
              className={primaryButtonClass}
            >
              {busy ? "Rattachement…" : "Ajouter"}
            </button>
          </>
        }
      >
        <form id="claim-form" onSubmit={claim} className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-muted">
            Vérifiez que le code correspond à l&rsquo;étiquette du boîtier, puis
            nommez-le.
          </p>
          <Field label="Nom" required>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className={inputClass}
            />
          </Field>
        </form>
      </Modal>
    );
  }

  return (
    <Modal
      title="Ajouter un boîtier Omilink"
      onClose={onClose}
      footer={
        <button type="button" onClick={onClose} className={secondaryButtonClass}>
          Fermer
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-muted">
          Branchez le boîtier au réseau du restaurant et allumez-le : il apparaît
          ici en quelques secondes, avec le code de son étiquette.
        </p>
        {candidates === null ? (
          <div aria-busy className="shimmer h-16 rounded-2xl" />
        ) : candidates.length === 0 ? (
          <EmptyState
            title="Aucun boîtier détecté"
            body="Votre appareil doit être sur le Wi‑Fi du restaurant, pas en 4G. Le boîtier met quelques secondes à s'annoncer après le démarrage."
          />
        ) : (
          candidates.map((device) => (
            <button
              key={device.serial}
              type="button"
              onClick={() => setSelected(device)}
              className="flex items-center justify-between gap-3 rounded-2xl border border-hairline bg-surface px-4 py-3 text-left transition-colors hover:border-ember-2/40"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium">
                  Omilink n° {deviceCode(device.serial)}
                </span>
                <span className="block truncate text-xs text-faint">
                  {[device.hostname, device.lan_ip].filter(Boolean).join(" · ")}
                  {" · "}
                  {seenAgo(device.last_seen_at, now)}
                </span>
              </span>
              <span className="shrink-0 text-xs font-semibold text-ember-1">
                Rattacher
              </span>
            </button>
          ))
        )}
      </div>
    </Modal>
  );
}
