"use client";

import { useState } from "react";
import { QrCode } from "@/components/pitch/qr-code";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import * as api from "@/lib/commercial/api";
import {
  CLOSING_REASONS,
  CONTACT_ROLES,
  END_LABELS,
  PRODUCT_CHOICES,
  REFUSAL_LABELS,
  type EndReason,
  type Product,
  type Retained,
} from "@/lib/commercial/labels";
import { LEGAL_PATHS } from "@/lib/legal/constants";
import { frenchDate } from "@/lib/legal/format";
import { siteUrl } from "@/lib/site";
import { RetainedFields } from "./retained";
import { Chips, Choice, FieldGroup, errorMessage, ghostButton, primaryButton } from "./ui";

const ROLE_OPTIONS = CONTACT_ROLES.map((role) => ({ id: role, label: role }));
const REASON_OPTIONS = CLOSING_REASONS.map((id) => ({ id, label: END_LABELS[id] }));

/*
 * Déclarer (art. 4.3) : un seul écran. Le contrat exige le nom et l'adresse
 * (ceux de la fiche) et un interlocuteur : sa fonction au moins.
 */
export function DeclareSheet({
  restaurant,
  products: initialProducts,
  onClose,
  onDone,
}: {
  restaurant: api.PublicRestaurant;
  products: Product[] | null;
  onClose: () => void;
  onDone: (result: api.DeclareResult) => void;
}) {
  const [products, setProducts] = useState<Product[]>(
    initialProducts?.filter((product) => PRODUCT_CHOICES.some((choice) => choice.id === product)) ?? []
  );
  const [contact, setContact] = useState<api.ContactInput>({ role: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      onDone(await api.declare(restaurant.id, products, contact));
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Déclarer ce restaurant"
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy || !products.length || !contact.role}
          className={`${primaryButton} w-full`}
        >
          {busy ? "Envoi…" : "Déclarer"}
        </button>
      }
    >
      <div className="flex flex-col gap-5">
        <p className="text-sm text-muted">
          <span className="font-medium text-foreground">{restaurant.name}</span>
          {restaurant.address ? `, ${restaurant.address}` : ""}
          {restaurant.city ? `, ${restaurant.city}` : ""}
        </p>
        <FieldGroup label="Offre visée" required>
          <Chips options={PRODUCT_CHOICES} value={products} onChange={setProducts} />
        </FieldGroup>
        <FieldGroup label="Votre interlocuteur" required hint="Sa fonction suffit ; son nom s’il est connu.">
          <Choice
            options={ROLE_OPTIONS}
            value={contact.role as (typeof CONTACT_ROLES)[number]}
            onChange={(role) => setContact({ ...contact, role })}
          />
        </FieldGroup>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prénom">
            <input
              value={contact.first_name ?? ""}
              onChange={(event) => setContact({ ...contact, first_name: event.target.value })}
              className={inputClass}
              autoComplete="off"
            />
          </Field>
          <Field label="Nom">
            <input
              value={contact.last_name ?? ""}
              onChange={(event) => setContact({ ...contact, last_name: event.target.value })}
              className={inputClass}
              autoComplete="off"
            />
          </Field>
        </div>
        <Field label="Son téléphone">
          <input
            value={contact.phone ?? ""}
            onChange={(event) => setContact({ ...contact, phone: event.target.value })}
            type="tel"
            className={inputClass}
            autoComplete="off"
          />
        </Field>
        {error && <p role="alert" className="text-sm text-ember-3">{error}</p>}
      </div>
    </Modal>
  );
}

/** Ce que la base a répondu à la déclaration : en attente, ou refusée d'office. */
export function DeclareOutcome({ result, onClose }: { result: api.DeclareResult; onClose: () => void }) {
  const pending = result.status === "pending";
  return (
    <Modal
      title={pending ? "Déclaration envoyée" : "Déclaration refusée"}
      onClose={onClose}
      footer={
        <button type="button" onClick={onClose} className={`${primaryButton} w-full`}>
          Compris
        </button>
      }
    >
      <p className="text-sm leading-relaxed text-muted">
        {pending
          ? `Ominin la confirme ou la refuse d’ici le ${frenchDate(result.confirm_deadline!)} ; sans réponse, elle est confirmée de droit ce jour-là (article 4.3). Vous recevez la décision par e-mail. Vous pouvez déjà travailler le restaurant.`
          : `Ce restaurant ne peut pas vous être réservé : ${REFUSAL_LABELS[result.refusal_reason!]}. Vous recevez ce refus par e-mail.`}
      </p>
    </Modal>
  );
}

/** Passage sans suite (4.2 bis) : vu, pas intéressé, sans réserver. */
export function PassageSheet({
  restaurantId,
  noteMax,
  onClose,
  onDone,
}: {
  restaurantId: string;
  noteMax: number | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState<EndReason | undefined>();
  const [retained, setRetained] = useState<Retained>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true);
    try {
      await api.passage(restaurantId, retained, reason!);
      onDone();
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  };
  return (
    <Modal
      title="Passage sans suite"
      onClose={onClose}
      footer={
        <button type="button" onClick={() => void submit()} disabled={busy || !reason} className={`${primaryButton} w-full`}>
          Enregistrer le passage
        </button>
      }
    >
      <div className="flex flex-col gap-5">
        <p className="text-sm text-muted">
          Sans réservation ni commission : ce que vous avez vu reste dans l’historique du restaurant, pour le prochain commercial.
        </p>
        <FieldGroup label="Pourquoi" required>
          <Choice options={REASON_OPTIONS} value={reason} onChange={setReason} />
        </FieldGroup>
        <RetainedFields value={retained} onChange={setRetained} noteMax={noteMax} />
        {error && <p role="alert" className="text-sm text-ember-3">{error}</p>}
      </div>
    </Modal>
  );
}

export function AbandonSheet({
  declarationId,
  onClose,
  onDone,
}: {
  declarationId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState<EndReason | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true);
    try {
      await api.abandon(declarationId, reason!);
      onDone();
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  };
  return (
    <Modal
      title="Abandonner ce restaurant"
      onClose={onClose}
      footer={
        <button type="button" onClick={() => void submit()} disabled={busy || !reason} className={`${primaryButton} w-full`}>
          Abandonner
        </button>
      }
    >
      <div className="flex flex-col gap-5">
        <p className="text-sm text-muted">
          Le restaurant redevient libre. Votre fiche retenue et le motif restent visibles des autres commerciaux.
        </p>
        <FieldGroup label="Motif" required>
          <Choice options={REASON_OPTIONS} value={reason} onChange={setReason} />
        </FieldGroup>
        {error && <p role="alert" className="text-sm text-ember-3">{error}</p>}
      </div>
    </Modal>
  );
}

export function OptOutSheet({
  restaurantId,
  onClose,
  onDone,
}: {
  restaurantId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true);
    try {
      await api.optOut(restaurantId);
      onDone();
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  };
  return (
    <Modal
      title="Ne veut plus être contacté"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={ghostButton}>
            Annuler
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy}
            className="inline-flex min-h-11 items-center rounded-full border border-ember-3/50 bg-ember-3/10 px-4 text-sm font-semibold text-ember-3"
          >
            Confirmer l’opposition
          </button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-muted">
        Le restaurant a demandé à ne plus être démarché : Ominin ne le contactera plus, ni vous ni personne
        (article 6.1 du contrat). Votre déclaration est close. C’est définitif.
      </p>
      {error && <p role="alert" className="mt-3 text-sm text-ember-3">{error}</p>}
    </Modal>
  );
}

/** Mention d'information (RGPD art. 13) à montrer ou à laisser à l'interlocuteur. */
export function PrivacyNotice({ onClose }: { onClose: () => void }) {
  const url = `${siteUrl}${LEGAL_PATHS.confidentialite}`;
  return (
    <Modal title="Vos données chez Ominin" onClose={onClose}>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="rounded-2xl bg-white p-4 text-black">
          <QrCode value={url} label="Politique de confidentialité d’Ominin" className="size-48" />
        </div>
        <p className="text-sm leading-relaxed text-muted">
          Ominin enregistre vos coordonnées professionnelles pour vous présenter ses solutions. Vous pouvez
          vous y opposer à tout moment. Tout est expliqué ici :
        </p>
        <p className="break-all text-sm font-medium">{url.replace(/^https?:\/\//, "")}</p>
      </div>
    </Modal>
  );
}
