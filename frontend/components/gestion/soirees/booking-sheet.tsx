"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatClock } from "@/lib/collect/hours";
import { formatCents } from "@/lib/club/format";
import type { ClubBooking, ClubEvent, ClubPayment, ClubTable, ClubZone } from "@/lib/club/types";
import * as clubApi from "@/lib/gestion/club-api";
import {
  formatPhone,
  isClubEntered,
  people,
  refundableOnline,
  staffTableState,
  tableName,
  telHref,
} from "@/lib/gestion/club-selectors";
import { CLUB_LIMITS } from "@/lib/gestion/constants";
import { StatusChip } from "./night-plan";

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

const PRIMARY =
  "ember-gradient min-h-11 w-full rounded-full px-5 text-sm font-semibold text-background disabled:opacity-50";
const SECONDARY =
  "min-h-11 w-full rounded-full border border-hairline px-5 text-sm font-semibold text-foreground transition-colors hover:border-ember-2/40 disabled:opacity-50";
const DANGER =
  "mx-auto min-h-11 rounded-full px-4 text-sm font-medium text-ember-3 underline-offset-4 transition-colors hover:underline disabled:opacity-50";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</dt>
      <dd className="min-w-0 text-right text-sm">{children}</dd>
    </div>
  );
}

const METHOD_LABELS: Record<ClubPayment["method"], string> = {
  en_ligne: "En ligne",
  sur_place: "Sur place",
};

/** Payé / reste, et la part déjà réglée en barre : ce que la porte a encore à encaisser. */
function Progress({ booking }: { booking: ClubBooking }) {
  const share = booking.priceCents > 0 ? booking.paidCents / booking.priceCents : 1;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span>
          Payé <span className="font-semibold tabular-nums">{formatCents(booking.paidCents)}</span>
        </span>
        <span className={booking.remainingCents > 0 ? "font-semibold text-ember-2" : "text-muted"}>
          {booking.remainingCents > 0 ? (
            <>
              Reste <span className="tabular-nums">{formatCents(booking.remainingCents)}</span>
            </>
          ) : (
            "Table réglée"
          )}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Part du prix de la table déjà réglée"
        aria-valuemin={0}
        aria-valuemax={booking.priceCents}
        aria-valuenow={booking.paidCents}
        aria-valuetext={`${formatCents(booking.paidCents)} sur ${formatCents(booking.priceCents)}`}
        className="h-2 overflow-hidden rounded-full bg-surface-raised"
      >
        <div
          className="h-full rounded-full bg-[var(--etat-arrivee)] transition-[width] duration-[var(--c-slow)] ease-[var(--c-ease)]"
          style={{ width: `${Math.min(1, share) * 100}%` }}
        />
      </div>
    </div>
  );
}

function BookingCard({
  booking,
  payments,
  table,
  zone,
  gerant,
  onClose,
}: {
  booking: ClubBooking;
  payments: ClubPayment[];
  table: ClubTable;
  zone: ClubZone;
  gerant: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"refund" | "cancel" | ClubPayment | null>(null);
  const state = staffTableState(booking, true);
  const clubEntered = isClubEntered(booking);
  const holding = state === "prise";
  const remaining = booking.remainingCents;
  const online = refundableOnline(payments);
  const onlineTotal = online.reduce((sum, payment) => sum + payment.amountCents + payment.feeCents, 0);
  const fees = online.reduce((sum, payment) => sum + payment.feeCents, 0);
  const payers = payments.filter((payment) => payment.method === "en_ligne").length;

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

  const name = tableName(zone.name, table.label);
  // Le geste attendu d'abord, sur toute la largeur ; ce qui défait ou rend
  // l'argent en dernier, discret, et toujours confirmé.
  const footer = holding ? undefined : (
    <>
      {remaining > 0 && booking.status !== "arrivee" && (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(
                () => clubApi.markArrival(booking, true, true),
                `${name} : ${formatCents(remaining)} encaissés, arrivée.`,
                true
              )
            }
            className={PRIMARY}
          >
            {booking.paidCents > 0 ? "Encaisser le reste" : "Encaisser"} {formatCents(remaining)} et faire entrer
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(() => clubApi.markArrival(booking, false, true), `${name} : ${formatCents(remaining)} encaissés.`)
            }
            className={SECONDARY}
          >
            Encaisser {formatCents(remaining)} sans faire entrer
          </button>
        </>
      )}
      {remaining === 0 && booking.status === "payee" && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(() => clubApi.markArrival(booking, true), `${name} : arrivée.`, true)}
          className={PRIMARY}
        >
          Marquer arrivé(e)
        </button>
      )}
      {booking.status === "arrivee" && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(() => clubApi.markArrival(booking, false), `${name} : arrivée annulée.`)}
          className={SECONDARY}
        >
          Annuler l&rsquo;arrivée
        </button>
      )}
      {gerant && online.length > 0 && (
        <button type="button" disabled={busy} onClick={() => setConfirm("refund")} className={DANGER}>
          Rembourser la table
        </button>
      )}
      {gerant && clubEntered && (
        <button type="button" disabled={busy} onClick={() => setConfirm("cancel")} className={DANGER}>
          Annuler la réservation
        </button>
      )}
    </>
  );

  return (
    <Modal title={name} onClose={onClose} footer={footer}>
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-xl font-medium">{booking.name}</p>
            <p className="mt-0.5 text-sm text-muted">
              {people(booking.partySize)} · {table.seats} places
              {booking.shared && (
                <>
                  {" · "}
                  <span className="font-medium text-foreground">
                    Table partagée, {payers} payeur{payers > 1 ? "s" : ""}
                  </span>
                </>
              )}
            </p>
          </div>
          <StatusChip key={state} state={state} />
        </div>

        {holding ? (
          <p className="text-sm text-muted">
            Le client règle en ce moment sur la page du club
            {booking.holdExpiresAt ? `, table tenue jusqu'à ${formatClock(booking.holdExpiresAt)}` : ""}. Sans
            paiement, elle se libère d&rsquo;elle-même.
          </p>
        ) : (
          <Progress booking={booking} />
        )}

        {payments.length > 0 && (
          <section aria-label="Paiements" className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Paiements</h3>
            <ul className="divide-y divide-hairline rounded-2xl border border-hairline bg-surface">
              {payments.map((payment) => {
                const refunded = payment.status === "remboursee";
                return (
                  <li key={payment.id} className="flex flex-col gap-2 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className={`text-sm font-medium ${refunded ? "text-muted line-through" : ""}`}>
                          {payment.name}
                        </span>
                        {payment.organiser && booking.shared && (
                          <span className="ml-2 rounded-full border border-hairline px-2 py-0.5 text-xs text-muted">
                            Organisateur
                          </span>
                        )}
                        <span className="mt-0.5 block text-xs text-muted">
                          {METHOD_LABELS[payment.method]}
                          {refunded
                            ? " · remboursée"
                            : payment.paidAt
                              ? ` · ${formatClock(payment.paidAt)}`
                              : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-semibold tabular-nums">{formatCents(payment.amountCents)}</span>
                        {payment.feeCents > 0 && (
                          <span className="block text-xs text-muted">
                            + <span className="tabular-nums">{formatCents(payment.feeCents)}</span> de frais
                          </span>
                        )}
                      </span>
                    </div>
                    {gerant && booking.shared && payment.method === "en_ligne" && !refunded && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirm(payment)}
                        className="min-h-11 self-start rounded-full px-1 text-sm font-medium text-ember-3 underline-offset-4 hover:underline disabled:opacity-50"
                      >
                        Rembourser cette part
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <dl className="divide-y divide-hairline rounded-2xl border border-hairline bg-surface">
          {booking.phone && (
            <Row label="Téléphone">
              <a
                href={telHref(booking.phone)}
                className="inline-flex min-h-11 items-center font-semibold tabular-nums text-ember-1 transition-opacity hover:opacity-80 lg:pointer-fine:min-h-0"
              >
                {formatPhone(booking.phone)}
              </a>
            </Row>
          )}
          <Row label="Prix de la table">
            <span className="font-semibold tabular-nums">{formatCents(booking.priceCents)}</span>
            {fees > 0 && (
              <span className="block text-xs text-muted">
                + <span className="tabular-nums">{formatCents(fees)}</span> de frais de service en ligne
              </span>
            )}
          </Row>
          <Row label="Réservée">
            {SOURCE_LABELS[booking.source]} à {formatClock(booking.createdAt)}
          </Row>
          {booking.arrivedAt && <Row label="Arrivée">{formatClock(booking.arrivedAt)}</Row>}
          {booking.email && <Row label="E-mail">{booking.email}</Row>}
          {booking.note && (
            <div className="px-4 py-3">
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted">Note</dt>
              <dd className="mt-1 whitespace-pre-line text-sm">{booking.note}</dd>
            </div>
          )}
        </dl>
      </div>

      {confirm === "refund" && (
        <ConfirmDialog
          title={`Rembourser ${formatCents(onlineTotal)} ?`}
          message={`${
            online.length > 1 ? `Les ${online.length} payeurs sont remboursés` : `${online[0]?.name ?? booking.name} est remboursé`
          } sur leur carte, frais de service compris, et prévenus par e-mail. La table ${name} redevient libre.${
            booking.paidCents > onlineTotal - fees ? " Ce qui a été réglé sur place est à rendre au comptoir." : ""
          } C'est définitif.`}
          confirmLabel="Rembourser la table"
          cancelLabel="Ne pas rembourser"
          destructive
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            setConfirm(null);
            void run(() => clubApi.refundBooking(booking), `${name} remboursée.`, true);
          }}
        />
      )}
      {confirm !== null && typeof confirm === "object" && (
        <ConfirmDialog
          title={`Rembourser la part de ${confirm.name} ?`}
          message={`${formatCents(confirm.amountCents + confirm.feeCents)} lui sont rendus sur sa carte, frais de service compris, et il est prévenu par e-mail. La table reste réservée : il restera ${formatCents(remaining + confirm.amountCents)} à encaisser à la porte.`}
          confirmLabel="Rembourser cette part"
          cancelLabel="Garder"
          destructive
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            const payment = confirm;
            setConfirm(null);
            void run(() => clubApi.refundPayment(booking, payment), `Part de ${payment.name} remboursée.`);
          }}
        />
      )}
      {confirm === "cancel" && (
        <ConfirmDialog
          title="Annuler la réservation ?"
          message={`La réservation de ${booking.name} est annulée et la table ${name} redevient libre.${
            booking.paidCents > 0
              ? ` Les ${formatCents(booking.paidCents)} réglés sur place sont à lui rendre au comptoir.`
              : ""
          }`}
          confirmLabel="Annuler la réservation"
          cancelLabel="Garder"
          destructive
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            setConfirm(null);
            void run(() => clubApi.cancelClubBooking(booking), `${name} libérée.`, true);
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
      toast.success(`${tableName(zone.name, table.label)} réservée pour ${name.trim()}.`);
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
      title={`Réserver ${tableName(zone.name, table.label)}`}
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
          {!onSale && <span className="mt-1 block text-xs text-muted">Gardée hors vente ce soir : vous seul pouvez la réserver.</span>}
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
  payments,
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
  /** Les paiements de la réservation (parts en ligne, encaissements à la porte). */
  payments: ClubPayment[];
  price: number;
  onSale: boolean;
  tonight: boolean;
  gerant: boolean;
  onClose: () => void;
}) {
  if (booking) {
    return (
      <BookingCard
        booking={booking}
        payments={payments}
        table={table}
        zone={zone}
        gerant={gerant}
        onClose={onClose}
      />
    );
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
    <Modal title={tableName(zone.name, table.label)} onClose={onClose}>
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
