"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { AdjustPointsModal } from "@/components/gestion/fidelite/adjust-points-modal";
import { describeError } from "@/components/gestion/fidelite/describe-error";
import { LoyaltyResults } from "@/components/gestion/fidelite/loyalty-results";
import { TierFormModal } from "@/components/gestion/fidelite/tier-form-modal";
import { FeatureLocked } from "@/components/gestion/feature-locked";
import { GiftIcon } from "@/components/gestion/icons";
import {
  Chip,
  EmptyState,
  GlassButton,
  GlassFrame,
  Notice,
  Plate,
  SectionHeading,
  Shimmer,
} from "@/components/gestion/ui";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { Toggle } from "@/components/ui/toggle";
import {
  adjustPoints,
  createTier,
  deleteTier,
  eraseCustomer,
  loadLoyalty,
  loadLoyaltyStats,
  saveLoyaltySettings,
  updateTier,
  type LoyaltyCustomer,
  type LoyaltyData,
  type LoyaltyStats,
  type LoyaltyTier,
  type LoyaltyTierInput,
} from "@/lib/gestion/fidelite";
import { formatDateTime } from "@/lib/gestion/format";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import { syncTill } from "@/lib/hubrise/kick";
import type { MenuCategory } from "@/lib/menu-data";

/*
 * Le gérant règle ici son programme de fidélité : l'allumer, le taux de
 * points par euro, les récompenses qu'offre le menu QR — et il suit ses
 * clients, solde par solde, avec la main pour un geste commercial. Ce que le
 * programme rapporte (LoyaltyResults) ouvre la page dès la première carte ;
 * avant, le premier geste — allumer, puis une récompense — vient en tête.
 */

const count = (n: number) => n.toLocaleString("fr-FR");
const rise = (i: number) => ({ "--g-i": i }) as CSSProperties;

type TierEditing = { tier: LoyaltyTier | null } | null;
type Adjusting = { customer: LoyaltyCustomer | null } | null;

function LoyaltyManager({
  etablissementId,
  categories,
  hubriseConnected,
}: {
  etablissementId: string;
  categories: MenuCategory[];
  hubriseConnected: boolean;
}) {
  const toast = useToast();
  const [data, setData] = useState<LoyaltyData | null>(null);
  const [stats, setStats] = useState<LoyaltyStats | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rate, setRate] = useState("");
  const [editing, setEditing] = useState<TierEditing>(null);
  const [tierToDelete, setTierToDelete] = useState<LoyaltyTier | null>(null);
  const [adjusting, setAdjusting] = useState<Adjusting>(null);
  const [customerToErase, setCustomerToErase] = useState<LoyaltyCustomer | null>(null);
  const [search, setSearch] = useState("");

  const report = useCallback((error: unknown) => toast.error(describeError(error)), [toast]);

  const refresh = useCallback(async () => {
    try {
      const [next, results] = await Promise.all([
        loadLoyalty(etablissementId),
        loadLoyaltyStats(etablissementId).catch(() => null),
      ]);
      setData(next);
      setStats(results);
      setRate(String(next.settings.pointsPerEuro));
      setLoadError(null);
    } catch (error) {
      setLoadError(describeError(error));
    }
  }, [etablissementId]);

  useEffect(() => {
    const load = () => refresh();
    void load();
  }, [refresh]);

  if (!data) {
    return loadError ? (
      <Notice
        icon={<GiftIcon />}
        title="Chargement impossible"
        text={loadError}
        action={<GlassButton onClick={() => void refresh()}>Réessayer</GlassButton>}
      />
    ) : (
      <div aria-busy className="grid gap-g-gap">
        <div className="grid gap-g-gap sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <GlassFrame key={i} entity="orders" eyebrow="Fidélité">
              <Shimmer className="h-21" />
            </GlassFrame>
          ))}
        </div>
        <Shimmer className="h-48" />
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

  const rateValue = Number(rate.replace(",", "."));
  const rateValid = Number.isFinite(rateValue) && rateValue > 0;
  const rateChanged = rateValid && rateValue !== data.settings.pointsPerEuro;

  const saveRate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!rateChanged) return;
    try {
      await saveLoyaltySettings(etablissementId, { ...data.settings, pointsPerEuro: rateValue });
      await refresh();
      toast.success(`Taux enregistré : ${count(rateValue)} ${rateValue > 1 ? "points" : "point"} par euro.`);
    } catch (error) {
      report(error);
    }
  };

  const saveTier = async (input: LoyaltyTierInput) => {
    try {
      if (editing?.tier) await updateTier(editing.tier.id, input);
      else await createTier(etablissementId, input);
      toast.success(`Récompense « ${input.label} » enregistrée.`);
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
      toast.success(`Récompense « ${tier.label} » retirée.`);
      await refresh();
    } catch (error) {
      report(error);
    }
  };

  const adjust = async (contact: string, points: number) => {
    try {
      await adjustPoints(etablissementId, contact, points);
      toast.success(`${points > 0 ? "+" : ""}${count(points)} points pour ${contact}.`);
      setAdjusting(null);
      await refresh();
    } catch (error) {
      report(error);
    }
  };

  const erase = async (customer: LoyaltyCustomer) => {
    setCustomerToErase(null);
    try {
      await eraseCustomer(etablissementId, customer.id);
      syncTill(hubriseConnected);
      toast.success("Client effacé.");
      await refresh();
    } catch (error) {
      report(error);
    }
  };

  const query = search.trim().toLowerCase().replace(/\s/g, "");
  const customers = query
    ? data.customers.filter((customer) => customer.contact.toLowerCase().includes(query))
    : data.customers;
  const hasResults = stats !== null && stats.weeks.length > 0;
  const enabled = data.settings.enabled;
  let block = 1;

  return (
    <div className="grid gap-6">
      {loadError && (
        <Notice
          icon={<GiftIcon />}
          title="Mise à jour impossible"
          text={`${loadError} Les derniers chiffres connus restent affichés.`}
          action={<GlassButton onClick={() => void refresh()}>Réessayer</GlassButton>}
        />
      )}

      {hasResults && (
        <section className="g-rise relative grid gap-4" style={rise(block++)} aria-labelledby="fidelite-resultats">
          <SectionHeading
            id="fidelite-resultats"
            title="Résultats"
            sub={`${stats.weeks.length} ${stats.weeks.length > 1 ? "semaines" : "semaine"} de programme`}
          />
          <LoyaltyResults stats={stats} />
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[5fr_7fr] lg:items-start">
        <div className="grid gap-6">
          <section
            data-visite="fidelite-programme"
            className="g-rise grid gap-4"
            style={rise(block++)}
            aria-labelledby="fidelite-programme-titre"
          >
            <SectionHeading
              id="fidelite-programme-titre"
              title="Programme"
              sub={enabled ? "allumé sur le menu QR" : "éteint"}
            />
            <Plate className="grid">
              <div className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="font-medium">Fidélité sur le menu QR</p>
                  <p className="mt-0.5 text-g-meta text-muted">
                    Le client laisse son numéro ou son email en commandant.
                  </p>
                </div>
                <Toggle
                  checked={enabled}
                  onChange={(next) => void setEnabled(next)}
                  label="Programme de fidélité"
                />
              </div>
              <form
                onSubmit={saveRate}
                className="grid gap-3 border-t border-hairline px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-end"
              >
                <label className="grid gap-1.5">
                  <span className="font-medium">Points par euro dépensé</span>
                  <span className="text-g-meta text-muted">
                    Hors pourboire et articles offerts, arrondi à l&rsquo;entier inférieur par commande.
                  </span>
                  <span className="relative mt-1 block">
                    <input
                      type="number"
                      min={0.01}
                      step={0.01}
                      inputMode="decimal"
                      value={rate}
                      onChange={(event) => setRate(event.target.value)}
                      aria-invalid={rateValid ? undefined : true}
                      aria-describedby="fidelite-taux-aide"
                      className={`${inputClass} pr-16 tabular-nums`}
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-g-label text-muted">
                      pt / €
                    </span>
                  </span>
                  <span id="fidelite-taux-aide" className={`text-g-meta ${rateValid ? "text-muted" : "font-medium text-ember-3"}`}>
                    {rateValid
                      ? `10 € dépensés rapportent ${count(Math.floor(10 * rateValue))} ${Math.floor(10 * rateValue) > 1 ? "points" : "point"}.`
                      : "Indiquez un taux au-dessus de zéro, 1 point par euro par exemple."}
                  </span>
                </label>
                {rateChanged && (
                  <button type="submit" className="g-btn g-btn-primary g-press">
                    Enregistrer
                  </button>
                )}
              </form>
            </Plate>
          </section>

          <section
            data-visite="fidelite-paliers"
            className="g-rise grid gap-4"
            style={rise(block++)}
            aria-labelledby="fidelite-recompenses"
          >
            <SectionHeading
              id="fidelite-recompenses"
              title="Récompenses"
              sub={data.tiers.length ? `${data.tiers.length} sur le menu` : undefined}
              right={
                data.tiers.length > 0 ? (
                  <GlassButton onClick={() => setEditing({ tier: null })}>Ajouter</GlassButton>
                ) : undefined
              }
            />
            {data.tiers.length ? (
              <Plate className="grid">
                {data.tiers.map((tier) => {
                  const items = tier.itemIds.map((id) => itemNames.get(id)).filter(Boolean);
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setEditing({ tier })}
                      className="g-press grid min-h-(--g-row-h) grid-cols-[auto_1fr] items-start gap-x-4 gap-y-0.5 border-t border-hairline px-5 py-3.5 text-left first:border-t-0 hover:bg-surface-raised/60"
                    >
                      <span className="pt-0.5 text-g-label font-semibold tabular-nums">
                        {count(tier.points)}&nbsp;pts
                      </span>
                      <span className="min-w-0">
                        <span className="block font-medium">{tier.label}</span>
                        {items.length ? (
                          <span className="block truncate text-g-meta text-muted">{items.join(", ")}</span>
                        ) : (
                          <span className="mt-1 inline-flex">
                            <Chip tone="problem">Aucun article : absente du menu</Chip>
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </Plate>
            ) : (
              <EmptyState
                text="Aucune récompense : le client cumule des points sans rien pouvoir s'offrir."
                action={
                  <GlassButton variant="primary" onClick={() => setEditing({ tier: null })}>
                    Ajouter une récompense
                  </GlassButton>
                }
              />
            )}
          </section>
        </div>

        <section className="g-rise grid gap-4" style={rise(block++)} aria-labelledby="fidelite-clients">
          <SectionHeading
            id="fidelite-clients"
            title="Clients"
            sub={data.customers.length ? `${count(data.customers.length)} avec une carte` : undefined}
            right={<GlassButton onClick={() => setAdjusting({ customer: null })}>Offrir des points</GlassButton>}
          />
          {data.customers.length === 0 ? (
            <EmptyState text="Pas encore de client : ils apparaissent à leur première commande avec leur numéro ou leur email." />
          ) : (
            <Plate className="grid">
              <div className="px-4 pt-4">
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Numéro ou email"
                  aria-label="Rechercher un client"
                  enterKeyHint="search"
                  autoComplete="off"
                  className={inputClass}
                />
              </div>
              {customers.length === 0 ? (
                <p className="px-5 py-6 text-center text-muted">Aucun client ne correspond.</p>
              ) : (
                <ul className="m-0 mt-2 list-none p-0" aria-label="Clients du programme">
                  {customers.map((customer) => (
                    <li key={customer.id} className="border-t border-hairline">
                      <button
                        type="button"
                        onClick={() => setAdjusting({ customer })}
                        className="g-press flex min-h-(--g-row-h) w-full items-center gap-4 px-5 py-3 text-left hover:bg-surface-raised/60"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{customer.contact}</span>
                          <span className="block text-g-meta text-muted tabular-nums">
                            {formatDateTime(customer.lastActivity)}
                            {customer.hubriseCustomerId && ` · HubRise · ${customer.hubriseCustomerId}`}
                          </span>
                        </span>
                        <span className="whitespace-nowrap text-right font-semibold tabular-nums">
                          {count(customer.points)}&nbsp;<span className="text-g-meta font-medium text-muted">pts</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Plate>
          )}
        </section>
      </div>

      {editing && (
        <TierFormModal
          tier={editing.tier}
          categories={categories}
          onSubmit={saveTier}
          onDelete={editing.tier ? () => setTierToDelete(editing.tier) : undefined}
          onClose={() => setEditing(null)}
        />
      )}
      {tierToDelete && (
        <ConfirmDialog
          title="Retirer cette récompense ?"
          message={`« ${tierToDelete.label} » disparaît du menu. Les points de vos clients ne bougent pas.`}
          confirmLabel="Retirer la récompense"
          destructive
          onConfirm={() => {
            setEditing(null);
            void removeTier(tierToDelete);
          }}
          onClose={() => setTierToDelete(null)}
        />
      )}
      {customerToErase && (
        <ConfirmDialog
          title="Effacer ce client ?"
          message={`${customerToErase.contact} perd sa carte et ses ${count(customerToErase.points)} points ; ses commandes passées perdent nom, téléphone et note, leurs montants restent pour votre comptabilité.${hubriseConnected ? " Sa fiche est aussi anonymisée dans votre caisse." : ""} C'est définitif : à faire quand le client le demande.`}
          confirmLabel="Effacer le client"
          destructive
          onConfirm={() => {
            setAdjusting(null);
            void erase(customerToErase);
          }}
          onClose={() => setCustomerToErase(null)}
        />
      )}
      {adjusting && (
        <AdjustPointsModal
          customer={adjusting.customer}
          onSubmit={adjust}
          onErase={adjusting.customer ? () => setCustomerToErase(adjusting.customer) : undefined}
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
    <div className="grid gap-6">
      <div className="g-rise" style={rise(0)}>
        <SectionHeading level={1} title="Fidélité" sub="Des points à chaque commande du menu QR" />
      </div>
      {role === "gerant" ? (
        <LoyaltyManager
          etablissementId={state.etablissement.id}
          categories={state.categories}
          hubriseConnected={state.etablissement.hubriseConnected}
        />
      ) : (
        <div className="g-rise" style={rise(1)}>
          <EmptyState text="Réservé au gérant : le programme de fidélité se règle depuis son compte." />
        </div>
      )}
    </div>
  );
}
