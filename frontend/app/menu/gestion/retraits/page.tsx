"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PaymentDialog } from "@/components/gestion/commandes/payment-dialog";
import { PaymentPinDialog } from "@/components/gestion/commandes/payment-pin-dialog";
import { FeatureLocked } from "@/components/gestion/feature-locked";
import { BagIcon, ClockIcon } from "@/components/gestion/icons";
import { describeError } from "@/lib/gestion/errors";
import { CashIcon, CoinsIcon, OnlineIcon } from "@/components/gestion/paiements/icons";
import { PickupOrderDialog } from "@/components/gestion/retraits/pickup-order-dialog";
import { ProductionList } from "@/components/gestion/retraits/production-list";
import { RetraitCard } from "@/components/gestion/retraits/retrait-card";
import {
  Chip,
  EmptyState,
  GlassButton,
  Input,
  Notice,
  SectionHeading,
  Segmented,
  StatTile,
} from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import { formatDayLong, isoDayOf, parisDate, shiftDay } from "@/lib/collect/hours";
import * as api from "@/lib/gestion/api";
import { RETRAITS_DAYS_SHOWN, WAIT_TICK_MS } from "@/lib/gestion/constants";
import {
  amountDue,
  daySummary,
  dayTile,
  isPickupOpen,
  newCountByDay,
  openCountByDay,
  ordersOfDay,
  overdueOrders,
  pickupOrders,
} from "@/lib/gestion/retraits";
import { isPickupShop } from "@/lib/gestion/selectors";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import type { CashDetails, EncaissementMode, Order } from "@/lib/gestion/types";
import { useNow } from "@/lib/gestion/use-now";
import { formatPrice } from "@/lib/menu/format";

type View = "commandes" | "production";

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? "s" : ""}`;

function Block({ i, className = "", children }: { i: number; className?: string; children: React.ReactNode }) {
  return (
    <div className={`g-rise ${className}`} style={{ "--g-i": i } as CSSProperties}>
      {children}
    </div>
  );
}

/*
 * Retraits : le click & collect jour par jour. Le comptoir y voit qui passe
 * et quand, ce qui est payé et ce qui reste à encaisser ; il y prend les
 * commandes du téléphone. Le laboratoire y lit ce qu'il doit sortir. Le
 * gérant y voit en plus ce que la journée représente.
 */
export default function RetraitsPage() {
  const state = useGestion();
  const { hasFeature } = useGestionAccess();
  const toast = useToast();
  const now = useNow(WAIT_TICK_MS);
  const today = parisDate(now);
  const [chosenDay, setChosenDay] = useState<string | null>(null);
  const [chosenView, setChosenView] = useState<View | null>(null);
  const [creating, setCreating] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const [authorizing, setAuthorizing] = useState<Order | null>(null);
  const [paying, setPaying] = useState<{ order: Order; code: string | null } | null>(null);
  // Le jour choisi se montre en entier dans la bande, qu'il vienne d'un doigt,
  // du calendrier ou d'une commande enregistrée pour plus tard.
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    stripRef.current
      ?.querySelector<HTMLElement>('[aria-pressed="true"]')
      ?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [chosenDay]);

  if (!state) return null;
  if (!hasFeature("retraits")) return <FeatureLocked feature="retraits" />;

  const role = state.role;
  // Le laboratoire lit sa feuille ; le comptoir et le gérant, leurs retraits.
  const view: View = chosenView ?? (role === "cuisinier" ? "production" : "commandes");
  // Un jour passé n'a plus rien à proposer : minuit franchi, on revient à aujourd'hui.
  const day = chosenDay && chosenDay >= today ? chosenDay : today;
  const takesOrders = role === "gerant" || role === "serveur";

  const pickups = pickupOrders(state.orders);
  const counts = openCountByDay(pickups);
  // Boutique à emporter seule : la pastille de Retraits compte les commandes du
  // site à prendre en charge, tous jours confondus — la page dit où elles sont.
  const fresh = isPickupShop(state) ? newCountByDay(pickups) : new Map<string, number>();
  const freshTotal = [...fresh.values()].reduce((sum, count) => sum + count, 0);
  const ofDay = ordersOfDay(pickups, day);
  const open = ofDay.filter(isPickupOpen);
  const closed = ofDay.filter((order) => !isPickupOpen(order));
  const overdue = day === today ? overdueOrders(pickups, today) : [];
  const summary = daySummary(ofDay);
  const strip = Array.from({ length: RETRAITS_DAYS_SHOWN }, (_, index) => shiftDay(today, index));
  // Un jour choisi au calendrier, plus loin que la bande : il s'y ajoute.
  if (!strip.includes(day)) strip.push(day);
  const dayLabel = capitalize(formatDayLong(day));
  const showSummary = role === "gerant" && summary.count > 0 && view === "commandes";
  // Sous le titre du jour : ce qu'il reste à remettre, et pour le gérant au
  // téléphone, où les tuiles n'ont pas leur place, la journée en une ligne.
  const daySub = [
    open.length > 0 ? `${open.length} à remettre` : ofDay.length > 0 ? "tout est remis" : undefined,
    showSummary ? formatPrice(summary.total) : undefined,
    showSummary && summary.due > 0 ? `${formatPrice(summary.due)} à encaisser` : undefined,
  ]
    .filter(Boolean)
    .join(" · ") || undefined;

  const requestHandOver = (order: Order) => {
    if (state.etablissement.paymentPinSet) setAuthorizing(order);
    else setPaying({ order, code: null });
  };

  const settle = async (mode: EncaissementMode, cashDetails?: CashDetails) => {
    if (!paying) return;
    const { order, code } = paying;
    setPaying(null);
    try {
      await api.payOrderItems(
        order.items
          .filter((line) => !line.paidMode)
          .map((line) => ({ itemId: line.id, quantity: line.quantity })),
        mode,
        code,
        cashDetails
      );
      toast.success(
        `Commande de ${order.customerName ?? "client"} encaissée et remise.${
          cashDetails?.cashChange ? ` Rendre ${formatPrice(cashDetails.cashChange)}.` : ""
        }`
      );
    } catch (error) {
      toast.error(describeError(error).message);
    }
  };

  const jumpToFresh = () => {
    // Au premier jour qui en compte une ; celle d'un jour passé attend sous « Pas encore retirées ».
    setChosenDay([...fresh.keys()].sort()[0]);
    setChosenView("commandes");
    // Le jour affiché, la première commande à prendre en charge vient à l'écran.
    requestAnimationFrame(() =>
      document.querySelector("[data-retrait-new]")?.scrollIntoView({ block: "center" })
    );
  };

  return (
    <div className="grid gap-5">
      <Block i={0} className="print:hidden">
        <SectionHeading
          level={1}
          title="Retraits"
          sub={role === "cuisinier" ? "Ce qu'il reste à préparer, jour par jour" : undefined}
          right={
            takesOrders ? (
              <GlassButton variant="primary" onClick={() => setCreating(true)}>
                Nouvelle commande
              </GlassButton>
            ) : undefined
          }
        />
      </Block>

      {takesOrders && freshTotal > 0 && (
        <Block i={1} className="print:hidden">
          <Notice
            tone="info"
            icon={<BagIcon />}
            title={plural(freshTotal, "nouvelle commande")}
            text="du site, à prendre en charge"
            action={
              <GlassButton variant="primary" onClick={jumpToFresh}>
                Voir
              </GlassButton>
            }
          />
        </Block>
      )}

      <Block i={2} className="flex items-center gap-3 print:hidden">
        <div
          ref={stripRef}
          role="group"
          aria-label="Jour de retrait"
          // Le bord droit s'efface : la bande se poursuit au doigt ou à la molette ;
          // la dernière tuile s'arrête avant le fondu.
          className="no-scrollbar -m-1 flex min-w-0 flex-1 basis-0 gap-2 overflow-x-auto overscroll-x-contain scroll-pr-12 p-1 pr-12 [mask-image:linear-gradient(to_right,black_calc(100%-3rem),transparent)]"
        >
          {strip.map((candidate) => {
            const active = candidate === day;
            const count = counts.get(candidate) ?? 0;
            const freshCount = fresh.get(candidate) ?? 0;
            const shut = !state.etablissement.openingHours?.[String(isoDayOf(candidate))]?.length;
            const tile = dayTile(candidate, today);
            return (
              <button
                key={candidate}
                type="button"
                aria-pressed={active}
                aria-label={`${formatDayLong(candidate)}${shut ? ", fermé" : ""}, ${plural(count, "retrait")} à remettre${
                  freshCount > 0 ? `, dont ${plural(freshCount, "nouvelle commande")}` : ""
                }`}
                onClick={() => setChosenDay(candidate)}
                className={`g-press relative flex w-14 shrink-0 flex-col items-center gap-0.5 rounded-g-card border py-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-1 ${
                  active
                    ? "ember-gradient border-transparent text-background"
                    : count > 0
                      ? "border-ember-2/40 bg-surface/70 text-foreground"
                      : "border-hairline bg-surface/70 text-muted"
                }`}
              >
                {freshCount > 0 && (
                  <span
                    aria-hidden
                    className={`absolute right-1.5 top-1.5 size-2 rounded-full ${active ? "bg-background" : "bg-ember-3"}`}
                  />
                )}
                <span className="text-g-axis font-semibold uppercase tracking-wider">{tile.weekday}</span>
                <span className="text-g-h2 tabular-nums">{tile.date}</span>
                <span
                  className={`mt-0.5 h-4 text-g-label font-semibold tabular-nums ${
                    active ? "" : count > 0 ? "text-ember-2" : "text-muted"
                  }`}
                >
                  {count > 0 ? count : shut ? "fermé" : ""}
                </span>
              </button>
            );
          })}
        </div>
        <label className="flex shrink-0 items-center gap-2 text-g-label text-muted">
          <span className="max-sm:sr-only">Autre jour</span>
          <Input
            type="date"
            aria-label="Autre jour"
            value={day}
            min={today}
            onChange={(event) => {
              if (event.target.value) setChosenDay(event.target.value);
            }}
          />
        </label>
      </Block>

      {overdue.length > 0 && view === "commandes" && (
        <Block i={3} className="grid gap-3 print:hidden">
          <SectionHeading
            id="retraits-retard"
            title="Pas encore retirées"
            right={
              <Chip tone="problem" icon={<ClockIcon />}>
                {plural(overdue.length, "retrait")} en retard
              </Chip>
            }
          />
          <section aria-labelledby="retraits-retard" className="grid gap-3">
            {overdue.map((order) => (
              <RetraitCard key={order.id} order={order} today={today} showDay onHandOver={requestHandOver} />
            ))}
          </section>
        </Block>
      )}

      <Block i={4} className="grid gap-5">
        <div className="print:hidden">
          <SectionHeading
            title={dayLabel}
            sub={daySub}
            right={
              <Segmented
                label="Vue"
                options={[
                  { value: "commandes", label: "Retraits" },
                  { value: "production", label: "À produire" },
                ]}
                value={view}
                onChange={setChosenView}
              />
            }
          />
        </div>

        {/* Sur téléphone, la journée du gérant tient dans le sous-titre du
            jour : la première commande à traiter vient d'abord (§ 2.7). */}
        {showSummary && (
          <div className="grid gap-g-gap print:hidden max-sm:hidden sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              entity="money"
              icon={<CoinsIcon />}
              label="Retraits du jour"
              value={formatPrice(summary.total)}
              // Remises comprises, annulées exclues ; les pastilles ne comptent que celles à remettre.
              baseline={`${plural(summary.count, "retrait")}${open.length > 0 ? ` · ${open.length} à remettre` : ""}`}
              title="Ce que valent les retraits de ce jour, quel que soit le jour du paiement. L'argent encaissé chaque jour est dans Paiements."
            />
            <StatTile
              entity="money"
              icon={<OnlineIcon />}
              label="Payé en ligne"
              value={formatPrice(summary.paidOnline)}
              baseline="à la commande"
              title="Réglé sur le site au moment de la commande"
            />
            <StatTile
              entity="money"
              icon={<CashIcon />}
              label="Encaissé au comptoir"
              value={formatPrice(summary.paidAtCounter)}
              baseline="au retrait"
              title="Réglé au comptoir à la remise, quel que soit le jour"
            />
            <StatTile
              entity="money"
              icon={<ClockIcon />}
              label="Reste à encaisser"
              value={formatPrice(summary.due)}
              baseline="au retrait"
              title="Ce que les clients régleront en passant"
            />
            <p className="text-g-meta text-muted sm:col-span-2 xl:col-span-4">
              Ce que valent les retraits de ce jour, quel que soit le jour du paiement ; l&apos;argent encaissé
              chaque jour est dans Paiements.
            </p>
          </div>
        )}

        {ofDay.length === 0 ? (
          <EmptyState
            text={
              takesOrders
                ? "Aucun retrait ce jour-là : les commandes du site et celles prises au comptoir ou au téléphone apparaîtront ici, à leur heure."
                : "Aucun retrait ce jour-là : les commandes apparaîtront ici dès qu'elles seront passées."
            }
            action={
              takesOrders ? (
                <GlassButton onClick={() => setCreating(true)}>Nouvelle commande</GlassButton>
              ) : undefined
            }
          />
        ) : view === "production" ? (
          <ProductionList orders={ofDay} title={formatDayLong(day)} shopName={state.etablissement.name} />
        ) : (
          <div className="grid gap-3">
            {open.length === 0 && (
              <EmptyState
                text={
                  closed.some((order) => order.status === "retiree")
                    ? "Tout est remis pour ce jour-là."
                    : "Rien à remettre : les commandes de ce jour sont annulées."
                }
              />
            )}
            {open.map((order) => (
              <RetraitCard key={order.id} order={order} today={today} onHandOver={requestHandOver} />
            ))}
            {closed.length > 0 && (
              <>
                <GlassButton
                  className="justify-self-start"
                  aria-expanded={showClosed}
                  onClick={() => setShowClosed((shown) => !shown)}
                >
                  {showClosed ? "Masquer" : "Voir"} les remises et annulations ({closed.length})
                </GlassButton>
                {showClosed &&
                  closed.map((order) => (
                    <RetraitCard key={order.id} order={order} today={today} onHandOver={requestHandOver} />
                  ))}
              </>
            )}
          </div>
        )}
      </Block>

      {creating && (
        <PickupOrderDialog
          state={state}
          initialDay={day}
          onCreated={(createdDay) => {
            setChosenDay(createdDay);
            setChosenView("commandes");
          }}
          onClose={() => setCreating(false)}
        />
      )}

      {authorizing && (
        <PaymentPinDialog
          onClose={() => setAuthorizing(null)}
          onAuthorized={(code) => {
            setPaying({ order: authorizing, code });
            setAuthorizing(null);
          }}
        />
      )}

      {paying && (
        <PaymentDialog
          total={amountDue(paying.order)}
          tips={false}
          onClose={() => setPaying(null)}
          onSelect={(mode, cashDetails) => void settle(mode, cashDetails)}
        />
      )}
    </div>
  );
}
