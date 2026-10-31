"use client";

import { useId, useState } from "react";
import { ConfirmSheet, Field, GlassButton, Input, Notice, Segmented, Sheet } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import { describeError } from "@/lib/gestion/errors";
import { formatCents, formatHours, formatNightShort } from "@/lib/club/format";
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
  { value: "telephone", label: "Au téléphone" },
  { value: "sur_place", label: "Au comptoir" },
] as const;

const places = (n: number) => `${n} ${n > 1 ? "places" : "place"}`;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-hairline py-2.5 text-g-body last:border-b-0">
      <span className="text-muted">{label}</span>
      <span className="min-w-0 break-words text-right font-medium tabular-nums">{children}</span>
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
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  // Un paiement peut arriver pendant que la fiche est ouverte : les gestes
  // d'argent changeraient sous le pouce. Ils attendent qu'on ait vu le nouvel état.
  const version = `${reservation.status}:${reservation.places_paid}`;
  const [seenVersion, setSeenVersion] = useState(version);
  const changed = version !== seenVersion;
  const blocked = busy || changed;
  const left = reservation.party_size - reservation.places_paid;
  const confirmed = reservation.status === "confirmee";
  const pending = reservation.status === "en_attente";
  const paidOnline = reservation.bulle_parts.some((part) => part.method === "en_ligne" && part.status === "payee");
  const payers = reservation.bulle_parts.filter((part) => part.status === "payee");
  const canCancel = gerant && !paidOnline && (confirmed || pending);

  // Refusé (plus de bulle libre, réservation close) : la fiche reste ouverte
  // sur le message, rien n'a changé.
  const act = async (action: () => Promise<void>, message: string) => {
    setConfirmingCancel(false);
    setBusy(true);
    try {
      await action();
      toast.success(message);
      onChanged();
      onClose();
    } catch (error) {
      toast.error(describeError(error).message);
    }
    setBusy(false);
  };

  return (
    <Sheet
      title={`${bulle?.name ?? "Bulle"} · ${reservation.name}`}
      onClose={onClose}
      footer={
        canCancel ? (
          <GlassButton
            variant="danger"
            className="mr-auto"
            disabled={blocked}
            onClick={() => setConfirmingCancel(true)}
          >
            Annuler la réservation
          </GlassButton>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-5">
        {changed && (
          <Notice
            tone="info"
            title="Cette réservation vient de changer"
            action={<GlassButton onClick={() => setSeenVersion(version)}>Actualiser</GlassButton>}
          />
        )}

        <div className="flex flex-col gap-2.5">
          {pending && left > 0 && (
            <GlassButton
              variant="primary"
              className="w-full"
              disabled={blocked}
              onClick={() =>
                void act(() => markArrival(reservation.id, true, true), "Bulle confirmée, reste encaissé.")
              }
            >
              Confirmer · encaisser {formatCents(left * reservation.place_cents)}
            </GlassButton>
          )}
          {confirmed && left > 0 && (
            <GlassButton
              variant="primary"
              className="w-full"
              disabled={blocked}
              onClick={() => void act(() => markArrival(reservation.id, true, true), "Arrivée enregistrée, reste encaissé.")}
            >
              Arrivée · encaisser {formatCents(left * reservation.place_cents)}
            </GlassButton>
          )}
          {confirmed && (
            <GlassButton
              variant={left > 0 ? "secondary" : "primary"}
              className="w-full"
              disabled={blocked}
              onClick={() => void act(() => markArrival(reservation.id, true, false), "Arrivée enregistrée.")}
            >
              {left > 0 ? "Arrivée sans encaisser" : "Marquer l'arrivée"}
            </GlassButton>
          )}
          {reservation.status === "arrivee" && (
            <GlassButton
              className="w-full"
              disabled={blocked}
              onClick={() => void act(() => markArrival(reservation.id, false, false), "Arrivée annulée.")}
            >
              Annuler l&rsquo;arrivée
            </GlassButton>
          )}
          {pending && (
            <p className="text-g-body text-muted">
              Confirmée dès que le minimum de places est payé, en ligne ou ici. Le groupe peut payer le reste par
              son lien jusqu&rsquo;à la fin du créneau ; rien n&rsquo;est remboursé, sauf si toutes les bulles
              partent avant.
            </p>
          )}
          {gerant && paidOnline && (confirmed || pending) && (
            <p className="text-g-meta text-muted">Payée en ligne : elle ne s&rsquo;annule pas d&rsquo;ici.</p>
          )}
        </div>

        <div>
          <Row label="Statut">{STATUS_LABELS[reservation.status]}</Row>
          <Row label="Créneau">
            {formatNightShort(reservation.starts_at)} · {formatHours(reservation.starts_at, reservation.ends_at)}
          </Row>
          <Row label="Groupe">{reservation.party_size} pers.</Row>
          <Row label="Places payées">
            {reservation.places_paid} sur {reservation.party_size}
            {left > 0 && ` · reste ${places(left)}, ${formatCents(left * reservation.place_cents)}`}
          </Row>
          {reservation.phone && (
            <Row label="Téléphone">
              <a
                href={`tel:${reservation.phone.replace(/[^\d+]/g, "")}`}
                className="inline-flex min-h-(--g-control) items-center text-ember-1 underline underline-offset-4"
              >
                {reservation.phone}
              </a>
            </Row>
          )}
          <Row label="Prise">{SOURCE_LABELS[reservation.source]}</Row>
          {reservation.note && <Row label="Note">{reservation.note}</Row>}
        </div>

        {payers.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="g-field-label">Payé</span>
            <ul className="m-0 flex list-none flex-col gap-1 p-0 text-g-body">
              {payers.map((part) => (
                <li key={part.id} className="flex justify-between gap-3">
                  <span className="min-w-0 break-words">
                    {part.name}
                    {part.method === "sur_place" ? " · sur place" : ""}
                  </span>
                  <span className="whitespace-nowrap tabular-nums text-muted">
                    {places(part.places)} · {formatCents(part.amount_cents)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {confirmingCancel && (
        <ConfirmSheet
          title={`Annuler la réservation de ${reservation.name} ?`}
          text="La bulle redevient libre pour ce créneau."
          confirmLabel="Annuler la réservation"
          cancelLabel="Garder la réservation"
          destructive
          onConfirm={() => void act(() => cancelReservation(reservation.id), "Réservation annulée.")}
          onClose={() => setConfirmingCancel(false)}
        />
      )}
    </Sheet>
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
  const formId = useId();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [party, setParty] = useState("");
  const [note, setNote] = useState("");
  const [source, setSource] = useState<Exclude<BulleSource, "en_ligne">>("telephone");
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const partySize = Number(party);
  const errors = {
    name: name.trim().length === 0 ? "Indiquez un nom." : undefined,
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
      toast.error(describeError(error).message);
    }
    setBusy(false);
  };

  return (
    <Sheet
      title={`${bulle.name} · ${formatHours(startsAt, endsAt)}`}
      description="Tout se règle sur place, à l'arrivée."
      onClose={onClose}
      footer={
        <>
          <GlassButton onClick={onClose}>Annuler</GlassButton>
          <GlassButton variant="primary" type="submit" form={formId} disabled={busy}>
            Réserver la bulle
          </GlassButton>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {pendingGroups > 0 && (
          <p role="status" className="text-g-body text-foreground">
            {pendingGroups === 1 ? "Un groupe paie" : `${pendingGroups} groupes paient`} encore cette bulle en
            ligne : {pendingGroups === 1 ? "il passera" : "ils passeront"} sur une autre bulle libre du créneau, ou
            {pendingGroups === 1 ? " sera remboursé" : " seront remboursés"} s&rsquo;il n&rsquo;en reste plus.
          </p>
        )}
        <Field label="Réservation reçue">
          <Segmented glass={false} label="Réservation reçue" options={SOURCES} value={source} onChange={setSource} />
        </Field>
        <Field label="Nom" required error={showErrors ? errors.name : undefined}>
          <Input data-autofocus value={name} autoComplete="off" onChange={(event) => setName(event.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Téléphone">
            <Input type="tel" inputMode="tel" autoComplete="off" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </Field>
          <Field label="Personnes" required hint={`De 1 à ${maxParty}.`} error={showErrors ? errors.party : undefined}>
            <Input
              numeric
              inputMode="numeric"
              value={party}
              onChange={(event) => setParty(event.target.value.replace(/\D/g, ""))}
            />
          </Field>
        </div>
        <Field label="Note">
          <Input value={note} maxLength={300} onChange={(event) => setNote(event.target.value)} />
        </Field>
      </form>
    </Sheet>
  );
}
