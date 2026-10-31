"use client";

import { useEffect, useState } from "react";
import { ChevronDownIcon } from "@/components/gestion/icons";
import {
  EmptyState,
  ErrorNotice,
  Field,
  GlassButton,
  Input,
  Sheet,
  Shimmer,
} from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import { UNCLAIMED_POLL_MS } from "@/lib/gestion/constants";
import { describeError } from "@/lib/gestion/errors";
import {
  claimDevice,
  deviceCode,
  fetchUnclaimed,
  type UnclaimedDevice,
} from "@/lib/gestion/terminaux";

function seenAgo(iso: string, now: number): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  return `vu il y a ${seconds} s`;
}

/**
 * Les boîtiers branchés au réseau du restaurant s'annoncent d'eux-mêmes ; le
 * gérant reconnaît le sien au code de l'étiquette, le nomme, et il est
 * rattaché. Deux temps dans une seule feuille (la liste, puis le nom), pour
 * que le dialogue reste ouvert et que le focus suive.
 */
export function DeviceAddSheet({
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
  const [error, setError] = useState<unknown>(null);
  const [now, setNow] = useState(() => Date.now());
  const [selected, setSelected] = useState<UnclaimedDevice | null>(null);
  const [name, setName] = useState("Cuisine");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const load = () =>
      fetchUnclaimed(etablissementId)
        .then((devices) => {
          setCandidates(devices);
          setNow(Date.now());
          setError(null);
        })
        // Le bandeau reste tant que la relecture échoue ; il s'efface seul.
        .catch(setError);
    load();
    const timer = setInterval(load, UNCLAIMED_POLL_MS);
    return () => clearInterval(timer);
  }, [etablissementId]);

  const missing = name.trim() ? null : "Indiquez un nom pour ajouter.";

  const claim = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || missing || busy) return;
    setBusy(true);
    try {
      await claimDevice(selected.serial, etablissementId, name.trim());
      toast.success(`${name.trim()} rattaché : il passe « Connecté » dans quelques secondes.`);
      onCreated();
      onClose();
    } catch (error) {
      toast.error(describeError(error).message);
      setBusy(false);
    }
  };

  return (
    <Sheet
      title={selected ? `Boîtier n° ${deviceCode(selected.serial)}` : "Ajouter un boîtier"}
      description={
        selected
          ? "Vérifiez que le code correspond à l’étiquette du boîtier, puis nommez-le."
          : "Branchez le boîtier au réseau du restaurant et allumez-le : il apparaît ici en quelques secondes, avec le code de son étiquette."
      }
      onClose={onClose}
      footer={
        selected ? (
          <>
            {busy ? <p>Rattachement en cours…</p> : missing && <p>{missing}</p>}
            <GlassButton disabled={busy} onClick={() => setSelected(null)}>
              Retour
            </GlassButton>
            <GlassButton variant="primary" type="submit" form="claim-form" disabled={busy || missing !== null}>
              Ajouter
            </GlassButton>
          </>
        ) : (
          <GlassButton onClick={onClose}>Annuler</GlassButton>
        )
      }
    >
      {selected ? (
        <form id="claim-form" onSubmit={claim} className="grid gap-4">
          <Field label="Nom" required hint="Le lieu qu’il dessert : « Cuisine », « Bar »…">
            <Input
              // Le bouton touché disparaît avec la liste : le champ attendu prend le focus en montant.
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
              autoCapitalize="words"
            />
          </Field>
        </form>
      ) : (
        <div className="grid gap-3">
          {error != null && <ErrorNotice error={error} />}
          {candidates === null ? (
            <Shimmer className="h-16" />
          ) : candidates.length === 0 ? (
            <EmptyState text="Aucun boîtier détecté. Votre appareil doit être sur le Wi‑Fi du restaurant, pas en 4G ; le boîtier met quelques secondes à s’annoncer après le démarrage." />
          ) : (
            <ul className="grid gap-2" aria-label="Boîtiers détectés">
              {candidates.map((device) => (
                <li key={device.serial}>
                  <button
                    type="button"
                    onClick={() => setSelected(device)}
                    className="g-plate g-press flex min-h-g-control w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="text-g-body font-medium">Omilink n° {deviceCode(device.serial)}</span>
                      <span className="truncate text-g-meta text-muted">
                        {[device.hostname, device.lan_ip].filter(Boolean).join(" · ")}
                        {" · "}
                        {seenAgo(device.last_seen_at, now)}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-g-label font-semibold text-ember-1">
                      Rattacher
                      <ChevronDownIcon className="size-4 -rotate-90" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Sheet>
  );
}
