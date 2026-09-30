"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { setServiceMode } from "@/lib/gestion/api";
import type { ServiceMode } from "@/lib/gestion/types";
import { menuSiteUrl } from "@/lib/site";

/*
 * Type de service (gérant). Restaurant : chaque table a son QR, la salle
 * apporte la commande. Fast food : un seul QR, le client commande sans table,
 * repart avec un numéro du jour et suit sa commande jusqu'à « Prête » — les
 * écrans des tables se retirent de l'espace. Le menu public suit à sa
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
    body: "Un seul QR code. Le client commande sans table, reçoit un numéro et suit sa commande sur son téléphone jusqu'à « Prête ».",
    icon: (
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6" />
    ),
  },
];

export function ServiceModeSettings({
  initialMode,
  slug,
  resetHour,
}: {
  initialMode: ServiceMode;
  slug: string;
  /** Heure où les numéros repartent de 1 ; inconnue, elle n'est pas annoncée. */
  resetHour: number | null;
}) {
  const toast = useToast();
  const [mode, setMode] = useState(initialMode);
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
          ? "Fast food activé\u00a0: vos clients commandent sans table."
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
      <div role="radiogroup" aria-label="Type de service" className="grid gap-3 sm:grid-cols-2">
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
            Votre QR code de comptoir pointe vers{" "}
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
            la clôt.
            {resetHour !== null &&
              ` Les numéros repartent de 1 chaque jour à ${resetHour} h.`}
          </p>
        </div>
      )}
    </section>
  );
}
