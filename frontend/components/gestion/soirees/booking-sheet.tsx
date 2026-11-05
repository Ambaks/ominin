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
import { formatCents, formatTime, tableName } from "@/lib/club/format";
import type { ArrivalSlot, ClubBooking, ClubDroit, ClubEvent, ClubPayment, ClubTable, ClubZone } from "@/lib/club/types";
import * as clubApi from "@/lib/gestion/club-api";
import {
  depositOf,
  formatPhone,
  isClubEntered,
  nextGesture,
  payersOf,
  people,
  refundableOnline,
  staffTableState,
  telHref,
  undoGesture,
  type NightStep,
} from "@/lib/gestion/club-selectors";
import { CLUB_LIMITS } from "@/lib/gestion/constants";
import { describeError } from "@/lib/gestion/errors";
import { BookingHistory } from "./journal";
import { EurosInput, eurosToInput, parseEuros } from "./euros-input";
import { PayerRing } from "./payer-ring";
import { StatusChip } from "./night-plan";

/*
 * Une réservation du soir, touchée sur le plan ou dans la liste : ses
 * données et les gestes du poste qui l'ouvre — faire entrer, placer,
 * encaisser et installer, marquer le départ, rembourser. Une table libre,
 * elle, accueille une réservation à placer ou une réservation prise au
 * téléphone ou au comptoir.
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

/** L'heure d'arrivée : un créneau de la soirée, ou rien. Sans créneau, pas de champ. */
function ArrivalField({
  slots,
  value,
  onChange,
}: {
  slots: ArrivalSlot[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  if (slots.length === 0) return null;
  return (
    <Field label="Heure d'arrivée">
      <Select value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">Non précisée</option>
        {slots.map((slot) => (
          <option key={slot.startsAt} value={slot.startsAt}>
            {formatTime(slot.startsAt)}
          </option>
        ))}
      </Select>
    </Field>
  );
}

/** Les tables où une réservation peut aller, zone par zone. */
export type MoveTarget = { zone: ClubZone; tables: ClubTable[] };

/** Où une réservation saisie par le club peut aller : une table, ou une zone (à placer). */
export type ReserveTarget = { zone: ClubZone; table: ClubTable | null; seats: number; price: number; onSale: boolean };

/** Ce que dit l'annonce d'un retour en arrière, selon le temps retrouvé. */
const UNDONE: Record<NightStep, string> = {
  payee: "Arrivée annulée.",
  arrivee: "Installation annulée.",
  assise: "Départ annulé.",
  partie: "",
};

const METHOD_LABELS: Record<ClubPayment["method"], string> = {
  en_ligne: "En ligne",
  sur_place: "Sur place",
};

/** Payé / reste, et la part déjà réglée en barre : ce que le caissier a encore à encaisser. */
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

/** Le choix d'une table libre, zone par zone, puis sa confirmation. */
function PlaceSheet({
  booking,
  from,
  targets,
  onClose,
  onConfirm,
}: {
  booking: ClubBooking;
  /** Le nom de sa table actuelle ; null : à placer. */
  from: string | null;
  targets: MoveTarget[];
  onClose: () => void;
  onConfirm: (target: { table: ClubTable; zone: ClubZone }) => void;
}) {
  const [target, setTarget] = useState<{ table: ClubTable; zone: ClubZone } | null>(null);
  const verb = from ? "Déplacer" : "Placer";
  return (
    <>
      <Sheet
        title={`${verb} ${booking.name}`}
        description={`Les tables libres ce soir qui accueillent ${people(booking.partySize)}. Le prix payé ne change pas.`}
        onClose={onClose}
      >
        <div className="flex flex-col gap-5">
          {targets.length === 0 ? (
            <p className="rounded-g-card border border-dashed border-hairline px-4 py-6 text-center text-g-body text-muted">
              Aucune table libre n&rsquo;accueille ce groupe ce soir.
            </p>
          ) : (
            targets.map((group) => (
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
      {target && (
        <ConfirmSheet
          title={`${verb} vers ${tableName(target.zone.name, target.table.label)} ?`}
          text={
            from
              ? `${booking.name} (${people(booking.partySize)}) passe de ${from} à ${tableName(target.zone.name, target.table.label)}. ${from} redevient libre ; le prix payé ne change pas.`
              : `${booking.name} (${people(booking.partySize)}) est installé${booking.partySize > 1 ? "s" : ""} à ${tableName(target.zone.name, target.table.label)}. Le prix payé ne change pas.`
          }
          confirmLabel={verb}
          cancelLabel="Choisir une autre table"
          onClose={() => setTarget(null)}
          onConfirm={() => {
            const destination = target;
            setTarget(null);
            onConfirm(destination);
          }}
        />
      )}
    </>
  );
}

function BookingCard({
  booking,
  payments,
  table,
  zone,
  droits,
  gerant,
  placeTargets,
  startPlacing,
  slots,
  depositPercent,
  onPlaced,
  onClose,
}: {
  booking: ClubBooking;
  payments: ClubPayment[];
  table: ClubTable | null;
  zone: ClubZone;
  droits: Set<ClubDroit>;
  gerant: boolean;
  placeTargets: MoveTarget[];
  startPlacing: boolean;
  slots: ArrivalSlot[];
  depositPercent: number | null;
  onPlaced: (tableId: string) => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [asking, setAsking] = useState(false);
  /** Le geste en cours (« suivi », « table » ou l'id d'une part) : son bouton dit qu'il travaille. */
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"refund" | "cancel" | ClubPayment | null>(null);
  const [placing, setPlacing] = useState(false);
  const state = staffTableState(booking, true);
  const clubEntered = isClubEntered(booking);
  const holding = state === "prise";
  const closed = booking.status === "remboursee";
  const money = droits.has("acomptes");
  const remaining = booking.remainingCents;
  const online = refundableOnline(payments);
  const onlineTotal = online.reduce((sum, payment) => sum + payment.amountCents + payment.feeCents, 0);
  const fees = online.reduce((sum, payment) => sum + payment.feeCents, 0);
  const paid = payments.filter((payment) => payment.status === "payee");
  const groups = payersOf(payments);
  const payers = groups.filter((payer) => payer.totalCents > 0).length;
  const paidTotal = paid.reduce((sum, payment) => sum + payment.amountCents + payment.feeCents, 0);
  const paidFees = paid.reduce((sum, payment) => sum + payment.feeCents, 0);
  const next = nextGesture(booking, droits);
  const undo = undoGesture(booking, droits);
  const canPlace = droits.has("placer") && !holding && !closed && booking.status !== "partie";

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

  const name = table ? tableName(zone.name, table.label) : `À placer · ${zone.name}`;
  const place = (destination: { table: ClubTable; zone: ClubZone }, close: boolean) =>
    void run(
      "placer",
      async () => {
        await clubApi.placeBooking(booking, destination.table.id);
        onPlaced(destination.table.id);
      },
      `${booking.name} est à ${tableName(destination.zone.name, destination.table.label)}.`,
      close
    );

  // « Placer » depuis la liste des réservations à placer : le choix de la
  // table seul, sans la fiche dessous (deux feuilles ouvertes ensemble
  // s'empilent dans le mauvais ordre).
  if (startPlacing) {
    return (
      <PlaceSheet
        booking={booking}
        from={table ? name : null}
        targets={placeTargets}
        onClose={onClose}
        onConfirm={(destination) => place(destination, true)}
      />
    );
  }

  const working = busy !== null;
  const showPlace = canPlace && next?.kind !== "placer";
  const showCollect = droits.has("assise") && remaining > 0 && !(next?.kind === "step" && next.collect > 0);
  const showRefund = gerant && online.length > 0 && booking.status !== "partie";
  const showCancel = droits.has("reserver") && clubEntered && booking.status !== "partie";
  const showEdit = droits.has("reserver") && booking.status !== "partie";
  // Un acompte se demande sur une réservation saisie par le club, avant l'arrivée.
  const showDeposit =
    droits.has("reserver") && clubEntered && remaining > 0 && (booking.status === "en_attente" || booking.status === "payee");
  const others =
    !holding && !closed && (showEdit || showDeposit || showPlace || showCollect || undo !== null || showRefund || showCancel);
  const stepDone: Record<"arrivee" | "assise" | "partie", string> = {
    arrivee: `${booking.name} est entré${booking.partySize > 1 ? "s" : ""}.`,
    assise: `${name} : ${booking.name} installé${booking.partySize > 1 ? "s" : ""}.`,
    partie: `${name} libérée.`,
  };
  // Un seul geste en bas, celui qu'on attend du poste : la fiche reste
  // lisible au-dessus. Les autres gestes vivent dans la fiche, sous ses
  // données ; ce qui rend de l'argent passe toujours par une confirmation chiffrée.
  const footer = !next ? undefined : (
    <>
      {busy === "suivi" && <p>Un instant…</p>}
      <GlassButton
        variant="primary"
        className="min-w-0"
        disabled={working}
        onClick={() => {
          if (next.kind === "placer") {
            setPlacing(true);
            return;
          }
          const step = next.to;
          void run(
            "suivi",
            () => clubApi.setBookingStatus(booking, step, next.collect > 0),
            next.collect > 0 ? `${formatCents(next.collect)} encaissés. ${stepDone[step]}` : stepDone[step],
            true
          );
        }}
      >
        <span className="porte-libelle">{next.label}</span>
      </GlassButton>
    </>
  );

  return (
    <Sheet title={name} onClose={onClose} footer={footer}>
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-g-h2">{booking.name}</p>
            <p className="mt-1 text-g-body text-muted">
              {people(booking.partySize)}
              {table ? ` · ${table.seats} places` : ""}
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

        {money && booking.shared && payers > 1 && (
          <PayerRing
            label={table?.label ?? zone.name}
            seats={booking.partySize}
            priceCents={booking.priceCents}
            paidCents={booking.paidCents}
            payers={groups.filter((payer) => payer.totalCents > 0)}
          />
        )}

        {holding ? (
          <p className="text-g-body text-muted">
            Le client règle en ce moment sur la page du club
            {booking.holdExpiresAt ? `, place tenue jusqu'à ${formatClock(booking.holdExpiresAt)}` : ""}. Sans
            paiement, elle se libère d&rsquo;elle-même.
          </p>
        ) : money ? (
          <Progress booking={booking} deposit={depositOf(booking, payments)} />
        ) : null}

        {money && payments.length > 0 && (
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
                            {refunded && (closed ? " · remboursée" : " · part remboursée")}
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
                          {gerant && closed && payment.method === "en_ligne" && !refunded && (
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
            {money && (
              <Row label="Prix hors frais">
                <span className="font-semibold tabular-nums">{formatCents(booking.priceCents)}</span>
                {fees > 0 && (
                  <span className="block text-g-meta text-muted">
                    + <span className="tabular-nums">{formatCents(fees)}</span> de frais de service en ligne
                  </span>
                )}
              </Row>
            )}
            {booking.arrivalAt && <Row label="Arrivée prévue">{formatTime(booking.arrivalAt)}</Row>}
            {booking.depositRequestedCents !== null && (
              <Row label="Acompte demandé">
                <span className="font-semibold tabular-nums">{formatCents(booking.depositRequestedCents)}</span>
                <span className="block text-g-meta text-muted">Lien envoyé, en attente du client</span>
              </Row>
            )}
            <Row label="Réservée">
              {SOURCE_LABELS[booking.source]} à {formatClock(booking.createdAt)}
              <span className="block text-g-meta text-muted">Zone {zone.name}</span>
            </Row>
            {booking.arrivedAt && <Row label="Arrivée">{formatClock(booking.arrivedAt)}</Row>}
            {booking.seatedAt && <Row label="Installée">{formatClock(booking.seatedAt)}</Row>}
            {booking.leftAt && <Row label="Partie">{formatClock(booking.leftAt)}</Row>}
            {booking.email && <Row label="E-mail">{booking.email}</Row>}
            {booking.note && (
              <div className="px-4 py-3">
                <dt className="g-eyebrow">Note</dt>
                <dd className="mt-1.5 whitespace-pre-line text-g-body">{booking.note}</dd>
              </div>
            )}
          </dl>
        </Plate>

        {others && (
          <section aria-label="Autres actions" className="flex flex-col gap-2">
            <h3 className="g-eyebrow">Autres actions</h3>
            {showEdit && (
              <GlassButton disabled={working} onClick={() => setEditing(true)}>
                Modifier la réservation
              </GlassButton>
            )}
            {showDeposit && (
              <GlassButton disabled={working} onClick={() => setAsking(true)}>
                {booking.depositRequestedCents !== null ? "Renvoyer le lien de l'acompte" : "Demander un acompte"}
              </GlassButton>
            )}
            {showPlace && (
              <GlassButton disabled={working} onClick={() => setPlacing(true)}>
                {busy === "placer" ? "Un instant…" : table ? "Déplacer sur une autre table" : "Placer sur une table"}
              </GlassButton>
            )}
            {showCollect && (
              <GlassButton
                disabled={working}
                onClick={() => void run("encaisser", () => clubApi.collectRemaining(booking), `${name} : ${formatCents(remaining)} encaissés.`)}
              >
                {busy === "encaisser" ? "Encaissement…" : `Encaisser ${formatCents(remaining)}`}
              </GlassButton>
            )}
            {undo && (
              <GlassButton
                disabled={working}
                onClick={() => void run("retour", () => clubApi.setBookingStatus(booking, undo.to), UNDONE[undo.to])}
              >
                {busy === "retour" ? "Un instant…" : undo.label}
              </GlassButton>
            )}
            {showRefund && (
              <GlassButton variant="danger" disabled={working} onClick={() => setConfirm("refund")}>
                {busy === "table" ? "Remboursement…" : `Rembourser toute la table (${formatCents(onlineTotal)})`}
              </GlassButton>
            )}
            {showCancel && (
              <GlassButton variant="danger" disabled={working} onClick={() => setConfirm("cancel")}>
                Annuler la réservation
              </GlassButton>
            )}
          </section>
        )}

        {gerant && (
          <BookingHistory
            bookingId={booking.id}
            version={JSON.stringify([booking, payments.map((payment) => payment.status)])}
          />
        )}
      </div>

      {editing && (
        <EditSheet booking={booking} slots={slots} maxParty={table?.seats ?? null} onClose={() => setEditing(false)} />
      )}
      {asking && (
        <DepositSheet booking={booking} depositPercent={depositPercent} onClose={() => setAsking(false)} />
      )}
      {placing && (
        <PlaceSheet
          booking={booking}
          from={table ? name : null}
          targets={placeTargets}
          onClose={() => setPlacing(false)}
          onConfirm={(destination) => {
            setPlacing(false);
            place(destination, false);
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
            .join(" ; ")}. Chacun est remboursé sur sa carte et prévenu par e-mail ; ${table ? `la table ${name} redevient libre` : "la réservation est close"}.${
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
          text={`Sa part lui est rendue sur sa carte et il est prévenu par e-mail. La table reste réservée : il restera ${formatCents(remaining + confirm.amountCents)} à encaisser.`}
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
          text={`La réservation de ${booking.name} est annulée${table ? ` et la table ${name} redevient libre` : ""}.${
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
            void run("table", () => clubApi.cancelClubBooking(booking), "Réservation annulée.", true);
          }}
        />
      )}
    </Sheet>
  );
}

/** Modifier ce qui ne touche pas à l'argent : nom, contact, personnes, heure, note. */
function EditSheet({
  booking,
  slots,
  maxParty,
  onClose,
}: {
  booking: ClubBooking;
  slots: ArrivalSlot[];
  /** Les places de sa table ; null, à placer : la base borne à la plus grande table de la zone. */
  maxParty: number | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(booking.name);
  const [phone, setPhone] = useState(booking.phone ?? "");
  const [email, setEmail] = useState(booking.email ?? "");
  const [party, setParty] = useState(String(booking.partySize));
  const [arrival, setArrival] = useState(booking.arrivalAt);
  const [note, setNote] = useState(booking.note ?? "");
  const [saving, setSaving] = useState(false);
  const partyCount = Number(party);
  const partyError =
    Number.isInteger(partyCount) && partyCount >= 1 && (maxParty === null || partyCount <= maxParty)
      ? undefined
      : maxParty === null
        ? "Un nombre de personnes."
        : `Entre 1 et ${maxParty} personnes à cette table.`;
  const nameError = name.trim() ? undefined : "Indiquez le nom du client.";

  const submit = async () => {
    if (partyError || nameError) return;
    setSaving(true);
    try {
      await clubApi.updateBooking(booking, {
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        partySize: partyCount,
        note: note.trim() || null,
        arrivalAt: arrival,
      });
      toast.success(`Réservation de ${name.trim()} modifiée.`);
      onClose();
    } catch (error) {
      toast.error(describeError(error).message);
      setSaving(false);
    }
  };

  return (
    <Sheet
      title={`Modifier · ${booking.name}`}
      description="Le prix et les paiements ne changent pas."
      onClose={onClose}
      footer={
        <>
          <GlassButton onClick={onClose}>Annuler</GlassButton>
          <GlassButton variant="primary" disabled={saving || Boolean(partyError || nameError)} onClick={() => void submit()}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </GlassButton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Nom" required error={nameError}>
          <Input value={name} maxLength={CLUB_LIMITS.name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Téléphone">
            <Input type="tel" inputMode="tel" value={phone} maxLength={CLUB_LIMITS.phoneMax} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="E-mail">
            <Input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Personnes" error={partyError}>
            <Input numeric type="number" inputMode="numeric" min={1} value={party} onChange={(e) => setParty(e.target.value)} />
          </Field>
          <ArrivalField slots={slots} value={arrival} onChange={setArrival} />
        </div>
        <Field label="Note" hint="Visible de l'équipe seulement.">
          <Textarea value={note} maxLength={CLUB_LIMITS.note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </Field>
      </div>
    </Sheet>
  );
}

/**
 * Demander un acompte sur une réservation saisie par le club : le client
 * reçoit par e-mail le lien de sa page, où il le paie. Proposé : l'acompte
 * du club sur le prix de la table, sinon ce qu'il reste.
 */
function DepositSheet({
  booking,
  depositPercent,
  onClose,
}: {
  booking: ClubBooking;
  depositPercent: number | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const suggested =
    booking.depositRequestedCents ??
    (depositPercent !== null
      ? Math.min(Math.ceil((booking.priceCents * depositPercent) / 100), booking.remainingCents)
      : booking.remainingCents);
  const [amount, setAmount] = useState(eurosToInput(suggested));
  const [sending, setSending] = useState(false);
  const cents = parseEuros(amount);
  const error =
    cents !== null && cents >= 1 && cents <= booking.remainingCents
      ? undefined
      : `Entre 0,01 et ${formatCents(booking.remainingCents)}.`;

  const send = async () => {
    if (error || cents === null) return;
    setSending(true);
    try {
      await clubApi.requestDeposit(booking, cents);
      toast.success(`Lien de l'acompte envoyé à ${booking.email}.`);
      onClose();
    } catch (failure) {
      toast.error(describeError(failure).message);
      setSending(false);
    }
  };

  return (
    <Sheet
      title={booking.depositRequestedCents !== null ? "Renvoyer le lien de l'acompte" : "Demander un acompte"}
      description={
        booking.email
          ? `${booking.name} reçoit à ${booking.email} le lien de sa réservation, où il paie l'acompte en ligne. Le reste se règle sur place.`
          : "Ajoutez d'abord l'e-mail du client (Modifier la réservation)."
      }
      onClose={onClose}
      footer={
        <>
          <GlassButton onClick={onClose}>Annuler</GlassButton>
          <GlassButton variant="primary" disabled={sending || !booking.email || Boolean(error)} onClick={() => void send()}>
            {sending ? "Envoi…" : "Envoyer le lien"}
          </GlassButton>
        </>
      }
    >
      <Field label="Montant de l'acompte" error={error} hint={`Reste à régler sur cette table : ${formatCents(booking.remainingCents)}.`}>
        <EurosInput value={amount} onChange={setAmount} label="Montant de l'acompte" />
      </Field>
    </Sheet>
  );
}

/** Une réservation prise au téléphone ou au comptoir : sur une table, ou à placer dans une zone. */
function ReserveForm({
  event,
  targets,
  slots,
  tonight,
  onClose,
}: {
  event: ClubEvent;
  /** Une seule : la table touchée. Plusieurs : les zones où la réservation attendra sa table. */
  targets: ReserveTarget[];
  slots: ArrivalSlot[];
  tonight: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const [targetIndex, setTargetIndex] = useState(0);
  const target = targets[targetIndex];
  const [source, setSource] = useState<clubApi.ClubBookingInput["source"]>(tonight ? "sur_place" : "telephone");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [arrival, setArrival] = useState<string | null>(null);
  const [party, setParty] = useState(target.seats);
  const [paid, setPaid] = useState<"oui" | "non">("non");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const place = target.table ? tableName(target.zone.name, target.table.label) : target.zone.name;
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
        zoneId: target.zone.id,
        tableId: target.table?.id ?? null,
        name: name.trim(),
        phone: phoneTrim,
        email: email.trim(),
        arrivalAt: arrival,
        partySize: Math.min(party, target.seats),
        source,
        paid: paid === "oui",
        note: note.trim(),
      });
      toast.success(
        target.table ? `${place} réservée pour ${name.trim()}.` : `${name.trim()} réservé(e) en ${place}, à placer.`
      );
      onClose();
    } catch (error) {
      toast.error(describeError(error).message);
      setSaving(false);
    }
  };

  return (
    <Sheet
      title={target.table ? `Réserver ${place}` : "Nouvelle réservation"}
      description={`${target.table ? `${target.zone.name} · ${target.seats} places · ` : "À placer ensuite sur une table · "}${formatCents(target.price)}${
        target.zone.inclus ? ` · ${target.zone.inclus}` : ""
      }${target.table && !target.onSale ? " · gardée hors vente ce soir : seul le club peut la réserver." : ""}`}
      onClose={onClose}
      footer={
        <>
          {saving && <p>Réservation en cours…</p>}
          <GlassButton onClick={onClose}>Annuler</GlassButton>
          <GlassButton type="submit" form="reserver-table" variant="primary" disabled={saving}>
            Réserver
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

        {targets.length > 1 && (
          <Field label="Zone">
            <Select value={targetIndex} onChange={(e) => setTargetIndex(Number(e.target.value))}>
              {targets.map((candidate, index) => (
                <option key={candidate.zone.id} value={index}>
                  {candidate.zone.name} · {formatCents(candidate.price)}
                </option>
              ))}
            </Select>
          </Field>
        )}

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
            <Select value={Math.min(party, target.seats)} onChange={(e) => setParty(Number(e.target.value))}>
              {Array.from({ length: target.seats }, (_, index) => index + 1).map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="E-mail" hint="Pour lui envoyer plus tard le lien d'un acompte.">
          <Input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
        </Field>
        <ArrivalField slots={slots} value={arrival} onChange={setArrival} />

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

/**
 * Une table sans réservation : libre, gardée ou libérée. On y installe une
 * réservation à placer qui y tient, ou on y saisit une réservation.
 */
function FreeTable({
  event,
  table,
  zone,
  price,
  onSale,
  departed,
  tonight,
  droits,
  waiting,
  slots,
  onPlaced,
  onClose,
}: {
  event: ClubEvent;
  table: ClubTable;
  zone: ClubZone;
  price: number;
  onSale: boolean;
  departed: ClubBooking | undefined;
  tonight: boolean;
  slots: ArrivalSlot[];
  droits: Set<ClubDroit>;
  waiting: ClubBooking[];
  onPlaced: (tableId: string) => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const [reserving, setReserving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const name = tableName(zone.name, table.label);
  const open = !event.cancelledAt;
  const fitting = open && droits.has("placer") ? waiting.filter((booking) => booking.partySize <= table.seats) : [];

  if (reserving) {
    return (
      <ReserveForm
        event={event}
        targets={[{ zone, table, seats: table.seats, price, onSale }]}
        slots={slots}
        tonight={tonight}
        onClose={onClose}
      />
    );
  }

  const place = async (booking: ClubBooking) => {
    setBusy(booking.id);
    try {
      await clubApi.placeBooking(booking, table.id);
      toast.success(`${booking.name} est à ${name}.`);
      onPlaced(table.id);
    } catch (error) {
      toast.error(describeError(error).message);
      setBusy(null);
    }
  };

  return (
    <Sheet
      title={name}
      onClose={onClose}
      footer={
        open && droits.has("reserver") ? (
          <GlassButton variant={fitting.length > 0 ? "secondary" : "primary"} onClick={() => setReserving(true)}>
            Réserver cette table
          </GlassButton>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <p className="font-display text-g-h2">{departed ? "Libérée" : onSale ? "Libre" : "Gardée, hors vente"}</p>
          <p className="text-g-body text-muted">
            {table.seats} places · {formatCents(price)}
            {zone.inclus ? ` · ${zone.inclus}` : ""}
          </p>
          {departed?.leftAt && (
            <p className="text-g-body text-muted">
              Départ de {departed.name} à {formatClock(departed.leftAt)}.
            </p>
          )}
        </div>
        {fitting.length > 0 && (
          <section aria-label="À placer ici" className="flex flex-col gap-2">
            <h3 className="g-eyebrow">À placer ici</h3>
            <Plate>
              <ul className="divide-y divide-hairline">
                {fitting.map((booking) => (
                  <li key={booking.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate text-g-body font-medium">{booking.name}</span>
                      <span className="block text-g-meta text-muted">{people(booking.partySize)}</span>
                    </span>
                    <GlassButton disabled={busy !== null} onClick={() => void place(booking)}>
                      {busy === booking.id ? "Un instant…" : "Placer ici"}
                    </GlassButton>
                  </li>
                ))}
              </ul>
            </Plate>
          </section>
        )}
        {open && !droits.has("reserver") && fitting.length === 0 && (
          <p className="text-g-body text-muted">La direction saisit les réservations prises au téléphone ou à la porte.</p>
        )}
      </div>
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
  departed,
  tonight,
  droits,
  gerant,
  placeTargets,
  waiting,
  startPlacing = false,
  slots,
  depositPercent,
  onPlaced,
  onClose,
}: {
  event: ClubEvent;
  /** Les créneaux d'arrivée de la soirée. */
  slots: ArrivalSlot[];
  /** L'acompte du club en %, proposé quand on en demande un. */
  depositPercent: number | null;
  /** Null : une réservation à placer. */
  table: ClubTable | null;
  zone: ClubZone;
  booking: ClubBooking | undefined;
  /** Les paiements de la réservation (parts en ligne, encaissements sur place). */
  payments: ClubPayment[];
  price: number;
  onSale: boolean;
  /** Le dernier départ d'une table libre ce soir : elle est libérée. */
  departed?: ClubBooking;
  tonight: boolean;
  droits: Set<ClubDroit>;
  /** Rembourser passe par le serveur, réservé à la direction. */
  gerant: boolean;
  /** Tables libres ce soir qui accueillent le groupe, zone par zone : où la réservation peut aller. */
  placeTargets: MoveTarget[];
  /** Les réservations à placer, proposées sur une table libre. */
  waiting: ClubBooking[];
  /** Ouvre directement le choix de la table. */
  startPlacing?: boolean;
  /** La réservation a changé de table : la fiche la suit. */
  onPlaced: (tableId: string) => void;
  onClose: () => void;
}) {
  if (booking) {
    return (
      <BookingCard
        booking={booking}
        payments={payments}
        table={table}
        zone={zone}
        droits={droits}
        gerant={gerant}
        placeTargets={placeTargets}
        startPlacing={startPlacing}
        slots={slots}
        depositPercent={depositPercent}
        onPlaced={onPlaced}
        onClose={onClose}
      />
    );
  }
  if (!table) return null;
  return (
    <FreeTable
      event={event}
      table={table}
      zone={zone}
      price={price}
      onSale={onSale}
      departed={departed}
      tonight={tonight}
      droits={droits}
      waiting={waiting}
      slots={slots}
      onPlaced={onPlaced}
      onClose={onClose}
    />
  );
}

/** Une réservation prise au téléphone, sans table encore : elle attend dans sa zone. */
export function NewBookingSheet({
  event,
  targets,
  slots,
  tonight,
  onClose,
}: {
  event: ClubEvent;
  targets: ReserveTarget[];
  slots: ArrivalSlot[];
  tonight: boolean;
  onClose: () => void;
}) {
  if (targets.length === 0) return null;
  return <ReserveForm event={event} targets={targets} slots={slots} tonight={tonight} onClose={onClose} />;
}
