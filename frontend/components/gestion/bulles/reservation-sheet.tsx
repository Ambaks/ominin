"use client";

import { useRef, useState } from "react";
import { GlassButton, Segmented } from "@/components/gestion/ui";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatCents, formatHours, formatNight } from "@/lib/club/format";
import {
  useBulleActions,
  type Bulle,
  type BulleReservation,
  type BulleSource,
} from "@/lib/gestion/bulles-api";

export const STATUS_LABELS: Record<BulleReservation["status"], string> = {
  en_attente: "En attente",
  confirmee: "Confirmée",
  arrivee: "Arrivée",
  remboursee: "Remboursée",
  annulee: "Annulée",
};

const SOURCE_LABELS: Record<BulleSource, string> = {
  en_ligne: "En ligne",
  telephone: "Téléphone",
  sur_place: "Sur place",
};

const SOURCES = [
  { value: "telephone", label: SOURCE_LABELS.telephone },
  { value: "sur_place", label: SOURCE_LABELS.sur_place },
] as const;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-hairline py-2.5 text-g-body last:border-b-0">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium tabular-nums">{children}</span>
    </div>
  );
}

/** Une réservation : qui, combien ont payé, et les gestes de l'accueil. */
export function ReservationSheet({
  reservation,
  bulle,
  gerant,
  onClose,
  onChanged,
}: {
  reservation: BulleReservation;
  bulle: Bulle | undefined;
  gerant: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const { markArrival, cancelReservation } = useBulleActions();
  const [busy, setBusy] = useState(false);
  const left = reservation.party_size - reservation.places_paid;
  const confirmed = reservation.status === "confirmee";
  const pending = reservation.status === "en_attente";
  const paidOnline = reservation.bulle_parts.some((part) => part.method === "en_ligne" && part.status === "payee");
  const payers = reservation.bulle_parts.filter((part) => part.status === "payee");
  const canCancel = gerant && !paidOnline && (confirmed || pending);

  // Refusé (plus de bulle libre, réservation close) : la fiche reste ouverte
  // sur le message, rien n'a changé.
  const act = async (action: () => Promise<void>, message: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(message);
      onChanged();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    }
    setBusy(false);
  };

  return (
    <Modal
      title={`${bulle?.name ?? "Bulle"} · ${reservation.name}`}
      onClose={onClose}
      footer={
        canCancel ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void act(() => cancelReservation(reservation.id), "Réservation annulée.")}
            className="mr-auto text-g-label font-semibold text-muted underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
          >
            Annuler la réservation
          </button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-5">
        <div>
          <Row label="Statut">{STATUS_LABELS[reservation.status]}</Row>
          <Row label="Soir">{formatNight(reservation.starts_at)}</Row>
          <Row label="Créneau">{formatHours(reservation.starts_at, reservation.ends_at)}</Row>
          <Row label="Groupe">{reservation.party_size} pers.</Row>
          <Row label="Places payées">
            {reservation.places_paid} / {reservation.party_size}
          </Row>
          {reservation.phone && (
            <Row label="Téléphone">
              <a href={`tel:${reservation.phone.replace(/[^\d+]/g, "")}`} className="text-ember-1 underline underline-offset-4">
                {reservation.phone}
              </a>
            </Row>
          )}
          <Row label="Prise">{SOURCE_LABELS[reservation.source]}</Row>
          {reservation.note && <Row label="Note">{reservation.note}</Row>}
        </div>

        {payers.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">Payé</span>
            <ul className="m-0 flex list-none flex-col gap-1 p-0 text-g-body">
              {payers.map((part) => (
                <li key={part.id} className="flex justify-between gap-3">
                  <span>
                    {part.name}
                    {part.method === "sur_place" ? " · sur place" : ""}
                  </span>
                  <span className="tabular-nums text-muted">
                    {part.places} pl. · {formatCents(part.amount_cents)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {pending && left > 0 && (
            <GlassButton
              variant="primary"
              className="w-full"
              disabled={busy}
              onClick={() =>
                void act(() => markArrival(reservation.id, true, true), "Bulle confirmée, reste encaissé.")
              }
            >
              Confirmer · encaisser {formatCents(left * reservation.place_cents)} ({left} pl.)
            </GlassButton>
          )}
          {confirmed && left > 0 && (
            <GlassButton
              variant="primary"
              className="w-full"
              disabled={busy}
              onClick={() => void act(() => markArrival(reservation.id, true, true), "Arrivée enregistrée, reste encaissé.")}
            >
              Arrivée · encaisser {formatCents(left * reservation.place_cents)} ({left} pl.)
            </GlassButton>
          )}
          {confirmed && (
            <GlassButton
              variant={left > 0 ? "secondary" : "primary"}
              className="w-full"
              disabled={busy}
              onClick={() => void act(() => markArrival(reservation.id, true, false), "Arrivée enregistrée.")}
            >
              {left > 0 ? "Arrivée sans encaisser" : "Marquer l'arrivée"}
            </GlassButton>
          )}
          {reservation.status === "arrivee" && (
            <GlassButton
              className="w-full"
              disabled={busy}
              onClick={() => void act(() => markArrival(reservation.id, false, false), "Arrivée annulée.")}
            >
              Annuler l&rsquo;arrivée
            </GlassButton>
          )}
          {pending && (
            <p className="text-g-body leading-relaxed text-muted">
              Confirmée dès que le minimum de places est payé, en ligne ou ici. Le groupe peut payer le reste par
              son lien jusqu&rsquo;à la fin du créneau ; rien n&rsquo;est remboursé, sauf si toutes les bulles
              partent avant.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}

/** Une réservation prise au téléphone ou au comptoir : confirmée d'emblée, réglée sur place. */
export function NewReservationSheet({
  bulle,
  startsAt,
  endsAt,
  maxParty,
  pendingGroups,
  onClose,
  onChanged,
}: {
  bulle: Bulle;
  startsAt: string;
  endsAt: string;
  maxParty: number;
  /** Les groupes en ligne qui visent cette bulle et paient encore : ils seront délogés. */
  pendingGroups: number;
  onClose: () => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const { createReservation } = useBulleActions();
  const form = useRef<HTMLFormElement>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [party, setParty] = useState("");
  const [note, setNote] = useState("");
  const [source, setSource] = useState<Exclude<BulleSource, "en_ligne">>("telephone");
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const partySize = Number(party);
  const errors = {
    name: name.trim().length === 0 ? "Le nom de la réservation." : undefined,
    party:
      !Number.isInteger(partySize) || partySize < 1 || partySize > maxParty
        ? `De 1 à ${maxParty} personnes.`
        : undefined,
  };

  const submit = async () => {
    setShowErrors(true);
    if (errors.name || errors.party) return;
    setBusy(true);
    try {
      await createReservation({ bulleId: bulle.id, startsAt, name: name.trim(), phone, partySize, source, note });
      toast.success("Bulle réservée.");
      onChanged();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    }
    setBusy(false);
  };

  return (
    <Modal
      title={`${bulle.name} · ${formatHours(startsAt, endsAt)}`}
      onClose={onClose}
      footer={
        <>
          <GlassButton onClick={onClose}>Annuler</GlassButton>
          <GlassButton variant="primary" disabled={busy} onClick={() => form.current?.requestSubmit()}>
            Réserver la bulle
          </GlassButton>
        </>
      }
    >
      <form
        ref={form}
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Segmented glass={false} label="Prise" options={SOURCES} value={source} onChange={setSource} />
        <Field label="Nom" required error={showErrors ? errors.name : undefined}>
          <input
            data-autofocus
            className={inputClass}
            value={name}
            autoComplete="off"
            onChange={(event) => setName(event.target.value)}
            aria-invalid={showErrors && errors.name ? true : undefined}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Téléphone">
            <input type="tel" inputMode="tel" autoComplete="off" className={inputClass} value={phone} onChange={(event) => setPhone(event.target.value)} />
          </Field>
          <Field label="Personnes" required hint={`De 1 à ${maxParty}.`} error={showErrors ? errors.party : undefined}>
            <input
              inputMode="numeric"
              className={`${inputClass} tabular-nums`}
              value={party}
              onChange={(event) => setParty(event.target.value.replace(/\D/g, ""))}
              aria-invalid={showErrors && errors.party ? true : undefined}
            />
          </Field>
        </div>
        <Field label="Note">
          <input className={inputClass} value={note} maxLength={300} onChange={(event) => setNote(event.target.value)} />
        </Field>
        <p className="text-g-meta text-muted">Tout se règle sur place, à l&rsquo;arrivée.</p>
        {pendingGroups > 0 && (
          <p role="status" className="text-g-meta leading-relaxed text-ember-2">
            {pendingGroups === 1 ? "Un groupe paie" : `${pendingGroups} groupes paient`} encore cette bulle en
            ligne : {pendingGroups === 1 ? "il passera" : "ils passeront"} sur une autre bulle libre du créneau, ou
            {pendingGroups === 1 ? " sera remboursé" : " seront remboursés"} s&rsquo;il n&rsquo;en reste plus.
          </p>
        )}
      </form>
    </Modal>
  );
}
