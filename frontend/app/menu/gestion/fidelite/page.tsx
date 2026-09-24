"use client";

import { useCallback, useEffect, useState } from "react";
import { AdjustPointsModal } from "@/components/gestion/fidelite/adjust-points-modal";
import { TierFormModal } from "@/components/gestion/fidelite/tier-form-modal";
import { FeatureLocked } from "@/components/gestion/feature-locked";
import { EditIcon, TrashIcon } from "@/components/gestion/icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { Toggle } from "@/components/ui/toggle";
import {
  adjustPoints,
  createTier,
  deleteTier,
  loadLoyalty,
  saveLoyaltySettings,
  updateTier,
  type LoyaltyData,
  type LoyaltyTier,
  type LoyaltyTierInput,
} from "@/lib/gestion/fidelite";
import { formatDateTime } from "@/lib/gestion/format";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import type { MenuCategory } from "@/lib/menu-data";

/*
 * Le gérant règle ici son programme de fidélité : l'allumer, le taux de
 * points par euro, les paliers qu'offre le menu QR — et il suit ses clients,
 * solde par solde, avec la main pour un geste commercial.
 */

const cardClass = "rounded-2xl border border-hairline bg-surface px-4 py-3";
const iconButtonClass =
  "rounded-full border border-hairline p-2 text-muted transition-colors hover:border-ember-2/40 hover:text-foreground";
const deleteButtonClass =
  "rounded-full border border-hairline p-2 text-muted transition-colors hover:border-ember-3/50 hover:text-ember-3";
const addButtonClass =
  "ember-gradient rounded-full px-4 py-2 text-xs font-semibold text-background";

type TierEditing = { tier: LoyaltyTier | null } | null;
type Adjusting = { contact: string | null } | null;

function LoyaltyManager({
  etablissementId,
  categories,
}: {
  etablissementId: string;
  categories: MenuCategory[];
}) {
  const toast = useToast();
  const [data, setData] = useState<LoyaltyData | null>(null);
  const [rate, setRate] = useState("");
  const [editing, setEditing] = useState<TierEditing>(null);
  const [tierToDelete, setTierToDelete] = useState<LoyaltyTier | null>(null);
  const [adjusting, setAdjusting] = useState<Adjusting>(null);
  const [search, setSearch] = useState("");

  const report = useCallback(
    (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue."),
    [toast]
  );

  const refresh = useCallback(async () => {
    const next = await loadLoyalty(etablissementId);
    setData(next);
    setRate(String(next.settings.pointsPerEuro));
  }, [etablissementId]);

  useEffect(() => {
    const load = () => refresh().catch(report);
    load();
  }, [refresh, report]);

  if (!data) {
    return (
      <div aria-busy className="flex flex-col gap-3">
        <div className="shimmer h-16 rounded-2xl" />
        <div className="shimmer h-16 rounded-2xl" />
      </div>
    );
  }

  const itemNames = new Map(
    categories.flatMap((category) => category.items.map((item) => [item.id, item.name]))
  );

  const setEnabled = async (enabled: boolean) => {
    try {
      await saveLoyaltySettings(etablissementId, { ...data.settings, enabled });
      await refresh();
      toast.success(
        enabled
          ? "Programme allumé : vos clients cumulent des points depuis le menu."
          : "Programme éteint : le menu ne le propose plus."
      );
    } catch (error) {
      report(error);
    }
  };

  const saveRate = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await saveLoyaltySettings(etablissementId, {
        ...data.settings,
        pointsPerEuro: Number(rate.replace(",", ".")),
      });
      await refresh();
      toast.success("Taux enregistré.");
    } catch (error) {
      report(error);
    }
  };

  const saveTier = async (input: LoyaltyTierInput) => {
    try {
      if (editing?.tier) await updateTier(editing.tier.id, input);
      else await createTier(etablissementId, input);
      toast.success(`Palier « ${input.label} » enregistré.`);
      setEditing(null);
      await refresh();
    } catch (error) {
      report(error);
    }
  };

  const removeTier = async (tier: LoyaltyTier) => {
    setTierToDelete(null);
    try {
      await deleteTier(tier.id);
      toast.success(`Palier « ${tier.label} » retiré.`);
      await refresh();
    } catch (error) {
      report(error);
    }
  };

  const adjust = async (contact: string, points: number) => {
    try {
      await adjustPoints(etablissementId, contact, points);
      toast.success(
        `${points > 0 ? "+" : ""}${points} points pour ${contact}.`
      );
      setAdjusting(null);
      await refresh();
    } catch (error) {
      report(error);
    }
  };

  const query = search.trim().toLowerCase().replace(/\s/g, "");
  const customers = query
    ? data.customers.filter((customer) => customer.contact.includes(query))
    : data.customers;

  return (
    <div className="flex max-w-xl flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-medium">Programme</h2>
        <div className={`${cardClass} flex items-center justify-between gap-3`}>
          <div>
            <p className="text-sm font-medium">Fidélité sur le menu QR</p>
            <p className="text-xs text-faint">
              Le client laisse son numéro ou son email en commandant, et voit
              ses points et ses récompenses.
            </p>
          </div>
          <Toggle
            checked={data.settings.enabled}
            onChange={(enabled) => void setEnabled(enabled)}
            label="Programme de fidélité"
          />
        </div>
        <form onSubmit={saveRate} className={`${cardClass} flex items-end gap-3`}>
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-sm font-medium">Points par euro dépensé</span>
            <span className="text-xs text-faint">
              Hors pourboire et articles offerts, arrondi à l&rsquo;entier
              inférieur par commande.
            </span>
            <input
              type="number"
              min={0.01}
              step={0.01}
              inputMode="decimal"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
              required
              className={inputClass}
            />
          </label>
          <button
            type="submit"
            disabled={Number(rate) === data.settings.pointsPerEuro}
            className={`${addButtonClass} disabled:opacity-50`}
          >
            Enregistrer
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-medium">Paliers</h2>
          <button
            type="button"
            onClick={() => setEditing({ tier: null })}
            className={addButtonClass}
          >
            Ajouter un palier
          </button>
        </div>
        {data.tiers.length ? (
          data.tiers.map((tier) => (
            <div key={tier.id} className={`${cardClass} flex items-start justify-between gap-3`}>
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  <span className="ember-text font-semibold">{tier.points}&nbsp;pts</span>{" "}
                  · {tier.label}
                </p>
                <p className="text-xs text-faint">
                  {tier.itemIds.map((id) => itemNames.get(id)).filter(Boolean).join(", ") ||
                    "Aucun article : le palier n'apparaît pas sur le menu."}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditing({ tier })}
                  aria-label="Modifier"
                  className={iconButtonClass}
                >
                  <EditIcon className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setTierToDelete(tier)}
                  aria-label="Retirer"
                  className={deleteButtonClass}
                >
                  <TrashIcon className="size-3.5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted">
            Aucun palier : le client cumule des points sans rien pouvoir
            s&rsquo;offrir.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-medium">
            Clients{" "}
            <span className="text-sm text-faint">({data.customers.length})</span>
          </h2>
          <button
            type="button"
            onClick={() => setAdjusting({ contact: null })}
            className={addButtonClass}
          >
            Offrir des points
          </button>
        </div>
        {data.customers.length > 0 && (
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un numéro ou un email"
            aria-label="Rechercher un client"
            className={inputClass}
          />
        )}
        {customers.map((customer) => (
          <div
            key={customer.id}
            className={`${cardClass} flex items-center justify-between gap-3`}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{customer.contact}</p>
              <p className="text-xs text-faint">
                Dernière activité {formatDateTime(customer.lastActivity)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-sm font-semibold">{customer.points}&nbsp;pts</span>
              <button
                type="button"
                onClick={() => setAdjusting({ contact: customer.contact })}
                aria-label={`Ajuster les points de ${customer.contact}`}
                className={iconButtonClass}
              >
                <EditIcon className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
        {data.customers.length === 0 && (
          <p className="text-sm text-muted">
            Pas encore de client : ils apparaissent à leur première commande
            avec leur numéro ou leur email.
          </p>
        )}
      </section>

      {editing && (
        <TierFormModal
          tier={editing.tier}
          categories={categories}
          onSubmit={saveTier}
          onClose={() => setEditing(null)}
        />
      )}
      {tierToDelete && (
        <ConfirmDialog
          title="Retirer ce palier ?"
          message={`« ${tierToDelete.label} » disparaît du menu. Les points de vos clients ne bougent pas.`}
          confirmLabel="Retirer"
          destructive
          onConfirm={() => void removeTier(tierToDelete)}
          onClose={() => setTierToDelete(null)}
        />
      )}
      {adjusting && (
        <AdjustPointsModal
          contact={adjusting.contact}
          onSubmit={adjust}
          onClose={() => setAdjusting(null)}
        />
      )}
    </div>
  );
}

export default function FidelitePage() {
  const state = useGestion();
  const { role, hasFeature } = useGestionAccess();

  if (!state) return null;
  if (!hasFeature("fidelite")) return <FeatureLocked feature="fidelite" />;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-medium tracking-tight lg:text-3xl">
          Fidélité
        </h1>
        <p className="mt-1 text-sm text-muted">
          Vos clients cumulent des points à chaque commande du menu QR et
          s&rsquo;offrent les récompenses que vous choisissez.
        </p>
      </div>

      {role === "gerant" ? (
        <LoyaltyManager
          etablissementId={state.etablissement.id}
          categories={state.categories}
        />
      ) : (
        <EmptyState
          title="Réservé au gérant"
          body="Le programme de fidélité se règle depuis le compte du gérant."
        />
      )}
    </div>
  );
}
