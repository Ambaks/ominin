"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { AdjustPointsModal } from "@/components/gestion/fidelite/adjust-points-modal";
import { LoyaltyResults } from "@/components/gestion/fidelite/loyalty-results";
import { TierFormModal } from "@/components/gestion/fidelite/tier-form-modal";
import { FeatureLocked } from "@/components/gestion/feature-locked";
import { ChevronDownIcon } from "@/components/gestion/icons";
import {
  Chip,
  ConfirmSheet,
  EmptyState,
  ErrorNotice,
  Field,
  GlassButton,
  Input,
  Plate,
  ReserveGerant,
  SectionHeading,
  Shimmer,
  Switch,
} from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import { describeError } from "@/lib/gestion/errors";
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
const plural = (n: number, one: string, many: string) => `${count(n)} ${n > 1 ? many : one}`;
const rise = (i: number) => ({ "--g-i": i }) as CSSProperties;
/** L'exemple du taux : ce que rapporte un ticket de ce montant. */
const EXAMPLE_EUROS = 10;
const ROW_CLASS =
  "flex min-h-(--g-row-h) w-full items-center gap-4 px-5 py-3 text-left transition-colors active:bg-surface-raised focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ember-1 hover:bg-surface-raised/60";

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
  const [statsError, setStatsError] = useState<unknown>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [rate, setRate] = useState("");
  const [rateError, setRateError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [editing, setEditing] = useState<TierEditing>(null);
  const [tierToDelete, setTierToDelete] = useState<LoyaltyTier | null>(null);
  const [adjusting, setAdjusting] = useState<Adjusting>(null);
  const [customerToErase, setCustomerToErase] = useState<LoyaltyCustomer | null>(null);
  const [search, setSearch] = useState("");

  const report = useCallback((error: unknown) => toast.error(describeError(error).message), [toast]);

  const refresh = useCallback(async () => {
    try {
      const [next, results] = await Promise.all([
        loadLoyalty(etablissementId),
        loadLoyaltyStats(etablissementId).then(
          (loaded) => ({ loaded, error: null as unknown }),
          (error: unknown) => ({ loaded: null, error })
        ),
      ]);
      setData(next);
      setStats(results.loaded);
      setStatsError(results.error);
      setRate(String(next.settings.pointsPerEuro));
      setLoadError(null);
    } catch (error) {
      setLoadError(error);
    }
  }, [etablissementId]);

  useEffect(() => {
    const load = () => refresh();
    void load();
  }, [refresh]);

  if (!data) {
    return loadError ? (
      <ErrorNotice error={loadError} onRetry={() => void refresh()} />
    ) : (
      <div aria-busy className="grid gap-6 lg:grid-cols-[5fr_7fr]">
        <div className="grid gap-6">
          <Shimmer className="h-(--g-control) max-w-48" />
          <Shimmer className="h-[calc(var(--g-row-h)*4)]" />
          <Shimmer className="h-(--g-control) max-w-48" />
          <Shimmer className="h-[calc(var(--g-row-h)*3)]" />
        </div>
        <div className="grid gap-6">
          <Shimmer className="h-(--g-control) max-w-48" />
          <Shimmer className="h-[calc(var(--g-row-h)*4)]" />
        </div>
      </div>
    );
  }

  const itemNames = new Map(
    categories.flatMap((category) => category.items.map((item) => [item.id, item.name]))
  );

  const setEnabled = async (enabled: boolean) => {
    setSwitching(true);
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
    } finally {
      setSwitching(false);
    }
  };

  const rateValue = Number(rate.replace(",", "."));
  const rateValid = rate.trim() !== "" && Number.isFinite(rateValue) && rateValue > 0;
  const rateChanged = rateValid && rateValue !== data.settings.pointsPerEuro;
  const examplePoints = Math.floor(EXAMPLE_EUROS * rateValue);
  const rateHint = !rateValid
    ? undefined
    : examplePoints > 0
      ? `${EXAMPLE_EUROS} € dépensés rapportent ${plural(examplePoints, "point", "points")}.`
      : `Le premier point tombe à partir de ${count(Math.ceil(1 / rateValue))} € dépensés.`;

  const saveRate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!rateChanged) return;
    try {
      await saveLoyaltySettings(etablissementId, { ...data.settings, pointsPerEuro: rateValue });
      await refresh();
      setRateError(null);
      toast.success(`Taux enregistré : ${plural(rateValue, "point", "points")} par euro.`);
    } catch (error) {
      setRateError(describeError(error).message);
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
    setEditing(null);
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
    setAdjusting(null);
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
  let block = 0;

  return (
    <div className="grid gap-6">
      {loadError != null && <ErrorNotice error={loadError} onRetry={() => void refresh()} />}

      {(hasResults || statsError != null) && (
        <section className="g-rise grid gap-4" style={rise(block++)} aria-labelledby="fidelite-resultats">
          <SectionHeading
            id="fidelite-resultats"
            title="Résultats"
            sub={hasResults ? `${plural(stats.weeks.length, "semaine", "semaines")} de programme` : undefined}
          />
          {hasResults ? (
            <LoyaltyResults stats={stats} />
          ) : (
            <ErrorNotice error={statsError} onRetry={() => void refresh()} />
          )}
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
            <Plate className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <Switch
                  checked={enabled}
                  disabled={switching}
                  onChange={(next) => void setEnabled(next)}
                  label="Fidélité sur le menu QR"
                  hint="Le client laisse son numéro ou son email en commandant."
                />
              </div>
              {switching && <Chip>Mise à jour…</Chip>}
            </Plate>
            <Plate>
              <form onSubmit={saveRate} className="grid gap-4 px-5 py-4">
                <Field
                  label="Points par euro dépensé"
                  required
                  hint={rateHint ?? "Hors pourboire et articles offerts, arrondi à l'entier inférieur par commande."}
                  error={rateError ?? (rateValid ? undefined : "Indiquez un taux au-dessus de zéro, 1 point par euro par exemple.")}
                >
                  <Input
                    numeric
                    unit="pt"
                    value={rate}
                    onChange={(event) => {
                      setRate(event.target.value);
                      setRateError(null);
                    }}
                    autoComplete="off"
                    className="max-w-48"
                  />
                </Field>
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <p className="text-g-meta text-muted">
                    {rateChanged ? "Non enregistré." : rateValid ? "Rien à enregistrer." : "Corrigez le taux pour enregistrer."}
                  </p>
                  <GlassButton variant="primary" type="submit" disabled={!rateChanged}>
                    Enregistrer
                  </GlassButton>
                </div>
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
              sub={data.tiers.length ? `${count(data.tiers.length)} sur le menu` : undefined}
              right={
                data.tiers.length > 0 ? (
                  <GlassButton onClick={() => setEditing({ tier: null })}>Ajouter</GlassButton>
                ) : undefined
              }
            />
            {data.tiers.length ? (
              <Plate>
                <ul className="m-0 list-none p-0" aria-label="Récompenses du menu">
                  {data.tiers.map((tier) => {
                    const items = tier.itemIds.map((id) => itemNames.get(id)).filter(Boolean);
                    return (
                      <li key={tier.id} className="border-t border-hairline first:border-t-0">
                        <button
                          type="button"
                          onClick={() => setEditing({ tier })}
                          aria-label={`Modifier la récompense ${tier.label}`}
                          className={`${ROW_CLASS} items-start`}
                        >
                          <span className="w-20 shrink-0 pt-0.5 text-right text-g-label font-semibold tabular-nums">
                            {count(tier.points)}&nbsp;{tier.points > 1 ? "pts" : "pt"}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block break-words font-medium">{tier.label}</span>
                            {items.length ? (
                              <span className="block truncate text-g-meta text-muted">
                                {plural(items.length, "article", "articles")} · {items.join(", ")}
                              </span>
                            ) : (
                              <span className="mt-1 inline-flex">
                                <Chip tone="problem">Aucun article : absente du menu</Chip>
                              </span>
                            )}
                          </span>
                          <ChevronDownIcon className="mt-1 size-(--g-icon-sm) shrink-0 -rotate-90 text-muted" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
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
            <Plate>
              <div className="px-4 pt-4">
                <Input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="06 12 34 56 78"
                  aria-label="Rechercher un client par numéro ou email"
                  enterKeyHint="search"
                  autoComplete="off"
                />
              </div>
              {customers.length === 0 ? (
                <p role="status" className="px-5 py-6 text-center text-muted">
                  Aucun client ne correspond.
                </p>
              ) : (
                <ul className="m-0 mt-2 list-none p-0" aria-label="Clients du programme">
                  {customers.map((customer) => (
                    <li key={customer.id} className="border-t border-hairline">
                      <button
                        type="button"
                        onClick={() => setAdjusting({ customer })}
                        aria-label={`Ajuster les points de ${customer.contact}`}
                        className={ROW_CLASS}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{customer.contact}</span>
                          <span className="block truncate text-g-meta text-muted tabular-nums">
                            {formatDateTime(customer.lastActivity)}
                            {customer.hubriseCustomerId && ` · HubRise · ${customer.hubriseCustomerId}`}
                          </span>
                        </span>
                        <span className="whitespace-nowrap text-right font-semibold tabular-nums">
                          {count(customer.points)}&nbsp;
                          <span className="text-g-meta font-medium text-muted">{customer.points > 1 ? "pts" : "pt"}</span>
                        </span>
                        <ChevronDownIcon className="size-(--g-icon-sm) shrink-0 -rotate-90 text-muted" />
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
        <ConfirmSheet
          title={`Retirer « ${tierToDelete.label} » ?`}
          text="La récompense disparaît du menu. Les points de vos clients ne bougent pas."
          confirmLabel="Retirer la récompense"
          destructive
          onConfirm={() => void removeTier(tierToDelete)}
          onClose={() => setTierToDelete(null)}
        />
      )}
      {customerToErase && (
        <ConfirmSheet
          title={`Effacer ${customerToErase.contact} ?`}
          text={`Le client perd sa carte et ses ${plural(customerToErase.points, "point", "points")} ; ses commandes passées perdent nom, téléphone et note, leurs montants restent pour votre comptabilité.${hubriseConnected ? " Sa fiche est aussi anonymisée dans votre caisse." : ""} C'est définitif : à faire quand le client le demande.`}
          confirmLabel="Effacer le client"
          destructive
          onConfirm={() => void erase(customerToErase)}
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
      <SectionHeading level={1} title="Fidélité" sub="Des points à chaque commande du menu QR" />
      {role === "gerant" ? (
        <LoyaltyManager
          etablissementId={state.etablissement.id}
          categories={state.categories}
          hubriseConnected={state.etablissement.hubriseConnected}
        />
      ) : (
        <ReserveGerant ask="régler le programme de fidélité" />
      )}
    </div>
  );
}
