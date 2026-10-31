"use client";

import { useState, type CSSProperties } from "react";
import {
  ConfirmSheet,
  Field,
  GlassButton,
  Input,
  Plate,
  Segmented,
  Select,
  Sheet,
  Textarea,
} from "@/components/gestion/ui";
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
import { describeError } from "@/lib/gestion/errors";
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

const SOURCE_OPTIONS = [
  { value: "telephone" as const, label: "Au téléphone" },
  { value: "sur_place" as const, label: "Sur place" },
];

const PAID_OPTIONS = [
  { value: "non" as const, label: "À régler sur place" },
  { value: "oui" as const, label: "Déjà réglée" },
];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <dt className="g-eyebrow">{label}</dt>
      <dd className="min-w-0 text-right text-g-body">{children}</dd>
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
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-g-body">
        <span>
          {deposit !== null ? (
            <>
              Acompte en ligne <span className="font-semibold tabular-nums">{formatCents(deposit)}</span>
            </>
          ) : (
            <>
              Payé <span className="font-semibold tabular-nums">{formatCents(booking.paidCents)}</span>{" "}
              <span className="text-g-meta text-muted">hors frais</span>
            </>
          )}
        </span>
        <span className={booking.remainingCents > 0 ? "font-semibold text-ember-1" : "text-muted"}>
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
          className="part-barre h-full rounded-full bg-status-signed"
          style={{ "--part": Math.min(1, share) } as CSSProperties}
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
      toast.error(describeError(error).message);
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
      <>
        {busy === "porte" && <p>Encaissement en cours…</p>}
        <GlassButton
          variant="primary"
          className="min-w-0"
          disabled={working}
          onClick={() =>
            void run("porte", () => clubApi.markArrival(booking, true, true), `${name} : ${formatCents(remaining)} encaissés, arrivée.`, true)
          }
        >
          <span className="porte-libelle">
            {`${booking.paidCents > 0 ? "Encaisser le reste" : "Encaisser"} ${formatCents(remaining)} et faire entrer`}
          </span>
        </GlassButton>
      </>
    ) : booking.status === "payee" ? (
      <>
        {busy === "porte" && <p>Un instant…</p>}
        <GlassButton
          variant="primary"
          disabled={working}
          onClick={() => void run("porte", () => clubApi.markArrival(booking, true), `${name} : arrivée.`, true)}
        >
          Faire entrer
        </GlassButton>
      </>
    ) : undefined;

  return (
    <Sheet title={name} onClose={onClose} footer={footer}>
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-g-h2">{booking.name}</p>
            <p className="mt-1 text-g-body text-muted">
              {people(booking.partySize)} · {table.seats} places
            </p>
            {booking.shared && payers > 1 && (
              <span className="g-chip mt-2">
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
          <p className="text-g-body text-muted">
            Le client règle en ce moment sur la page du club
            {booking.holdExpiresAt ? `, table tenue jusqu'à ${formatClock(booking.holdExpiresAt)}` : ""}. Sans
            paiement, elle se libère d&rsquo;elle-même.
          </p>
        ) : (
          <Progress booking={booking} deposit={depositOf(booking, payments)} />
        )}

        {payments.length > 0 && (
          <section aria-label="Paiements" className="flex flex-col gap-2">
            <h3 className="g-eyebrow g-money">Qui a payé</h3>
            <Plate>
              <ul className="divide-y divide-hairline">
                {groups.map((payer) => (
                  <li key={payer.key} className="flex flex-col gap-1.5 px-4 py-2.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className={`min-w-0 text-g-body font-medium ${payer.totalCents === 0 ? "text-muted line-through" : ""}`}>
                        {payer.name}
                        {payer.organiser && booking.shared && (
                          <span className="ml-1.5 text-g-meta font-medium text-ember-1">Organisateur</span>
                        )}
                      </span>
                      <span className="shrink-0 text-g-body font-semibold tabular-nums">{formatCents(payer.totalCents)}</span>
                    </div>
                    {payer.payments.map((payment) => {
                      const refunded = payment.status === "remboursee";
                      // Un ami qui se désiste ; la part de l'organisateur (et les frais) part avec la table entière.
                      const refundable =
                        gerant && booking.shared && !payment.organiser && payment.method === "en_ligne" && !refunded;
                      return (
                        <div key={payment.id} className="flex items-center justify-between gap-3 text-g-meta text-muted">
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
                            <GlassButton
                              variant="danger"
                              disabled={working}
                              onClick={() => setConfirm(payment)}
                              aria-label={`Rembourser la part de ${payment.name}`}
                            >
                              {busy === payment.id ? "…" : "Rembourser"}
                            </GlassButton>
                          )}
                          {gerant && booking.status === "remboursee" && payment.method === "en_ligne" && !refunded && (
                            <span className="shrink-0 font-semibold text-foreground">Remboursement à relancer</span>
                          )}
                        </div>
                      );
                    })}
                  </li>
                ))}
                <li className="flex items-center justify-between gap-3 px-4 py-2.5 text-g-body">
                  <span className="font-medium">
                    Total payé
                    {paidFees > 0 && (
                      <span className="block text-g-meta font-normal text-muted">
                        dont <span className="tabular-nums">{formatCents(paidFees)}</span> de frais Ominin
                      </span>
                    )}
                  </span>
                  <span className="font-semibold tabular-nums">{formatCents(paidTotal)}</span>
                </li>
              </ul>
            </Plate>
          </section>
        )}

        <Plate>
          <dl className="divide-y divide-hairline">
            {booking.phone && (
              <Row label="Téléphone">
                <a href={telHref(booking.phone)} className="inline-flex min-h-g-control items-center font-semibold text-ember-1 tabular-nums">
                  {formatPhone(booking.phone)}
                </a>
              </Row>
            )}
            <Row label="Prix hors frais">
              <span className="font-semibold tabular-nums">{formatCents(booking.priceCents)}</span>
              {fees > 0 && (
                <span className="block text-g-meta text-muted">
                  + <span className="tabular-nums">{formatCents(fees)}</span> de frais de service en ligne
                </span>
              )}
            </Row>
            <Row label="Réservée">
              {SOURCE_LABELS[booking.source]} à {formatClock(booking.createdAt)}
              {booking.source === "en_ligne" && (
                <span className="block text-g-meta text-muted">Table attribuée automatiquement</span>
              )}
            </Row>
            {booking.arrivedAt && <Row label="Arrivée">{formatClock(booking.arrivedAt)}</Row>}
            {booking.email && <Row label="E-mail">{booking.email}</Row>}
            {booking.note && (
              <div className="px-4 py-3">
                <dt className="g-eyebrow">Note</dt>
                <dd className="mt-1.5 whitespace-pre-line text-g-body">{booking.note}</dd>
              </div>
            )}
          </dl>
        </Plate>

        {!holding && booking.status !== "remboursee" && (
          <section aria-label="Autres actions" className="flex flex-col gap-2">
            <h3 className="g-eyebrow">Autres actions</h3>
            {collect && (
              <GlassButton
                disabled={working}
                onClick={() =>
                  void run("sans", () => clubApi.markArrival(booking, false, true), `${name} : ${formatCents(remaining)} encaissés.`)
                }
              >
                {busy === "sans" ? "Encaissement…" : `Encaisser ${formatCents(remaining)} sans faire entrer`}
              </GlassButton>
            )}
            {booking.status === "arrivee" && (
              <GlassButton
                disabled={working}
                onClick={() => void run("porte", () => clubApi.markArrival(booking, false), `${name} : arrivée annulée.`)}
              >
                {busy === "porte" ? "Un instant…" : "Annuler l’arrivée"}
              </GlassButton>
            )}
            {gerant && (
              <GlassButton disabled={working} onClick={() => setMoving(true)}>
                {busy === "deplacer" ? "Déplacement…" : "Déplacer sur une autre table"}
              </GlassButton>
            )}
            {gerant && online.length > 0 && (
              <GlassButton variant="danger" disabled={working} onClick={() => setConfirm("refund")}>
                {busy === "table" ? "Remboursement…" : `Rembourser toute la table (${formatCents(onlineTotal)})`}
              </GlassButton>
            )}
            {gerant && clubEntered && (
              <GlassButton variant="danger" disabled={working} onClick={() => setConfirm("cancel")}>
                Annuler la réservation
              </GlassButton>
            )}
          </section>
        )}
      </div>

      {moving && (
        <Sheet
          title={`Déplacer ${booking.name}`}
          description={`Les tables libres ce soir qui accueillent ${people(booking.partySize)}. Le prix payé ne change pas.`}
          onClose={() => setMoving(false)}
        >
          <div className="flex flex-col gap-5">
            {moveTargets.length === 0 ? (
              <p className="rounded-g-card border border-dashed border-hairline px-4 py-6 text-center text-g-body text-muted">
                Aucune table libre n&rsquo;accueille ce groupe ce soir.
              </p>
            ) : (
              moveTargets.map((group) => (
                <section key={group.zone.id} className="flex flex-col gap-2">
                  <h3 className="g-eyebrow">{group.zone.name}</h3>
                  <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {group.tables.map((candidate) => (
                      <li key={candidate.id}>
                        <button
                          type="button"
                          onClick={() => setTarget({ table: candidate, zone: group.zone })}
                          className="tuile g-press flex-col items-start gap-0.5"
                        >
                          <span className="text-g-body font-semibold tabular-nums">{candidate.label}</span>
                          <span className="text-g-meta text-muted">{candidate.seats} places</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            )}
          </div>
        </Sheet>
      )}
      {target && (
        <ConfirmSheet
          title={`Déplacer vers ${tableName(target.zone.name, target.table.label)} ?`}
          text={`${booking.name} (${people(booking.partySize)}) passe de ${name} à ${tableName(target.zone.name, target.table.label)}. ${name} redevient libre ; le prix payé ne change pas.`}
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
        <ConfirmSheet
          title={`Rembourser ${formatCents(onlineTotal)} ?`}
          text={`${online
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
        <ConfirmSheet
          title={`Rembourser ${formatCents(confirm.amountCents)}${
            confirm.feeCents > 0 ? ` + ${formatCents(confirm.feeCents)} de frais` : ""
          } à ${confirm.name} ?`}
          text={`Sa part lui est rendue sur sa carte et il est prévenu par e-mail. La table reste réservée : il restera ${formatCents(remaining + confirm.amountCents)} à encaisser à la porte.`}
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
        <ConfirmSheet
          title="Annuler la réservation ?"
          text={`La réservation de ${booking.name} est annulée et la table ${name} redevient libre.${
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
    </Sheet>
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
  const [paid, setPaid] = useState<"oui" | "non">("non");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const phoneTrim = phone.trim();
  const nameError = name.trim() ? undefined : "Indiquez le nom du client.";
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
        paid: paid === "oui",
        note: note.trim(),
      });
      toast.success(`${tableName(zone.name, table.label)} réservée pour ${name.trim()}.`);
      onClose();
    } catch (error) {
      toast.error(describeError(error).message);
      setSaving(false);
    }
  };

  return (
    <Sheet
      title={`Réserver ${tableName(zone.name, table.label)}`}
      description={`${zone.name} · ${table.seats} places · ${formatCents(price)}${zone.inclus ? ` · ${zone.inclus}` : ""}${
        onSale ? "" : " · gardée hors vente ce soir : vous seul pouvez la réserver."
      }`}
      onClose={onClose}
      footer={
        <>
          {saving && <p>Réservation en cours…</p>}
          <GlassButton onClick={onClose}>Annuler</GlassButton>
          <GlassButton type="submit" form="reserver-table" variant="primary" disabled={saving}>
            Réserver la table
          </GlassButton>
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
        <div className="flex">
          <Segmented label="Réservation prise" glass={false} options={SOURCE_OPTIONS} value={source} onChange={setSource} />
        </div>

        <Field label="Nom" required error={showErrors ? nameError : undefined}>
          <Input value={name} maxLength={CLUB_LIMITS.name} onChange={(e) => setName(e.target.value)} autoComplete="off" data-autofocus />
        </Field>
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <Field label="Téléphone" error={showErrors ? phoneError : undefined}>
            <Input
              type="tel"
              inputMode="tel"
              value={phone}
              maxLength={CLUB_LIMITS.phoneMax}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="off"
            />
          </Field>
          <Field label="Personnes">
            <Select value={party} onChange={(e) => setParty(Number(e.target.value))}>
              {Array.from({ length: table.seats }, (_, index) => index + 1).map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="flex">
          <Segmented label="Règlement" glass={false} options={PAID_OPTIONS} value={paid} onChange={setPaid} />
        </div>

        <Field label="Note" hint="Visible de l'équipe seulement : anniversaire, bouteille réservée…">
          <Textarea value={note} maxLength={CLUB_LIMITS.note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </Field>
      </form>
    </Sheet>
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
    <Sheet title={tableName(zone.name, table.label)} onClose={onClose}>
      <div className="flex flex-col gap-2">
        <p className="font-display text-g-h2">{onSale ? "Libre" : "Gardée, hors vente"}</p>
        <p className="text-g-body text-muted">
          {table.seats} places · {formatCents(price)}
          {zone.inclus ? ` · ${zone.inclus}` : ""}
        </p>
        {!event.cancelledAt && (
          <p className="text-g-body text-muted">Le gérant saisit les réservations prises au téléphone ou à la porte.</p>
        )}
      </div>
    </Sheet>
  );
}
