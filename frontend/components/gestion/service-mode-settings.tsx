"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { Toggle } from "@/components/ui/toggle";
import { setBarPickup, setServiceMode, setShowTableNumber } from "@/lib/gestion/api";
import type { ServiceMode } from "@/lib/gestion/types";
import { menuSiteUrl } from "@/lib/site";

/*
 * Type de service (gérant). Restaurant : chaque table a son QR, la salle
 * apporte la commande. Fast food : depuis le QR du comptoir ou ceux des
 * tables restés en place, le client repart avec un numéro du jour et suit sa
 * commande jusqu'à « Prête » — les écrans des tables se retirent de
 * l'espace. La table du QR reste notée ; l'équipe ne la voit à côté du
 * numéro que si le gérant l'affiche. Au bar, la commande prête montre au
 * client un code que l'équipe scanne pour la lui remettre (/gestion/remise),
 * et le menu dit « bar » au lieu de « comptoir ». Le menu public suit à sa
 * prochaine revalidation (une minute) ; une carte déjà ouverte garde l'ancien
 * mode jusqu'à ce qu'on la recharge — le gérant en est prévenu.
 */

const MODES: {
  id: ServiceMode;
  label: string;
  tagline: string;
  body: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "restaurant",
    label: "Restaurant",
    tagline: "Service à table",
    body: "Un QR code par table. La commande arrive avec son numéro de table, la salle l'apporte.",
    icon: (
      <path d="M4 10h16M6 10v9M18 10v9M8 6h8M12 6v4" />
    ),
  },
  {
    id: "fast_food",
    label: "Fast food",
    tagline: "Commande au comptoir",
    body: "Un QR code au comptoir, ou ceux des tables. Le client reçoit un numéro et suit sa commande sur son téléphone jusqu'à « Prête ».",
    icon: (
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6" />
    ),
  },
];

export function ServiceModeSettings({
  initialMode,
  initialShowTable,
  initialBarPickup,
  slug,
  resetHour,
}: {
  initialMode: ServiceMode;
  initialShowTable: boolean;
  initialBarPickup: boolean;
  slug: string;
  /** Heure où les numéros repartent de 1 ; inconnue, elle n'est pas annoncée. */
  resetHour: number | null;
}) {
  const toast = useToast();
  const [mode, setMode] = useState(initialMode);
  const [showTable, setShowTable] = useState(initialShowTable);
  const [barPickup, setBar] = useState(initialBarPickup);
  const [busy, setBusy] = useState(false);

  const choose = async (next: ServiceMode) => {
    if (next === mode || busy) return;
    setBusy(true);
    const previous = mode;
    setMode(next);
    try {
      await setServiceMode(next);
      toast.success(
        next === "fast_food"
          ? "Fast food activé\u00a0: chaque commande reçoit un numéro."
          : "Restaurant activé\u00a0: la commande se fait depuis la table."
      );
    } catch (error) {
      setMode(previous);
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleShowTable = async (next: boolean) => {
    setBusy(true);
    setShowTable(next);
    try {
      await setShowTableNumber(next);
      toast.success(
        next
          ? "La table s'affiche à côté du numéro."
          : "Seul le numéro de commande s'affiche."
      );
    } catch (error) {
      setShowTable(!next);
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleBarPickup = async (next: boolean) => {
    setBusy(true);
    setBar(next);
    try {
      await setBarPickup(next);
      toast.success(
        next
          ? "Retrait au bar activé\u00a0: le client montre son code au bar."
          : "Retrait au comptoir\u00a0: le client vient sur son numéro."
      );
    } catch (error) {
      setBar(!next);
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex max-w-xl flex-col gap-5 rounded-2xl border border-hairline bg-surface p-5 lg:p-6">
      <div>
        <h2 className="font-display text-lg font-medium">Type de service</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Comment vos clients commandent depuis le menu en ligne. Le menu suit
          votre choix en une minute&nbsp;; un client qui l&rsquo;avait déjà
          ouvert le recharge.
        </p>
      </div>
      <div
        role="radiogroup"
        aria-label="Type de service"
        data-visite="etablissement-service"
        className="grid gap-3 rounded-2xl sm:grid-cols-2"
      >
        {MODES.map((option) => {
          const selected = mode === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={busy}
              onClick={() => void choose(option.id)}
              className={`flex flex-col gap-2 rounded-2xl border p-4 text-left transition-colors disabled:cursor-wait ${
                selected
                  ? "border-ember-2/60 bg-surface-raised"
                  : "border-hairline hover:border-ember-2/30"
              }`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2.5">
                  <svg
                    viewBox="0 0 24 24"
                    className={`size-5 ${selected ? "text-ember-1" : "text-muted"}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    {option.icon}
                  </svg>
                  <span className="font-display text-base font-medium">
                    {option.label}
                  </span>
                </span>
                <span
                  aria-hidden
                  className={`flex size-5 items-center justify-center rounded-full border ${
                    selected ? "border-ember-2" : "border-hairline"
                  }`}
                >
                  {selected && <span className="ember-gradient size-2.5 rounded-full" />}
                </span>
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
                {option.tagline}
              </span>
              <span className="text-xs leading-relaxed text-muted">{option.body}</span>
            </button>
          );
        })}
      </div>
      {mode === "fast_food" && (
        <div className="flex flex-col gap-1.5 rounded-xl border border-hairline px-4 py-3 text-xs leading-relaxed text-muted">
          <p>
            Un QR code sans table ({barPickup ? "au bar" : "au comptoir"}, une affiche) pointe vers{" "}
            <a
              href={`${menuSiteUrl}/m/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all font-semibold text-foreground underline decoration-hairline underline-offset-2"
            >
              {`${menuSiteUrl.replace(/^https?:\/\//, "")}/m/${slug}`}
            </a>
            , sans numéro de table.
          </p>
          <p>
            Les commandes payées arrivent dans «&nbsp;À servir&nbsp;» par
            numéro&nbsp;: «&nbsp;Prête&nbsp;» prévient le client, «&nbsp;Remettre&nbsp;»
            {barPickup && ", ou le scan de son code,"} la clôt.
            {resetHour !== null &&
              ` Les numéros repartent de 1 chaque jour à ${resetHour} h.`}
          </p>
          <div className="mt-1.5 flex items-center justify-between gap-3 border-t border-hairline pt-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                Afficher le numéro de table
              </p>
              <p className="mt-0.5">
                Les QR de table restent valables&nbsp;: la table s&rsquo;affiche
                à côté du numéro, au comptoir et sur le ticket cuisine.
              </p>
            </div>
            <Toggle
              checked={showTable}
              onChange={(next) => void toggleShowTable(next)}
              disabled={busy}
              label="Afficher le numéro de table"
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-3 border-t border-hairline pt-3">
            <div>
              <p className="text-sm font-medium text-foreground">Retrait au bar</p>
              <p className="mt-0.5">
                Prête, la commande montre au client un code. Scannez-le avec
                «&nbsp;Scanner&nbsp;», dans la barre du bas de l&rsquo;espace (ou
                l&rsquo;appareil photo du téléphone)&nbsp;: elle est remise, et
                le client le voit. Les QR des tables restent valables.
              </p>
            </div>
            <Toggle
              checked={barPickup}
              onChange={(next) => void toggleBarPickup(next)}
              disabled={busy}
              label="Retrait au bar"
            />
          </div>
        </div>
      )}
    </section>
  );
}
