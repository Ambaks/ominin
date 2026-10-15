"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PaymentDialog } from "@/components/gestion/commandes/payment-dialog";
import { PaymentPinDialog } from "@/components/gestion/commandes/payment-pin-dialog";
import { FeatureLocked } from "@/components/gestion/feature-locked";
import { PickupOrderDialog } from "@/components/gestion/retraits/pickup-order-dialog";
import { ProductionList } from "@/components/gestion/retraits/production-list";
import { RetraitCard } from "@/components/gestion/retraits/retrait-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PillTabs } from "@/components/ui/pill-tabs";
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
import { formatPrice } from "@/lib/menu-data";

type View = "commandes" | "production";

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
  const [paying, setPaying] = useState<{ order: Order; code: string } | null>(null);
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

  const requestHandOver = (order: Order) => {
    if (!state.etablissement.paymentPinSet) {
      toast.error(
        role === "gerant"
          ? "Définissez d'abord le code d'encaissement, dans Établissement."
          : "Le code d'encaissement n'est pas encore défini : demandez au gérant."
      );
      return;
    }
    setAuthorizing(order);
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
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight lg:text-3xl">
            Retraits
          </h1>
          <p className="mt-1 text-sm text-muted">
            {role === "cuisinier"
              ? "Ce qu'il reste à préparer, jour par jour."
              : "Les commandes à emporter, jour par jour."}
          </p>
        </div>
        {takesOrders && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background"
          >
            Nouvelle commande
          </button>
        )}
      </div>

      {takesOrders && !state.etablissement.paymentPinSet && (
        <p className="rounded-2xl border border-ember-2/40 bg-ember-2/10 px-4 py-3 text-sm leading-relaxed print:hidden">
          {role === "gerant" ? (
            <>
              Les commandes prises au comptoir se règlent au retrait : définissez le
              code d&apos;encaissement dans{" "}
              <Link href="/gestion/etablissement" className="font-semibold text-ember-1 underline-offset-2 hover:underline">
                Établissement
              </Link>{" "}
              pour que l&apos;équipe puisse les encaisser.
            </>
          ) : (
            "Le code d'encaissement n'est pas encore défini : demandez au gérant, sans lui les commandes réglées au retrait ne s'encaissent pas."
          )}
        </p>
      )}

      {takesOrders && freshTotal > 0 && (
        <button
          type="button"
          // Au premier jour qui en compte une ; celle d'un jour passé attend sous « Pas encore retirées ».
          onClick={() => {
            setChosenDay([...fresh.keys()].sort()[0]);
            setChosenView("commandes");
            // Le jour affiché, la première commande à prendre en charge vient à l'écran.
            requestAnimationFrame(() =>
              document.querySelector("[data-retrait-new]")?.scrollIntoView({ block: "center" })
            );
          }}
          className="flex min-h-11 items-center gap-2.5 self-start rounded-2xl border border-ember-2/40 bg-ember-2/10 px-4 py-2 text-left text-sm font-medium transition-colors hover:border-ember-2/70 print:hidden"
        >
          <span aria-hidden className="size-2 shrink-0 rounded-full bg-ember-3" />
          {`${freshTotal} nouvelle${freshTotal > 1 ? "s" : ""} commande${freshTotal > 1 ? "s" : ""} du site à prendre en charge`}
        </button>
      )}

      <div className="flex flex-col gap-3 print:hidden">
        <div
          ref={stripRef}
          role="group"
          aria-label="Jour de retrait"
          // Le bord droit s'efface : la bande se poursuit au doigt ou à la molette.
          // Un jour ramené en vue s'arrête à la marge du contenu, et avant ce fondu.
          className="no-scrollbar -mx-5 flex scroll-pl-5 scroll-pr-12 gap-2 overflow-x-auto px-5 pb-1 [mask-image:linear-gradient(to_right,black_calc(100%-3rem),transparent)] lg:mx-0 lg:scroll-pl-0 lg:px-0"
        >
          {strip.map((candidate) => {
            const active = candidate === day;
            const count = counts.get(candidate) ?? 0;
            const freshCount = fresh.get(candidate) ?? 0;
            const shut = !(state.etablissement.openingHours?.[String(isoDayOf(candidate))]?.length);
            const tile = dayTile(candidate, today);
            return (
              <button
                key={candidate}
                type="button"
                aria-pressed={active}
                aria-label={`${formatDayLong(candidate)}${shut ? ", fermé" : ""}, ${count} retrait${count > 1 ? "s" : ""} à remettre${
                  freshCount > 0
                    ? `, dont ${freshCount} nouvelle${freshCount > 1 ? "s" : ""} commande${freshCount > 1 ? "s" : ""}`
                    : ""
                }`}
                onClick={() => setChosenDay(candidate)}
                className={`relative flex w-14 shrink-0 flex-col items-center gap-0.5 rounded-2xl py-2.5 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-2 ${
                  active
                    ? "ember-gradient text-background"
                    : count > 0
                      ? "border border-ember-2/40 text-foreground hover:border-ember-2/70"
                      : "border border-hairline text-muted hover:border-ember-2/40 hover:text-foreground"
                }`}
              >
                {freshCount > 0 && (
                  <span
                    aria-hidden
                    className={`absolute right-1.5 top-1.5 size-2 rounded-full ${active ? "bg-background" : "bg-ember-3"}`}
                  />
                )}
                <span className="text-[10px] font-semibold uppercase tracking-wider">
                  {tile.weekday}
                </span>
                <span className="font-display text-xl leading-none tabular-nums">{tile.date}</span>
                <span
                  className={`mt-0.5 h-4 text-[10px] font-semibold tabular-nums ${
                    active ? "" : count > 0 ? "text-ember-2" : "text-faint"
                  }`}
                >
                  {count > 0 ? count : shut ? "fermé" : ""}
                </span>
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-2 self-start text-sm text-muted">
          Autre jour
          <input
            type="date"
            value={day}
            min={today}
            onChange={(event) => {
              if (event.target.value) setChosenDay(event.target.value);
            }}
            className="rounded-xl border border-hairline bg-background px-3 py-2 text-base outline-none transition-colors focus:border-ember-2/50 lg:pointer-fine:text-sm"
          />
        </label>
      </div>

      {overdue.length > 0 && view === "commandes" && (
        <section aria-labelledby="retraits-retard" className="flex flex-col gap-3 print:hidden">
          <h2 id="retraits-retard" className="text-sm font-semibold text-ember-3">
            Pas encore retirées ({overdue.length})
          </h2>
          {overdue.map((order) => (
            <RetraitCard key={order.id} order={order} today={today} showDay onHandOver={requestHandOver} />
          ))}
        </section>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <h2 className="font-display text-xl font-medium first-letter:uppercase">{formatDayLong(day)}</h2>
        <PillTabs
          tabs={[
            { id: "commandes", label: "Retraits", count: open.length || undefined },
            { id: "production", label: "À produire" },
          ]}
          activeId={view}
          onSelect={(id) => setChosenView(id as View)}
        />
      </div>

      {role === "gerant" && summary.count > 0 && view === "commandes" && (
        <div className="flex flex-col gap-2 print:hidden">
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              {
                label: "Retraits du jour",
                value: formatPrice(summary.total),
                // Remises comprises, annulées exclues ; les pastilles ne comptent que celles à remettre.
                hint: `${summary.count} retrait${summary.count > 1 ? "s" : ""}${
                  open.length > 0 ? ` · ${open.length} à remettre` : ""
                }`,
              },
              { label: "Payé en ligne", value: formatPrice(summary.paidOnline), hint: "à la commande" },
              { label: "Encaissé au comptoir", value: formatPrice(summary.paidAtCounter), hint: "au retrait" },
              { label: "Reste à encaisser", value: formatPrice(summary.due), hint: "au retrait" },
            ].map((tile) => (
              <div key={tile.label} className="rounded-2xl border border-hairline bg-surface px-4 py-3">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-faint">
                  {tile.label}
                </dt>
                <dd className="mt-1 font-display text-xl tabular-nums">{tile.value}</dd>
                <dd className="text-xs text-muted">{tile.hint}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-muted">
            Ce que valent les retraits de ce jour, quel que soit le jour du paiement.
            L&apos;argent encaissé chaque jour est dans Paiements.
          </p>
        </div>
      )}

      {ofDay.length === 0 ? (
        <EmptyState
          title="Aucun retrait ce jour-là"
          body={
            takesOrders
              ? "Les commandes du site et celles prises au comptoir ou au téléphone apparaîtront ici, à leur heure de retrait."
              : "Les commandes de ce jour apparaîtront ici dès qu'elles seront passées."
          }
        />
      ) : view === "production" ? (
        <ProductionList orders={ofDay} title={formatDayLong(day)} shopName={state.etablissement.name} />
      ) : (
        <div className="flex flex-col gap-3">
          {open.length === 0 && (
            <p className="rounded-2xl border border-dashed border-hairline px-5 py-6 text-center text-sm text-muted">
              Tout est remis pour ce jour-là.
            </p>
          )}
          {open.map((order) => (
            <RetraitCard key={order.id} order={order} today={today} onHandOver={requestHandOver} />
          ))}
          {closed.length > 0 && (
            <>
              <button
                type="button"
                aria-expanded={showClosed}
                onClick={() => setShowClosed((shown) => !shown)}
                className="self-start rounded-full px-1 py-2 text-sm font-semibold text-muted transition-colors hover:text-foreground"
              >
                {showClosed ? "Masquer" : "Voir"} les remises et annulations ({closed.length})
              </button>
              {showClosed &&
                closed.map((order) => (
                  <RetraitCard key={order.id} order={order} today={today} onHandOver={requestHandOver} />
                ))}
            </>
          )}
        </div>
      )}

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
