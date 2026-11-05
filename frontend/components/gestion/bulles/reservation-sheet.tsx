"use client";

import { useId, useState } from "react";
import { TenderSheet } from "@/components/gestion/bulles/tender-sheet";
import { ConfirmSheet, Field, GlassButton, Input, Notice, Segmented, Sheet } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import {
  bullePlaceCents,
  bullePlacesCouvertes,
  bullePlacesFacturees,
  bulleReste,
  bulleTotalCents,
  capitalize,
  formatBulleNight,
  formatSoloPrice,
  type BulleCompte,
  type BullePricing,
} from "@/lib/bulles/format";
import { WAIT_TICK_MS } from "@/lib/gestion/constants";
import { describeError } from "@/lib/gestion/errors";
import { useNow } from "@/lib/gestion/use-now";
import { formatCents, formatHours } from "@/lib/club/format";
import {
  useBulleActions,
  type Bulle,
  type BulleReglages,
  type BulleReservation,
  type BulleSource,
  type BulleTender,
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

const TENDER_LABELS: Record<BulleTender, string> = { carte: "carte", especes: "espèces" };

const places = (n: number) => `${n} ${n > 1 ? "places" : "place"}`;
const persons = (n: number) => `${n} ${n > 1 ? "personnes" : "personne"}`;

const compteOf = (reservation: BulleReservation): BulleCompte => ({
  partySize: reservation.party_size,
  placeCents: reservation.place_cents,
  minBilledPlaces: reservation.min_billed_places,
  paidCents: reservation.paid_cents,
});

const pricingOf = (reglages: BulleReglages, minBilledPlaces: number): BullePricing => ({
  placeCents: reglages.place_cents,
  smallGroupPlaceCents: reglages.small_group_place_cents,
  groupThreshold: reglages.group_threshold,
  minBilledPlaces,
});

/**
 * Le nombre de personnes, changé par le gérant : le prix suit la nouvelle
 * taille, ce qui est payé se déduit (bulle_changer_taille). Jamais sous les
 * places déjà payées, comptées au minimum facturé.
 */
function PartySizeEditor({
  reservation,
  reglages,
  disabled,
  onSave,
}: {
  reservation: BulleReservation;
  reglages: BulleReglages;
  disabled: boolean;
  onSave: (partySize: number) => void;
}) {
  const [draft, setDraft] = useState(String(reservation.party_size));
  const size = Number(draft);
  const floor = Math.max(
    reglages.min_party,
    reservation.min_billed_places >= reservation.places_paid ? 1 : reservation.places_paid
  );
  const error =
    !Number.isInteger(size) || size < floor || size > reglages.max_party
      ? reservation.places_paid > 0 && floor > reglages.min_party
        ? `De ${floor} à ${reglages.max_party} : ${places(reservation.places_paid)} déjà payées.`
        : `De ${floor} à ${reglages.max_party} personnes.`
      : undefined;
  const preview = error
    ? null
    : (() => {
        const pricing = pricingOf(reglages, reservation.min_billed_places);
        const next = { ...compteOf(reservation), partySize: size, placeCents: bullePlaceCents(pricing, size) };
        return { total: bulleTotalCents(pricing, size), ...bulleReste(next) };
      })();
  return (
    <div className="flex flex-col gap-2">
      <Field label="Personnes" hint={`De ${floor} à ${reglages.max_party}.`} error={error}>
        <Input numeric inputMode="numeric" value={draft} onChange={(event) => setDraft(event.target.value)} />
      </Field>
      {preview && size !== reservation.party_size && (
        <>
          <p className="text-g-meta text-muted">
            Nouveau total {formatCents(preview.total)}
            {preview.cents > 0 ? ` · reste ${formatCents(preview.cents)}` : " · tout est payé"}
            {preview.trop > 0 && ` · ${formatCents(preview.trop)} payés en trop, à rendre ou non`}
          </p>
          <GlassButton disabled={disabled} onClick={() => onSave(size)}>
            Passer à {persons(size)}
          </GlassButton>
        </>
      )}
    </div>
  );
}

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
  reglages,
  gerant,
  dayEndHour,
  onClose,
  onChanged,
}: {
  reservation: BulleReservation;
  bulle: Bulle | undefined;
  reglages: BulleReglages | null;
  gerant: boolean;
  /** Bascule du jour de service : un créneau d'après minuit reste au soir réservé. */
  dayEndHour: number;
  onClose: () => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const { markArrival, cancelReservation, changeSize } = useBulleActions();
  const now = useNow(WAIT_TICK_MS);
  const [busy, setBusy] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  // Le mode reste à choisir avant ce message : le geste d'encaissement en cours.
  const [collecting, setCollecting] = useState<string | null>(null);
  // Un paiement peut arriver pendant que la fiche est ouverte : les gestes
  // d'argent changeraient sous le pouce. Ils attendent qu'on ait vu le nouvel état.
  const version = `${reservation.status}:${reservation.paid_cents}:${reservation.party_size}`;
  const [seenVersion, setSeenVersion] = useState(version);
  const changed = version !== seenVersion;
  const blocked = busy || changed;
  // Le reste se compte en argent : après un changement de taille, la dernière place peut coûter moins.
  const compte = compteOf(reservation);
  const { cents: leftCents, places: left, trop } = bulleReste(compte);
  const billed = bullePlacesFacturees(reservation.party_size, reservation.min_billed_places);
  const confirmed = reservation.status === "confirmee";
  const pending = reservation.status === "en_attente";
  const paidOnline = reservation.bulle_parts.some((part) => part.method === "en_ligne" && part.status === "payee");
  const payers = reservation.bulle_parts.filter((part) => part.status === "payee");
  const canCancel = gerant && !paidOnline && (confirmed || pending);
  const canResize =
    gerant &&
    reglages !== null &&
    changeSize !== undefined &&
    (confirmed || pending || reservation.status === "arrivee") &&
    Date.parse(reservation.ends_at) > now.getTime();
  // Ce qui a été encaissé ici se rend à la main : la confirmation le rappelle, mode par mode.
  const toGiveBack = Object.entries(
    payers.reduce<Record<string, number>>((byTender, part) => {
      if (part.method !== "sur_place") return byTender;
      const how = part.tender ? `en ${TENDER_LABELS[part.tender]}` : "sur place";
      byTender[how] = (byTender[how] ?? 0) + part.amount_cents;
      return byTender;
    }, {})
  ).map(([how, amountCents]) => `${formatCents(amountCents)} encaissés ${how}, à rendre au client.`);

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
              onClick={() => setCollecting("Bulle confirmée, reste encaissé.")}
            >
              Confirmer · encaisser {formatCents(leftCents)}
            </GlassButton>
          )}
          {confirmed && left > 0 && (
            <GlassButton
              variant="primary"
              className="w-full"
              disabled={blocked}
              onClick={() => setCollecting("Arrivée enregistrée, reste encaissé.")}
            >
              Arrivée · encaisser {formatCents(leftCents)}
            </GlassButton>
          )}
          {confirmed && (
            <GlassButton
              variant={left > 0 ? "secondary" : "primary"}
              className="w-full"
              disabled={blocked}
              onClick={() => void act(() => markArrival(reservation.id, true), "Arrivée enregistrée.")}
            >
              {left > 0 ? "Arrivée sans encaisser" : "Marquer l'arrivée"}
            </GlassButton>
          )}
          {reservation.status === "arrivee" && left > 0 && (
            <GlassButton
              variant="primary"
              className="w-full"
              disabled={blocked}
              onClick={() => setCollecting("Reste encaissé.")}
            >
              Encaisser {formatCents(leftCents)}
            </GlassButton>
          )}
          {reservation.status === "arrivee" && (
            <GlassButton
              className="w-full"
              disabled={blocked}
              onClick={() => void act(() => markArrival(reservation.id, false), "Arrivée annulée.")}
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
            {capitalize(formatBulleNight(reservation.starts_at, dayEndHour, true))} · {formatHours(reservation.starts_at, reservation.ends_at)}
          </Row>
          <Row label="Groupe">
            {reservation.party_size} pers.{reservation.party_size < billed && `, payé au prix de ${billed}`}
          </Row>
          <Row label="Places payées">
            {bullePlacesCouvertes(compte)} sur {billed}
            {left > 0 && ` · reste ${formatCents(leftCents)}`}
          </Row>
          {trop > 0 && <Row label="Payé en trop">{formatCents(trop)}, à rendre ou non</Row>}
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

        {canResize && changeSize && reglages && (
          <PartySizeEditor
            key={version}
            reservation={reservation}
            reglages={reglages}
            disabled={blocked}
            onSave={(size) => void act(() => changeSize(reservation.id, size), `Réservation passée à ${persons(size)}.`)}
          />
        )}

        {payers.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="g-field-label">Payé</span>
            <ul className="m-0 flex list-none flex-col gap-1 p-0 text-g-body">
              {payers.map((part) => (
                <li key={part.id} className="flex justify-between gap-3">
                  <span className="min-w-0 break-words">
                    {part.name}
                    {part.method === "en_ligne" ? " · en ligne" : ` · ${part.tender ? TENDER_LABELS[part.tender] : "sur place"}`}
                  </span>
                  <span className="whitespace-nowrap tabular-nums text-muted">
                    {part.places > 0 ? `${places(part.places)} · ` : ""}
                    {formatCents(part.amount_cents)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {collecting && (
        <TenderSheet
          amountCents={leftCents}
          busy={busy}
          onSelect={(tender) => void act(() => markArrival(reservation.id, true, tender), collecting)}
          onClose={() => setCollecting(null)}
        />
      )}
      {confirmingCancel && (
        <ConfirmSheet
          title={`Annuler la réservation de ${reservation.name} ?`}
          text={["La bulle redevient libre pour ce créneau.", ...toGiveBack].join(" ")}
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

/** Une réservation prise au téléphone ou au comptoir : confirmée d'emblée, aux mêmes bornes et prix qu'en ligne. */
export function NewReservationSheet({
  bulle,
  startsAt,
  endsAt,
  reglages,
  pendingGroups,
  onClose,
  onChanged,
}: {
  bulle: Bulle;
  startsAt: string;
  endsAt: string;
  reglages: BulleReglages;
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
  const [tendering, setTendering] = useState(false);
  const { min_party: minParty, max_party: maxParty } = reglages;
  const partySize = Number(party);
  const errors = {
    name: name.trim().length === 0 ? "Indiquez un nom." : undefined,
    party:
      !Number.isInteger(partySize) || partySize < minParty || partySize > maxParty
        ? `De ${minParty} à ${maxParty} personnes.`
        : undefined,
  };

  const pricing = pricingOf(reglages, reglages.min_billed_places);
  const placeCents = errors.party ? null : bullePlaceCents(pricing, partySize);
  const billed = bullePlacesFacturees(partySize, reglages.min_billed_places);

  const askTender = () => {
    setShowErrors(true);
    if (!errors.name && !errors.party) setTendering(true);
  };

  const create = async (tender?: BulleTender) => {
    setBusy(true);
    try {
      await createReservation({ bulleId: bulle.id, startsAt, name: name.trim(), phone, partySize, source, note, tender });
      toast.success(tender ? "Bulle réservée, encaissée." : "Bulle réservée, reste à payer.");
      onChanged();
      onClose();
    } catch (error) {
      toast.error(describeError(error).message);
    }
    setBusy(false);
  };

  if (tendering && placeCents !== null) {
    return (
      <TenderSheet
        amountCents={billed * placeCents}
        busy={busy}
        later={() => void create()}
        onSelect={(tender) => void create(tender)}
        onClose={() => setTendering(false)}
      />
    );
  }

  return (
    <Sheet
      title={`${bulle.name} · ${formatHours(startsAt, endsAt)}`}
      description="Elle se règle maintenant, ou plus tard."
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
          askTender();
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
          <Field label="Personnes" required hint={`De ${minParty} à ${maxParty}.`} error={showErrors ? errors.party : undefined}>
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
        {placeCents !== null && (
          <p className="flex items-baseline justify-between gap-3 border-t border-hairline pt-3 text-g-body">
            <span className="text-muted tabular-nums">
              {partySize < billed ? `${formatSoloPrice(pricing)}` : `${partySize} × ${formatCents(placeCents)}`}
            </span>
            <strong className="font-semibold tabular-nums">{formatCents(billed * placeCents)}</strong>
          </p>
        )}
      </form>
    </Sheet>
  );
}
