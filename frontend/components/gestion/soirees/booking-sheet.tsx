"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatClock } from "@/lib/collect/hours";
import { formatCents } from "@/lib/club/format";
import type { ClubBooking, ClubEvent, ClubTable, ClubZone } from "@/lib/club/types";
import * as clubApi from "@/lib/gestion/club-api";
import { isClubEntered, people, TABLE_STATE_LABELS, staffTableState } from "@/lib/gestion/club-selectors";
import { CLUB_LIMITS } from "@/lib/gestion/constants";

/*
 * Une table du plan du soir, touchée à la porte : sa réservation et les
 * gestes qui vont avec (arrivée, règlement sur place, remboursement), ou,
 * libre, la réservation que le gérant prend au téléphone ou au comptoir.
 */

const SOURCE_LABELS: Record<ClubBooking["source"], string> = {
  en_ligne: "En ligne",
  telephone: "Au téléphone",
  sur_place: "Sur place",
};

const PRIMARY = "ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-50";
const SECONDARY =
  "rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold text-muted transition-colors hover:text-foreground disabled:opacity-50";
const DANGER =
  "mr-auto rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold text-ember-3 transition-colors hover:border-ember-3/40 disabled:opacity-50";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-wider text-faint">{label}</dt>
      <dd className="min-w-0 text-right text-sm">{children}</dd>
    </div>
  );
}

function payment(booking: ClubBooking): string {
  if (booking.paidOnline) return `Payée en ligne${booking.paidAt ? ` à ${formatClock(booking.paidAt)}` : ""}`;
  if (booking.status === "en_attente") {
    return booking.holdExpiresAt
      ? `Paiement en cours, table tenue jusqu'à ${formatClock(booking.holdExpiresAt)}`
      : "À régler sur place";
  }
  return "Réglée sur place";
}

function BookingCard({
  booking,
  table,
  zone,
  gerant,
  onClose,
}: {
  booking: ClubBooking;
  table: ClubTable;
  zone: ClubZone;
  gerant: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"refund" | "cancel" | null>(null);
  const state = staffTableState(booking, true);
  const clubEntered = isClubEntered(booking);
  const settling = booking.status === "en_attente" && clubEntered;
  const holding = booking.status === "en_attente" && !clubEntered;

  const run = async (action: () => Promise<unknown>, success: string, close = false) => {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      if (close) onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  };

  const tableName = `Table ${table.label}`;
  const footer = holding ? undefined : (
    <>
      {gerant && booking.paidOnline && (
        <button type="button" disabled={busy} onClick={() => setConfirm("refund")} className={DANGER}>
          Rembourser
        </button>
      )}
      {gerant && clubEntered && (
        <button type="button" disabled={busy} onClick={() => setConfirm("cancel")} className={DANGER}>
          Annuler la réservation
        </button>
      )}
      {booking.status === "arrivee" && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(() => clubApi.markArrival(booking, false), `${tableName} : arrivée annulée.`)}
          className={SECONDARY}
        >
          Annuler l&rsquo;arrivée
        </button>
      )}
      {booking.status === "payee" && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(() => clubApi.markArrival(booking, true), `${tableName} : arrivée.`, true)}
          className={PRIMARY}
        >
          Arrivée
        </button>
      )}
      {settling && (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(() => clubApi.markArrival(booking, false), `${tableName} : réglée.`)}
            className={SECONDARY}
          >
            Réglée
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(() => clubApi.markArrival(booking, true, true), `${tableName} : réglée et arrivée.`, true)}
            className={PRIMARY}
          >
            Réglée et arrivée
          </button>
        </>
      )}
    </>
  );

  return (
    <Modal title={`${tableName} · ${zone.name}`} onClose={onClose} footer={footer}>
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-display text-xl font-medium">{booking.name}</p>
            <p className="mt-0.5 text-sm text-muted">
              {people(booking.partySize)} · {table.seats} places
            </p>
          </div>
          <span
            key={state}
            className="statut-pose flex shrink-0 items-center gap-1.5 rounded-full border border-hairline px-2.5 py-1 text-[11px] font-semibold"
          >
            <span className="plan-legende" data-state={state} aria-hidden />
            {TABLE_STATE_LABELS[state]}
          </span>
        </div>

        <dl className="divide-y divide-hairline rounded-2xl border border-hairline bg-surface">
          {booking.phone && (
            <Row label="Téléphone">
              <a
                href={`tel:${booking.phone.replace(/[^\d+]/g, "")}`}
                className="font-semibold text-ember-1 transition-opacity hover:opacity-80"
              >
                {booking.phone}
              </a>
            </Row>
          )}
          <Row label="Total">
            <span className="font-semibold tabular-nums">{formatCents(booking.totalCents)}</span>
            {booking.feeCents > 0 && (
              <span className="block text-xs text-faint">
                dont {formatCents(booking.feeCents)} de frais de service
              </span>
            )}
          </Row>
          <Row label="Règlement">{payment(booking)}</Row>
          <Row label="Réservée">
            {SOURCE_LABELS[booking.source]} à {formatClock(booking.createdAt)}
          </Row>
          {booking.arrivedAt && <Row label="Arrivée">{formatClock(booking.arrivedAt)}</Row>}
          {booking.email && <Row label="E-mail">{booking.email}</Row>}
          {booking.note && (
            <div className="px-4 py-3">
              <dt className="text-xs font-semibold uppercase tracking-wider text-faint">Note</dt>
              <dd className="mt-1 whitespace-pre-line text-sm">{booking.note}</dd>
            </div>
          )}
        </dl>
        {holding && (
          <p className="text-sm text-muted">
            Le client règle en ce moment sur la page du club. Sans paiement, la table se libère
            d&rsquo;elle-même.
          </p>
        )}
      </div>

      {confirm === "refund" && (
        <ConfirmDialog
          title={`Rembourser ${formatCents(booking.totalCents)} ?`}
          message={`${booking.name} est remboursé de ${formatCents(booking.totalCents)} sur sa carte${
            booking.feeCents > 0 ? `, frais de service de ${formatCents(booking.feeCents)} compris` : ""
          }, et prévenu par e-mail. La ${tableName.toLowerCase()} redevient libre. C'est définitif.`}
          confirmLabel="Rembourser"
          cancelLabel="Ne pas rembourser"
          destructive
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            setConfirm(null);
            void run(() => clubApi.refundBooking(booking), `${tableName} remboursée.`, true);
          }}
        />
      )}
      {confirm === "cancel" && (
        <ConfirmDialog
          title="Annuler la réservation ?"
          message={`La réservation de ${booking.name} est annulée et la ${tableName.toLowerCase()} redevient libre.${
            booking.paidAt ? ` Les ${formatCents(booking.priceCents)} réglés sur place sont à lui rendre au comptoir.` : ""
          }`}
          confirmLabel="Annuler la réservation"
          cancelLabel="Garder"
          destructive
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            setConfirm(null);
            void run(() => clubApi.cancelClubBooking(booking), `${tableName} libérée.`, true);
          }}
        />
      )}
    </Modal>
  );
}

function ReserveForm({
  event,
  table,
  zone,
  price,
  onSale,
  tonight,
  onClose,
}: {
  event: ClubEvent;
  table: ClubTable;
  zone: ClubZone;
  price: number;
  onSale: boolean;
  tonight: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const [source, setSource] = useState<clubApi.ClubBookingInput["source"]>(tonight ? "sur_place" : "telephone");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [party, setParty] = useState(table.seats);
  const [paid, setPaid] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const phoneTrim = phone.trim();
  const nameError = name.trim() ? undefined : "Le nom du client.";
  const phoneError =
    !phoneTrim || (phoneTrim.length >= CLUB_LIMITS.phoneMin && phoneTrim.length <= CLUB_LIMITS.phoneMax)
      ? undefined
      : "Un numéro complet, ou vide.";

  const submit = async () => {
    if (nameError || phoneError) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    try {
      await clubApi.createClubBooking({
        eventId: event.id,
        tableId: table.id,
        name: name.trim(),
        phone: phoneTrim,
        partySize: party,
        source,
        paid,
        note: note.trim(),
      });
      toast.success(`Table ${table.label} réservée pour ${name.trim()}.`);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
      setSaving(false);
    }
  };

  const choice = (active: boolean) =>
    `flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
      active ? "ember-gradient text-background" : "text-muted hover:text-foreground"
    }`;

  return (
    <Modal
      title={`Réserver la table ${table.label}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={SECONDARY}>
            Annuler
          </button>
          <button type="submit" form="reserver-table" disabled={saving} className={PRIMARY}>
            {saving ? "Réservation…" : "Réserver la table"}
          </button>
        </>
      }
    >
      <form
        id="reserver-table"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex flex-col gap-4"
      >
        <p className="text-sm text-muted">
          {zone.name} · {table.seats} places · <span className="font-semibold text-foreground">{formatCents(price)}</span>
          {zone.inclus ? ` · ${zone.inclus}` : ""}
          {!onSale && <span className="mt-1 block text-xs text-faint">Gardée hors vente ce soir : vous seul pouvez la réserver.</span>}
        </p>

        <div role="radiogroup" aria-label="Réservation prise" className="flex rounded-full border border-hairline p-1">
          {(["telephone", "sur_place"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={source === value}
              onClick={() => setSource(value)}
              className={choice(source === value)}
            >
              {SOURCE_LABELS[value]}
            </button>
          ))}
        </div>

        <Field label="Nom" required error={showErrors ? nameError : undefined}>
          <input
            value={name}
            maxLength={CLUB_LIMITS.name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            aria-invalid={(showErrors && Boolean(nameError)) || undefined}
            className={inputClass}
            data-autofocus
          />
        </Field>
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <Field label="Téléphone" error={showErrors ? phoneError : undefined}>
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              maxLength={CLUB_LIMITS.phoneMax}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="off"
              aria-invalid={(showErrors && Boolean(phoneError)) || undefined}
              className={inputClass}
            />
          </Field>
          <Field label="Personnes">
            <select value={party} onChange={(e) => setParty(Number(e.target.value))} className={inputClass}>
              {Array.from({ length: table.seats }, (_, index) => index + 1).map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div role="radiogroup" aria-label="Règlement" className="flex rounded-full border border-hairline p-1">
          <button type="button" role="radio" aria-checked={!paid} onClick={() => setPaid(false)} className={choice(!paid)}>
            À régler sur place
          </button>
          <button type="button" role="radio" aria-checked={paid} onClick={() => setPaid(true)} className={choice(paid)}>
            Déjà réglée
          </button>
        </div>

        <Field label="Note" hint="Visible de l'équipe seulement : anniversaire, bouteille réservée…">
          <textarea
            value={note}
            maxLength={CLUB_LIMITS.note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className={inputClass}
          />
        </Field>
      </form>
    </Modal>
  );
}

export function BookingSheet({
  event,
  table,
  zone,
  booking,
  price,
  onSale,
  tonight,
  gerant,
  onClose,
}: {
  event: ClubEvent;
  table: ClubTable;
  zone: ClubZone;
  booking: ClubBooking | undefined;
  price: number;
  onSale: boolean;
  tonight: boolean;
  gerant: boolean;
  onClose: () => void;
}) {
  if (booking) {
    return <BookingCard booking={booking} table={table} zone={zone} gerant={gerant} onClose={onClose} />;
  }
  if (gerant && !event.cancelledAt) {
    return (
      <ReserveForm
        event={event}
        table={table}
        zone={zone}
        price={price}
        onSale={onSale}
        tonight={tonight}
        onClose={onClose}
      />
    );
  }
  return (
    <Modal title={`Table ${table.label} · ${zone.name}`} onClose={onClose}>
      <div className="flex flex-col gap-2">
        <p className="font-display text-xl font-medium">{onSale ? "Libre" : "Gardée, hors vente"}</p>
        <p className="text-sm text-muted">
          {table.seats} places · {formatCents(price)}
          {zone.inclus ? ` · ${zone.inclus}` : ""}
        </p>
        {!event.cancelledAt && (
          <p className="text-sm text-muted">Le gérant saisit les réservations prises au téléphone ou à la porte.</p>
        )}
      </div>
    </Modal>
  );
}
