"use client";

import { useState, type KeyboardEvent } from "react";
import { SettingsCard } from "@/app/menu/gestion/etablissement/settings-card";
import { Chip, Switch } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import { describeError } from "@/lib/gestion/errors";
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
  body: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "restaurant",
    label: "Restaurant",
    body: "Un QR code par table. La commande arrive avec son numéro de table, la salle l'apporte.",
    icon: (
      <path d="M4 10h16M6 10v9M18 10v9M8 6h8M12 6v4" />
    ),
  },
  {
    id: "fast_food",
    label: "Fast food",
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
          ? "Fast food activé : chaque commande reçoit un numéro."
          : "Restaurant activé : la commande se fait depuis la table."
      );
    } catch (error) {
      setMode(previous);
      toast.error(
        describeError(error).message
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
        describeError(error).message
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
          ? "Retrait au bar activé : le client montre son code au bar."
          : "Retrait au comptoir : le client vient sur son numéro."
      );
    } catch (error) {
      setBar(!next);
      toast.error(
        describeError(error).message
      );
    } finally {
      setBusy(false);
    }
  };

  // Un groupe de radios se parcourt aux flèches, une seule carte dans l'ordre de tabulation.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!step || busy) return;
    event.preventDefault();
    const index = MODES.findIndex((option) => option.id === mode);
    const next = MODES[(index + step + MODES.length) % MODES.length];
    void choose(next.id);
    event.currentTarget.querySelector<HTMLElement>(`[data-mode="${next.id}"]`)?.focus();
  };

  return (
    <SettingsCard
      title="Type de service"
      text="Le menu suit votre choix en une minute ; un client qui l'avait déjà ouvert le recharge."
      right={busy ? <Chip>Mise à jour…</Chip> : undefined}
    >
      <div
        role="radiogroup"
        aria-label="Type de service"
        data-visite="etablissement-service"
        onKeyDown={onKeyDown}
        className="grid gap-3 rounded-g-card sm:grid-cols-2"
      >
        {MODES.map((option) => {
          const selected = mode === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              data-mode={option.id}
              aria-checked={selected}
              aria-disabled={busy || undefined}
              tabIndex={selected ? 0 : -1}
              onClick={() => void choose(option.id)}
              className={`g-press flex flex-col gap-2 rounded-g-card border p-4 text-left aria-disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-1 ${
                selected
                  ? "border-(--g-ring-hover) bg-surface-raised"
                  : "border-hairline bg-surface"
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
                  <span className="text-g-body font-semibold">{option.label}</span>
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
              <span className="text-g-meta text-muted">{option.body}</span>
            </button>
          );
        })}
      </div>
      {mode === "fast_food" && (
        <div className="flex flex-col gap-3">
          <p className="text-g-meta text-muted">
            L’affiche du {barPickup ? "bar" : "comptoir"} pointe vers{" "}
            <a
              href={`${menuSiteUrl}/m/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all font-semibold text-foreground underline decoration-hairline underline-offset-2"
            >
              {`${menuSiteUrl.replace(/^https?:\/\//, "")}/m/${slug}`}
            </a>
            {resetHour !== null
              ? ` ; les numéros repartent de 1 chaque jour à ${resetHour} h.`
              : "."}
          </p>
          <Switch
            label="Table affichée à côté du numéro"
            hint="Au comptoir et sur le ticket cuisine, quand le client a scanné le QR d'une table."
            checked={showTable}
            onChange={(next) => {
              if (!busy) void toggleShowTable(next);
            }}
          />
          <Switch
            label="Retrait au bar"
            hint="Prête, la commande montre un code au client ; le scanner (barre du bas) la remet."
            checked={barPickup}
            onChange={(next) => {
              if (!busy) void toggleBarPickup(next);
            }}
          />
        </div>
      )}
    </SettingsCard>
  );
}
