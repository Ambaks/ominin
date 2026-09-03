"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { createDevice } from "@/lib/gestion/terminaux";

/** URL publique du backend, pour livrer un .env complet ; vide = ligne omise. */
const BACKEND_URL = process.env.NEXT_PUBLIC_OMILINK_BACKEND_URL ?? "";

const secondaryButtonClass =
  "rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold text-muted transition-colors hover:text-foreground";
const primaryButtonClass =
  "ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60";

/**
 * Déclare un boîtier puis révèle son jeton, une seule fois : l'écran suivant
 * est le seul endroit où il apparaît en clair.
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
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      setToken(await createDevice(etablissementId, name.trim()));
      onCreated();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    } finally {
      setBusy(false);
    }
  };

  if (token) {
    const envFile = [
      BACKEND_URL && `BACKEND_URL=${BACKEND_URL}`,
      `DEVICE_TOKEN=${token}`,
    ]
      .filter(Boolean)
      .join("\n");
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(envFile);
        toast.success("Copié.");
      } catch {
        toast.error("Copie impossible — sélectionnez le texte à la main.");
      }
    };
    return (
      <Modal
        title="Boîtier ajouté"
        onClose={onClose}
        footer={
          <button type="button" onClick={onClose} className={primaryButtonClass}>
            Terminé
          </button>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-muted">
            Voici le jeton du boîtier.{" "}
            <strong className="text-foreground">
              Il ne sera plus jamais affiché
            </strong>{" "}
            : copiez ces lignes maintenant dans le fichier{" "}
            <code>omilink.env</code> de la carte SD du boîtier (elle s&rsquo;ouvre
            sur n&rsquo;importe quel ordinateur), puis remettez la carte et
            allumez le boîtier. Il apparaîtra ici « En ligne » dès sa première
            connexion.
          </p>
          <pre className="overflow-x-auto rounded-xl border border-hairline bg-background px-4 py-3 text-xs leading-relaxed">
            {envFile}
          </pre>
          {!BACKEND_URL && (
            <p className="text-xs text-faint">
              La ligne BACKEND_URL est fournie par Ominin à l&rsquo;installation.
            </p>
          )}
          <button
            type="button"
            onClick={() => void copy()}
            className={`${secondaryButtonClass} self-start`}
          >
            Copier
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title="Ajouter un boîtier Omilink"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={secondaryButtonClass}>
            Annuler
          </button>
          <button
            type="submit"
            form="device-form"
            disabled={busy}
            className={primaryButtonClass}
          >
            {busy ? "Création…" : "Créer le jeton"}
          </button>
        </>
      }
    >
      <form id="device-form" onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-muted">
          Le boîtier Omilink est le petit ordinateur branché sur le réseau du
          restaurant qui relie vos imprimantes à Ominin. Nommez-le, puis
          reportez le jeton obtenu dans sa configuration.
        </p>
        <Field label="Nom" required>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            placeholder="Cuisine"
            className={inputClass}
          />
        </Field>
      </form>
    </Modal>
  );
}
