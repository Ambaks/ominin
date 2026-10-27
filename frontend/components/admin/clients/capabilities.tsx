"use client";

import { useState } from "react";
import { Toggle } from "@/components/ui/toggle";
import { useToast } from "@/components/ui/toast";
import {
  clientFeatures,
  nextOverrides,
  saveCategoryLayout,
  saveOrderTabs,
  saveOverrides,
  saveSaison,
  type Client,
} from "@/lib/admin/clients";
import { inputClass } from "@/components/ui/field";
import { activeSaison, type Saison } from "@/lib/menu/saison";
import {
  OFFRE_LABELS,
  ORDER_TAB_HINTS,
  ORDER_TAB_LABELS,
  ORDER_TABS,
  VIEWS,
} from "@/lib/gestion/constants";
import type { Feature, OrderTab } from "@/lib/gestion/types";
import { CategoryLayoutPicker } from "@/components/gestion/category-layout-settings";
import { CATEGORY_LAYOUTS } from "@/lib/menu/category-layouts";
import type { CategoryLayout } from "@/lib/menu-data";

/*
 * L'arborescence d'un client : les vues de son espace de gestion, et sous
 * chacune ce qu'elle contient. Une case cochée qui suit l'offre ne laisse
 * aucune trace ; seul l'écart est enregistré, pour qu'une évolution de l'offre
 * atteigne les clients qu'on n'a pas réglés à la main.
 */
function Row({
  label,
  hint,
  checked,
  fromPlan,
  disabled,
  onChange,
  nested,
}: {
  label: string;
  hint: string;
  checked: boolean;
  fromPlan: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  nested?: boolean;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-4 py-3 ${
        nested ? "pl-5" : ""
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{label}</p>
          {!fromPlan && (
            <span className="rounded-full border border-ember-2/30 bg-ember-2/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ember-2">
              Réglé
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-faint">{hint}</p>
      </div>
      <Toggle
        checked={checked}
        disabled={disabled || !onChange}
        onChange={(value) => onChange?.(value)}
        label={label}
      />
    </div>
  );
}

/*
 * Les étapes de Commandes, et leur ordre. La sélection dit ce que la salle
 * voit ; l'ordre dit quand on encaisse — au début du repas ou à la fin. Le
 * BOHO garde « À encaisser » puis « Historique », ses tickets sortant à
 * l'imprimante ; une brasserie qui sert avant de faire payer met « À servir »
 * en tête. Une étape retirée reste listée en bas, à portée de clic.
 */
function OrderTabsCard({
  client,
  onChange,
}: {
  client: Client;
  onChange: (client: Client) => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const kept = client.orderTabs;
  const dropped = ORDER_TABS.filter((tab) => !kept.includes(tab));

  const persist = async (orderTabs: OrderTab[]) => {
    const previous = client;
    onChange({ ...client, orderTabs });
    setSaving(true);
    try {
      await saveOrderTabs(client.id, orderTabs);
    } catch (error) {
      onChange(previous);
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    } finally {
      setSaving(false);
    }
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= kept.length) return;
    const next = [...kept];
    [next[index], next[target]] = [next[target], next[index]];
    void persist(next);
  };

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="font-display text-base font-medium">
          Étapes de l&rsquo;onglet Commandes
        </h3>
        <p className="mt-0.5 text-xs leading-relaxed text-faint">
          Dans l&rsquo;ordre où la salle les voit. Si une assiette attend faute
          de ticket sorti, « À servir » reparaît de lui-même — le filet ne se
          règle pas.
        </p>
      </div>
      <div className="divide-y divide-hairline rounded-2xl border border-hairline bg-surface">
        {kept.map((tab, index) => (
          <div key={tab} className="flex items-center gap-3 px-4 py-3">
            <span className="w-5 shrink-0 text-center font-display text-sm text-faint">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{ORDER_TAB_LABELS[tab]}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-faint">
                {ORDER_TAB_HINTS[tab]}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={saving || index === 0}
                aria-label={`Monter ${ORDER_TAB_LABELS[tab]}`}
                className="rounded-full border border-hairline px-2 py-1 text-xs text-muted transition-colors hover:text-foreground disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={saving || index === kept.length - 1}
                aria-label={`Descendre ${ORDER_TAB_LABELS[tab]}`}
                className="rounded-full border border-hairline px-2 py-1 text-xs text-muted transition-colors hover:text-foreground disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => void persist(kept.filter((t) => t !== tab))}
                disabled={saving || kept.length === 1}
                title={
                  kept.length === 1
                    ? "Gardez au moins une étape."
                    : "Retirer cette étape"
                }
                className="ml-1 rounded-full border border-hairline px-3 py-1 text-xs font-semibold text-muted transition-colors hover:border-ember-3/50 hover:text-ember-3 disabled:opacity-30"
              >
                Retirer
              </button>
            </div>
          </div>
        ))}
        {dropped.map((tab) => (
          <div key={tab} className="flex items-center gap-3 px-4 py-3">
            <span className="w-5 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-faint">
                {ORDER_TAB_LABELS[tab]}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-faint">
                Retiré de l&rsquo;écran de ce restaurant.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void persist([...kept, tab])}
              disabled={saving}
              className="shrink-0 rounded-full border border-hairline px-3 py-1 text-xs font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground disabled:opacity-50"
            >
              Ajouter
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

/* Présentation des catégories du menu QR. Le gérant peut la changer aussi
 * depuis sa gestion : la carte montre la dernière valeur choisie. */
function CategoryLayoutCard({
  client,
  onChange,
}: {
  client: Client;
  onChange: (client: Client) => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const choose = async (categoryLayout: CategoryLayout) => {
    const previous = client;
    onChange({ ...client, categoryLayout });
    setSaving(true);
    try {
      await saveCategoryLayout(client.id, categoryLayout);
      toast.success(CATEGORY_LAYOUTS.find(({ id }) => id === categoryLayout)?.savedAdmin ?? "");
    } catch (error) {
      onChange(previous);
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="font-display text-base font-medium">Catégories du menu QR</h3>
        <p className="mt-0.5 text-xs leading-relaxed text-faint">
          Le gérant peut aussi le régler depuis sa gestion.
        </p>
      </div>
      <CategoryLayoutPicker
        value={client.categoryLayout}
        disabled={saving}
        onChoose={(layout) => void choose(layout)}
      />
    </section>
  );
}

const SAISON_CHOICES: { id: Saison | null; label: string; body: string }[] = [
  { id: null, label: "Aucune", body: "Le menu tel que le restaurant l'a voulu." },
  { id: "automne", label: "Automne", body: "Lanternes dorées, feuilles qui tombent sur toute la carte." },
  {
    id: "halloween",
    label: "Halloween",
    body: "La nuit, la lune, la sorcière, les toiles, l'araignée, les fantômes et le chat noir.",
  },
];

function finLabel(fin: string): string {
  return new Date(`${fin}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

/*
 * L'habillage de saison du menu QR. Ominin seul le pose : le gérant ne le
 * voit pas dans sa gestion. La date de fin est le dernier jour de service où
 * il s'affiche ; sans date, il reste jusqu'à ce qu'on l'éteigne ici.
 */
function SaisonCard({
  client,
  onChange,
}: {
  client: Client;
  onChange: (client: Client) => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const persist = async (saison: Saison | null, saisonFin: string | null) => {
    const previous = client;
    const next = { ...client, saison, saisonFin: saison ? saisonFin : null };
    onChange(next);
    setSaving(true);
    try {
      await saveSaison(client.id, next.saison, next.saisonFin);
    } catch (error) {
      onChange(previous);
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  };

  const shown = activeSaison(client.saison, client.saisonFin, client.dayEndHour);
  const status = !client.saison
    ? null
    : !shown
      ? `Date passée (${finLabel(client.saisonFin as string)}) : le menu ne l'affiche plus.`
      : client.saisonFin
        ? `Sur le menu jusqu'à la fermeture du ${finLabel(client.saisonFin)}.`
        : "Sur le menu jusqu'à ce qu'on l'éteigne ici.";

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="font-display text-base font-medium">Saison du menu QR</h3>
        <p className="mt-0.5 text-xs leading-relaxed text-faint">
          Posée par Ominin seulement : le gérant ne la voit pas dans sa gestion. Le menu
          la montre à la prochaine mise à jour de son cache, en une minute au plus.
        </p>
      </div>
      <div role="radiogroup" aria-label="Saison du menu QR" className="grid gap-3 sm:grid-cols-3">
        {SAISON_CHOICES.map((option) => {
          const selected = client.saison === option.id;
          return (
            <button
              key={option.label}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={saving}
              onClick={() => selected || void persist(option.id, client.saisonFin)}
              className={`flex flex-col gap-2 rounded-2xl border p-4 text-left transition-colors disabled:cursor-wait ${
                selected ? "border-ember-2/60 bg-surface-raised" : "border-hairline hover:border-ember-2/30"
              }`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="font-display text-base font-medium">{option.label}</span>
                <span
                  aria-hidden
                  className={`flex size-5 items-center justify-center rounded-full border ${
                    selected ? "border-ember-2" : "border-hairline"
                  }`}
                >
                  {selected && <span className="ember-gradient size-2.5 rounded-full" />}
                </span>
              </span>
              <span className="text-xs leading-relaxed text-muted">{option.body}</span>
            </button>
          );
        })}
      </div>
      {client.saison && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">Jusqu&rsquo;au (inclus)</span>
            <input
              type="date"
              value={client.saisonFin ?? ""}
              disabled={saving}
              onChange={(event) => void persist(client.saison, event.target.value || null)}
              className={inputClass}
            />
          </label>
          {client.saisonFin && (
            <button
              type="button"
              onClick={() => void persist(client.saison, null)}
              disabled={saving}
              className="rounded-full border border-hairline px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground disabled:opacity-50"
            >
              Sans date de fin
            </button>
          )}
        </div>
      )}
      {status && <p className="text-xs leading-relaxed text-faint">{status}</p>}
    </section>
  );
}

export function Capabilities({
  client,
  onChange,
}: {
  client: Client;
  onChange: (client: Client) => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const features = clientFeatures(client);

  const subscribed = client.products.offre != null || client.products.collect;

  const set = async (feature: Feature, open: boolean) => {
    const overrides = nextOverrides(client, feature, open);
    const previous = client;
    // Optimiste : la case suit le doigt, on la remet en place si l'écriture
    // échoue — l'écran sert à cocher vite, pas à attendre le réseau.
    onChange({ ...client, overrides });
    setSaving(true);
    try {
      await saveOverrides(client.id, overrides);
    } catch (error) {
      onChange(previous);
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    const previous = client;
    onChange({ ...client, overrides: {} });
    setSaving(true);
    try {
      await saveOverrides(client.id, {});
      toast.success("Réglages remis à l'offre.");
    } catch (error) {
      onChange(previous);
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    } finally {
      setSaving(false);
    }
  };

  const tuned = Object.keys(client.overrides).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-medium">{client.name}</h2>
          <p className="mt-0.5 text-sm text-muted">
            {client.products.offre
              ? `Ominin ${OFFRE_LABELS[client.products.offre]}`
              : client.products.collect
                ? "Click & collect seul"
                : "Aucun abonnement actif"}
            {client.products.offre && client.products.collect
              ? " · Click & collect"
              : ""}
            {" · "}
            {tuned === 0
              ? "réglages de l'offre"
              : `${tuned} écart${tuned > 1 ? "s" : ""} à l'offre`}
          </p>
        </div>
        {tuned > 0 && (
          <button
            type="button"
            onClick={() => void reset()}
            disabled={saving}
            className="rounded-full border border-hairline px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground disabled:opacity-50"
          >
            Revenir à l&rsquo;offre
          </button>
        )}
      </div>

      {!subscribed && (
        <p className="rounded-2xl border border-ember-3/40 bg-ember-3/10 px-4 py-3 text-sm leading-relaxed">
          Aucun abonnement actif : l&rsquo;espace de gestion reste fermé quoi
          qu&rsquo;on coche ici. Les cases servent à préparer l&rsquo;ouverture.
        </p>
      )}

      <div className="divide-y divide-hairline rounded-2xl border border-hairline bg-surface px-5">
        {VIEWS.map((view) => {
          const open = view.id == null || features[view.id];
          return (
            <div key={view.label} className="py-1">
              <Row
                label={view.label}
                hint={
                  view.id == null
                    ? `${view.hint} Toujours ouverte.`
                    : view.hint
                }
                checked={open}
                fromPlan={view.id == null || client.overrides[view.id] == null}
                disabled={saving || view.id == null}
                onChange={
                  view.id
                    ? (value) => void set(view.id as Feature, value)
                    : undefined
                }
              />
              {view.features.map((feature) => (
                <Row
                  key={feature.id}
                  nested
                  label={feature.label}
                  hint={feature.hint}
                  checked={features[feature.id]}
                  fromPlan={client.overrides[feature.id] == null}
                  disabled={saving || !open}
                  onChange={(value) => void set(feature.id, value)}
                />
              ))}
            </div>
          );
        })}
      </div>

      {features.commandes && (
        <OrderTabsCard client={client} onChange={onChange} />
      )}

      {client.products.offre && (
        <CategoryLayoutCard client={client} onChange={onChange} />
      )}

      {client.products.offre && <SaisonCard client={client} onChange={onChange} />}

      <p className="text-xs leading-relaxed text-faint">
        Une case laissée telle que l&rsquo;offre la donne ne s&rsquo;enregistre
        pas : ce client suivra les évolutions d&rsquo;
        {client.products.offre
          ? `Ominin ${OFFRE_LABELS[client.products.offre]}`
          : "son offre"}
        . Les écarts, eux, tiennent jusqu&rsquo;à ce qu&rsquo;on les retire.
        L&rsquo;ordre des étapes, lui, s&rsquo;enregistre toujours tel quel.
      </p>
    </div>
  );
}
