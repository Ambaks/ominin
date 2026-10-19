"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatClock } from "@/lib/collect/hours";
import { formatCents, tableName } from "@/lib/club/format";
import type { ClubBooking, ClubEvent, ClubPayment, ClubTable, ClubZone } from "@/lib/club/types";
import * as clubApi from "@/lib/gestion/club-api";
import {
  depositOf,
  formatPhone,
  isClubEntered,
  payersOf,
  people,
  refundableOnline,
  staffTableState,
  telHref,
} from "@/lib/gestion/club-selectors";
import { CLUB_LIMITS } from "@/lib/gestion/constants";
import { PayerRing } from "./payer-ring";
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
  "min-h-11 w-full rounded-full border border-ember-3/60 px-5 text-sm font-semibold text-foreground transition-colors hover:bg-ember-3/15 disabled:opacity-50";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</dt>
      <dd className="min-w-0 text-right text-sm">{children}</dd>
    </div>
  );
}

/** Les tables où une réservation peut aller, zone par zone. */
export type MoveTarget = { zone: ClubZone; tables: ClubTable[] };

const METHOD_LABELS: Record<ClubPayment["method"], string> = {
  en_ligne: "En ligne",
  sur_place: "Sur place",
};

/** Payé / reste, et la part déjà réglée en barre : ce que la porte a encore à encaisser. */
function Progress({ booking, deposit }: { booking: ClubBooking; deposit: number | null }) {
  const share = booking.priceCents > 0 ? booking.paidCents / booking.priceCents : 1;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span>
          {deposit !== null ? (
            <>
              Acompte en ligne <span className="font-semibold tabular-nums">{formatCents(deposit)}</span>
            </>
          ) : (
            <>
              Payé <span className="font-semibold tabular-nums">{formatCents(booking.paidCents)}</span>{" "}
              <span className="text-xs text-muted">hors frais</span>
            </>
          )}
        </span>
        <span className={booking.remainingCents > 0 ? "font-semibold text-ember-2" : "text-muted"}>
          {booking.remainingCents > 0 ? (
            <>
              Reste <span className="tabular-nums">{formatCents(booking.remainingCents)}</span> à encaisser
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
  moveTargets,
  onMoved,
  table,
  zone,
  gerant,
  onClose,
}: {
  booking: ClubBooking;
  payments: ClubPayment[];
  moveTargets: MoveTarget[];
  onMoved: (tableId: string) => void;
  table: ClubTable;
  zone: ClubZone;
  gerant: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  /** Le geste en cours (« porte », « table » ou l'id d'une part) : son bouton dit qu'il travaille. */
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"refund" | "cancel" | ClubPayment | null>(null);
  const [moving, setMoving] = useState(false);
  const [target, setTarget] = useState<{ table: ClubTable; zone: ClubZone } | null>(null);
  const state = staffTableState(booking, true);
  const clubEntered = isClubEntered(booking);
  const holding = state === "prise";
  const remaining = booking.remainingCents;
  const online = refundableOnline(payments);
  const onlineTotal = online.reduce((sum, payment) => sum + payment.amountCents + payment.feeCents, 0);
  const fees = online.reduce((sum, payment) => sum + payment.feeCents, 0);
  const paid = payments.filter((payment) => payment.status === "payee");
  const groups = payersOf(payments);
  const payers = groups.filter((payer) => payer.totalCents > 0).length;
  const paidTotal = paid.reduce((sum, payment) => sum + payment.amountCents + payment.feeCents, 0);
  const paidFees = paid.reduce((sum, payment) => sum + payment.feeCents, 0);

  const run = async (key: string, action: () => Promise<unknown>, success: string, close = false) => {
    setBusy(key);
    try {
      await action();
      toast.success(success);
      if (close) onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setBusy(null);
    }
  };

  const name = tableName(zone.name, table.label);
  const working = busy !== null;
  // Un seul geste en bas, celui qu'on attend : la fiche reste lisible
  // au-dessus. Les autres gestes vivent dans la fiche, sous ses données ;
  // ce qui rend de l'argent passe toujours par une confirmation chiffrée.
  const collect = remaining > 0 && booking.status !== "arrivee";
  const footer =
    holding || booking.status === "remboursee" ? undefined : collect ? (
      <button
        type="button"
        disabled={working}
        onClick={() =>
          void run("porte", () => clubApi.markArrival(booking, true, true), `${name} : ${formatCents(remaining)} encaissés, arrivée.`, true)
        }
        className={PRIMARY}
      >
        {busy === "porte"
          ? "Encaissement…"
          : `${booking.paidCents > 0 ? "Encaisser le reste" : "Encaisser"} ${formatCents(remaining)} et faire entrer`}
      </button>
    ) : booking.status === "payee" ? (
      <button
        type="button"
        disabled={working}
        onClick={() => void run("porte", () => clubApi.markArrival(booking, true), `${name} : arrivée.`, true)}
        className={PRIMARY}
      >
        {busy === "porte" ? "Un instant…" : "Marquer arrivé(e)"}
      </button>
    ) : undefined;

  return (
    <Modal title={name} onClose={onClose} footer={footer}>
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-xl font-medium">{booking.name}</p>
            <p className="mt-0.5 text-sm text-muted">
              {people(booking.partySize)} · {table.seats} places
            </p>
            {booking.shared && payers > 1 && (
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-hairline px-2.5 py-1 text-xs font-medium">
                <span className="etoile" aria-hidden />
                Table partagée · {payers} payeur{payers > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <StatusChip key={state} state={state} />
        </div>

        {booking.shared && payers > 1 && (
          <PayerRing
            label={table.label}
            seats={booking.partySize}
            priceCents={booking.priceCents}
            paidCents={booking.paidCents}
            payers={groups.filter((payer) => payer.totalCents > 0)}
          />
        )}

        {holding ? (
          <p className="text-sm text-muted">
            Le client règle en ce moment sur la page du club
            {booking.holdExpiresAt ? `, table tenue jusqu'à ${formatClock(booking.holdExpiresAt)}` : ""}. Sans
            paiement, elle se libère d&rsquo;elle-même.
          </p>
        ) : (
          <Progress booking={booking} deposit={depositOf(booking, payments)} />
        )}

        {payments.length > 0 && (
          <section aria-label="Paiements" className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Qui a payé</h3>
            <ul className="divide-y divide-hairline rounded-2xl border border-hairline bg-surface">
              {groups.map((payer) => (
                <li key={payer.key} className="flex flex-col gap-1.5 px-4 py-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className={`min-w-0 text-sm font-medium ${payer.totalCents === 0 ? "text-muted line-through" : ""}`}>
                      {payer.name}
                      {payer.organiser && booking.shared && (
                        <span className="ml-1.5 text-xs font-medium text-ember-1">Organisateur</span>
                      )}
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">{formatCents(payer.totalCents)}</span>
                  </div>
                  {payer.payments.map((payment) => {
                    const refunded = payment.status === "remboursee";
                    // Un ami qui se désiste ; la part de l'organisateur (et les frais) part avec la table entière.
                    const refundable =
                      gerant && booking.shared && !payment.organiser && payment.method === "en_ligne" && !refunded;
                    return (
                      <div key={payment.id} className="flex items-center justify-between gap-3 text-xs text-muted">
                        <span className={refunded ? "line-through" : undefined}>
                          {METHOD_LABELS[payment.method]}
                          {payment.paidAt ? ` · ${formatClock(payment.paidAt)}` : ""}
                          {payer.payments.length > 1 && (
                            <>
                              {" · "}
                              <span className="tabular-nums">{formatCents(payment.amountCents + payment.feeCents)}</span>
                            </>
                          )}
                          {payment.feeCents > 0 && (
                            <>
                              {" · dont "}
                              <span className="tabular-nums">{formatCents(payment.feeCents)}</span> de frais Ominin
                            </>
                          )}
                          {refunded && (booking.status === "remboursee" ? " · remboursée" : " · part remboursée")}
                        </span>
                        {refundable && (
                          <button
                            type="button"
                            disabled={working}
                            onClick={() => setConfirm(payment)}
                            aria-label={`Rembourser la part de ${payment.name}`}
                            className="min-h-11 shrink-0 rounded-full border border-hairline px-3.5 text-xs font-semibold text-foreground hover:border-ember-3/60 disabled:opacity-50"
                          >
                            {busy === payment.id ? "…" : "Rembourser"}
                          </button>
                        )}
                        {gerant && booking.status === "remboursee" && payment.method === "en_ligne" && !refunded && (
                          <span className="shrink-0 font-semibold text-foreground">Remboursement à relancer</span>
                        )}
                      </div>
                    );
                  })}
                </li>
              ))}
              <li className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="font-medium">
                  Total payé
                  {paidFees > 0 && (
                    <span className="block text-xs font-normal text-muted">
                      dont <span className="tabular-nums">{formatCents(paidFees)}</span> de frais Ominin
                    </span>
                  )}
                </span>
                <span className="font-semibold tabular-nums">{formatCents(paidTotal)}</span>
              </li>
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
          <Row label="Prix hors frais">
            <span className="font-semibold tabular-nums">{formatCents(booking.priceCents)}</span>
            {fees > 0 && (
              <span className="block text-xs text-muted">
                + <span className="tabular-nums">{formatCents(fees)}</span> de frais de service en ligne
              </span>
            )}
          </Row>
          <Row label="Réservée">
            {SOURCE_LABELS[booking.source]} à {formatClock(booking.createdAt)}
            {booking.source === "en_ligne" && (
              <span className="block text-xs text-muted">Table attribuée automatiquement</span>
            )}
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

        {!holding && booking.status !== "remboursee" && (
          <section aria-label="Autres actions" className="flex flex-col gap-2 border-t border-hairline pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Autres actions</h3>
            {collect && (
              <button
                type="button"
                disabled={working}
                onClick={() =>
                  void run("sans", () => clubApi.markArrival(booking, false, true), `${name} : ${formatCents(remaining)} encaissés.`)
                }
                className={SECONDARY}
              >
                {busy === "sans" ? "Encaissement…" : `Encaisser ${formatCents(remaining)} sans faire entrer`}
              </button>
            )}
            {booking.status === "arrivee" && (
              <button
                type="button"
                disabled={working}
                onClick={() => void run("porte", () => clubApi.markArrival(booking, false), `${name} : arrivée annulée.`)}
                className={SECONDARY}
              >
                {busy === "porte" ? "Un instant…" : "Annuler l’arrivée"}
              </button>
            )}
            {gerant && (
              <button type="button" disabled={working} onClick={() => setMoving(true)} className={SECONDARY}>
                {busy === "deplacer" ? "Déplacement…" : "Déplacer sur une autre table"}
              </button>
            )}
            {gerant && online.length > 0 && (
              <button type="button" disabled={working} onClick={() => setConfirm("refund")} className={DANGER}>
                {busy === "table" ? "Remboursement…" : `Rembourser toute la table (${formatCents(onlineTotal)})`}
              </button>
            )}
            {gerant && clubEntered && (
              <button type="button" disabled={working} onClick={() => setConfirm("cancel")} className={DANGER}>
                Annuler la réservation
              </button>
            )}
          </section>
        )}
      </div>

      {moving && (
        <Modal title={`Déplacer ${booking.name}`} onClose={() => setMoving(false)}>
          <div className="flex flex-col gap-5">
            <p className="text-sm text-muted">
              Les tables libres ce soir qui accueillent {people(booking.partySize)}. Le prix payé ne change pas.
            </p>
            {moveTargets.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-hairline px-4 py-6 text-center text-sm text-muted">
                Aucune table libre n&rsquo;accueille ce groupe ce soir.
              </p>
            ) : (
              moveTargets.map((group) => (
                <section key={group.zone.id} className="flex flex-col gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{group.zone.name}</h3>
                  <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {group.tables.map((candidate) => (
                      <li key={candidate.id}>
                        <button
                          type="button"
                          onClick={() => setTarget({ table: candidate, zone: group.zone })}
                          className="flex min-h-12 w-full flex-col items-start rounded-xl border border-hairline bg-surface px-3 py-2 text-left hover:border-[var(--soirees-gold)]"
                        >
                          <span className="text-sm font-semibold tabular-nums">{candidate.label}</span>
                          <span className="text-xs text-muted">{candidate.seats} places</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            )}
          </div>
        </Modal>
      )}
      {target && (
        <ConfirmDialog
          title={`Déplacer vers ${tableName(target.zone.name, target.table.label)} ?`}
          message={`${booking.name} (${people(booking.partySize)}) passe de ${name} à ${tableName(target.zone.name, target.table.label)}. ${name} redevient libre ; le prix payé ne change pas.`}
          confirmLabel="Déplacer"
          cancelLabel="Choisir une autre table"
          onClose={() => setTarget(null)}
          onConfirm={() => {
            const destination = target;
            setTarget(null);
            setMoving(false);
            void run(
              "deplacer",
              async () => {
                await clubApi.moveBooking(booking, destination.table.id);
                onMoved(destination.table.id);
              },
              `${booking.name} est à ${tableName(destination.zone.name, destination.table.label)}.`
            );
          }}
        />
      )}
      {confirm === "refund" && (
        <ConfirmDialog
          title={`Rembourser ${formatCents(onlineTotal)} ?`}
          message={`${online
            .map(
              (payment) =>
                `${payment.name} : ${formatCents(payment.amountCents)}${
                  payment.feeCents > 0 ? ` + ${formatCents(payment.feeCents)} de frais` : ""
                }`
            )
            .join(" ; ")}. Chacun est remboursé sur sa carte et prévenu par e-mail ; la table ${name} redevient libre.${
            booking.paidCents > onlineTotal - fees ? " Ce qui a été réglé sur place est à rendre au comptoir." : ""
          } C'est définitif.`}
          confirmLabel="Rembourser la table"
          cancelLabel="Ne pas rembourser"
          destructive
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            setConfirm(null);
            void run("table", () => clubApi.refundBooking(booking), `${name} remboursée.`, true);
          }}
        />
      )}
      {confirm !== null && typeof confirm === "object" && (
        <ConfirmDialog
          title={`Rembourser ${formatCents(confirm.amountCents)}${
            confirm.feeCents > 0 ? ` + ${formatCents(confirm.feeCents)} de frais` : ""
          } à ${confirm.name} ?`}
          message={`Sa part lui est rendue sur sa carte et il est prévenu par e-mail. La table reste réservée : il restera ${formatCents(remaining + confirm.amountCents)} à encaisser à la porte.`}
          confirmLabel="Rembourser cette part"
          cancelLabel="Garder"
          destructive
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            const payment = confirm;
            setConfirm(null);
            void run(payment.id, () => clubApi.refundPayment(booking, payment), `Part de ${payment.name} remboursée.`);
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
            void run("table", () => clubApi.cancelClubBooking(booking), `${name} libérée.`, true);
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
  moveTargets,
  onMoved,
  onClose,
}: {
  event: ClubEvent;
  table: ClubTable;
  zone: ClubZone;
  booking: ClubBooking | undefined;
  /** Tables libres ce soir qui accueillent le groupe, zone par zone : où la réservation peut aller. */
  moveTargets: MoveTarget[];
  /** La réservation a changé de table : la fiche la suit. */
  onMoved: (tableId: string) => void;
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
        moveTargets={moveTargets}
        onMoved={onMoved}
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
