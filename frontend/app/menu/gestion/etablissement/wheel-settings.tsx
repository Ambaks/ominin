"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GiftIcon } from "@/components/gestion/icons";
import {
  Checkbox,
  EmptyState,
  ErrorNotice,
  Field,
  GlassButton,
  Input,
  Plate,
  Shimmer,
  StatTile,
  Switch,
} from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import { describeError } from "@/lib/gestion/errors";
import { loadLoyalty } from "@/lib/gestion/fidelite";
import { parsePriceInput, priceToInput } from "@/lib/gestion/format";
import {
  loadWheel,
  loadWheelStats,
  resolvePrize,
  saveWheel,
  type PrizeDraft,
  type WheelDraft,
  type WheelStats,
} from "@/lib/gestion/wheel";
import { formatPrice } from "@/lib/menu/format";
import { averagePoints, overBudget, prizeChances } from "@/lib/menu/wheel";
import { WHEEL_MAX_PRIZES } from "@/lib/menu/wheel-config";
import type { MenuCategory, MenuItem } from "@/lib/menu-data";
import { PrizeSheet } from "./prize-sheet";
import { SettingsCard } from "./settings-card";
import { average, chanceText, percent } from "./wheel-format";

/*
 * La roue de fidélité (Réglages › La roue). Le gérant pose ses lots — un
 * article de la carte, ou autre chose avec sa photo et son prix — et un
 * budget : ce que la roue offre en moyenne à chaque tour. Les chances se
 * calculent seules (lib/menu/wheel) : chaque lot reçoit une part égale du
 * budget, donc plus il est cher, plus il est rare ; le reste des tours donne
 * des points. Sous la liste, ce que ça coûte pour 100 tours ; plus bas, ce
 * que la roue a vraiment donné. L'interrupteur s'applique seul ; le reste
 * s'enregistre d'un bloc.
 */

const ROW_CLASS =
  "flex min-h-(--g-row-h) w-full items-center gap-3 px-4 py-3 text-left transition-colors touch-manipulation active:bg-surface-raised focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ember-1 hover:bg-surface-raised/60";

type Editing = { index: number | null } | null;

/** Un montant saisi (« 0,20 », « 5 € ») ; null s'il ne se lit pas. */
const amount = (raw: string) => parsePriceInput(raw.replace(/[€\s]/g, ""));

function Thumb({ image }: { image?: string }) {
  return image ? (
    // eslint-disable-next-line @next/next/no-img-element -- photo du lot, choisie par le gérant
    <img src={image} alt="" className="size-10 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-raised text-muted">
      <GiftIcon className="size-5" />
    </span>
  );
}

export function WheelSettings({
  etablissementId,
  categories,
}: {
  etablissementId: string;
  categories: MenuCategory[];
}) {
  const toast = useToast();
  const [saved, setSaved] = useState<WheelDraft | null>(null);
  const [prizes, setPrizes] = useState<PrizeDraft[]>([]);
  const [budgetRaw, setBudgetRaw] = useState("");
  const [minRaw, setMinRaw] = useState("");
  const [golden, setGolden] = useState(false);
  const [everyRaw, setEveryRaw] = useState("");
  const [multiplier, setMultiplier] = useState(0);
  const [loyalty, setLoyalty] = useState<{ enabled: boolean; pointsPerEuro: number } | null>(null);
  const [stats, setStats] = useState<WheelStats | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  const fill = useCallback((wheel: WheelDraft) => {
    setSaved(wheel);
    setPrizes(wheel.prizes);
    setBudgetRaw(priceToInput(wheel.budget));
    setMinRaw(priceToInput(wheel.minOrder));
    setGolden(wheel.golden !== null);
    setEveryRaw(String(wheel.golden?.every ?? ""));
    setMultiplier(wheel.golden?.multiplier ?? 0);
  }, []);

  const load = useCallback(() => {
    Promise.all([loadWheel(etablissementId), loadLoyalty(etablissementId), loadWheelStats(etablissementId)]).then(
      ([wheel, program, results]) => {
        fill(wheel);
        setLoyalty(program.settings);
        setStats(results);
      },
      setLoadError
    );
  }, [etablissementId, fill]);

  useEffect(load, [load]);

  const items = useMemo(
    () => new Map(categories.flatMap((category) => category.items).map((item): [string, MenuItem] => [item.id, item])),
    [categories]
  );

  if (loadError)
    return (
      <ErrorNotice
        error={loadError}
        onRetry={() => {
          setLoadError(null);
          load();
        }}
      />
    );
  if (!saved || !loyalty) return <Shimmer className="h-96" />;

  const budget = amount(budgetRaw);
  const minOrder = minRaw.trim() === "" ? 0 : amount(minRaw);
  const every = Number(everyRaw);
  const goldenValid = !golden || (Number.isInteger(every) && every >= 2);
  const resolved = prizes.map((prize) => resolvePrize(prize, items));
  const playing = resolved.flatMap((prize) => prize ?? []);
  const prices = playing.map((prize) => prize.price);
  const tooHigh = budget !== null && budget > 0 && overBudget(budget, prices);
  const chances = budget && budget > 0 ? prizeChances(budget, prices) : prices.map(() => 0);
  const lotsChance = chances.reduce((sum, chance) => sum + chance, 0);
  const costPerSpin = playing.reduce((sum, prize, i) => sum + prize.price * chances[i], 0);
  const pointsPerSpin = averagePoints(1 - lotsChance);

  const errors = {
    budget:
      budget === null || budget <= 0
        ? "Indiquez un montant, par exemple 0,20."
        : tooHigh
          ? "Trop haut pour ces lots : même toute la roue n'y suffit pas. Baissez-le, ou ajoutez un lot plus cher."
          : undefined,
    minOrder: minOrder === null ? "Indiquez un montant, par exemple 5." : undefined,
    every: goldenValid ? undefined : "Au moins 2 tours, par exemple 5.",
  };
  const valid = !Object.values(errors).some(Boolean);
  const current: WheelDraft = {
    enabled: saved.enabled,
    budget: budget ?? 0,
    minOrder: minOrder ?? 0,
    golden: golden ? { every, multiplier: multiplier || 2 } : null,
    prizes,
  };
  const unchanged = JSON.stringify(current) === JSON.stringify(saved);

  const toggle = async (enabled: boolean) => {
    setToggling(true);
    try {
      await saveWheel(etablissementId, { ...saved, enabled });
      setSaved({ ...saved, enabled });
      toast.success(enabled ? "La roue tourne sur votre menu." : "Roue éteinte.");
    } catch (error) {
      toast.error(describeError(error).message);
    } finally {
      setToggling(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!valid) return;
    setSaving(true);
    try {
      await saveWheel(etablissementId, current);
      fill(current);
      setSubmitted(false);
      toast.success("Roue enregistrée.");
    } catch (error) {
      toast.error(describeError(error).message);
    } finally {
      setSaving(false);
    }
  };

  const editingIndex = editing?.index ?? null;
  const othersPrices = playing.flatMap((prize, i) =>
    editingIndex !== null && resolved.indexOf(prize) === editingIndex ? [] : [prices[i]]
  );
  const full = prizes.length >= WHEEL_MAX_PRIZES;

  return (
    <>
      <SettingsCard
        title="Roue sur le menu"
        text={
          !loyalty.enabled
            ? "La roue crédite des points : allumez d'abord la fidélité pour qu'elle apparaisse."
            : saved.enabled
              ? `Un tour par jour pour chaque client, après une commande réglée d'au moins ${formatPrice(saved.minOrder)}.`
              : "Éteinte : vos clients ne la voient pas."
        }
        right={
          loyalty.enabled ? (
            <Switch
              checked={saved.enabled}
              onChange={(next) => void toggle(next)}
              disabled={toggling || saving}
              aria-label="Roue sur le menu"
            />
          ) : (
            <GlassButton href="/gestion/fidelite">Fidélité</GlassButton>
          )
        }
      />

      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <SettingsCard
          title="Lots et chances"
          text="Un article de votre carte ou autre chose. Chaque lot reçoit une part égale du budget : plus il est cher, plus il est rare."
          right={
            <GlassButton onClick={() => setEditing({ index: null })} disabled={full}>
              Ajouter un lot
            </GlassButton>
          }
        >
          {full && (
            <p className="-mt-2 text-g-meta text-muted">
              {WHEEL_MAX_PRIZES} lots au plus : retirez-en un pour en ajouter un autre.
            </p>
          )}
          <Field
            label="Budget par tour"
            required
            hint="Ce que la roue offre en lots, en moyenne, à chaque tour (en prix de carte)."
            error={submitted || tooHigh ? errors.budget : undefined}
          >
            <Input
              numeric
              unit="€"
              value={budgetRaw}
              onChange={(event) => setBudgetRaw(event.target.value)}
              onBlur={() => budget !== null && setBudgetRaw(priceToInput(budget))}
              placeholder="0,20"
              className="w-32"
            />
          </Field>

          {prizes.length === 0 ? (
            <EmptyState
              text="Aucun lot : chaque tour donne des points."
              action={<GlassButton onClick={() => setEditing({ index: null })}>Ajouter un lot</GlassButton>}
            />
          ) : (
            <Plate>
              <ul aria-label="Lots de la roue" className="divide-y divide-hairline">
                {prizes.map((prize, index) => {
                  const shown = resolved[index];
                  const chance = shown ? chances[playing.indexOf(shown)] : 0;
                  return (
                    <li key={index}>
                      <button type="button" onClick={() => setEditing({ index })} className={ROW_CLASS}>
                        <Thumb image={shown?.image} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-g-body font-semibold">
                            {shown?.label ?? (prize.label || "Article retiré de la carte")}
                          </span>
                          <span className="block truncate text-g-meta text-muted">
                            {prize.itemId ? "De la carte" : "Hors carte"}
                            {shown && ` · ${formatPrice(shown.price)}`}
                          </span>
                        </span>
                        <span className="shrink-0 text-right text-g-label font-semibold tabular-nums">
                          {!shown ? "Hors de la roue" : budget && !tooHigh ? chanceText(chance) : "—"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Plate>
          )}

          {budget !== null && budget > 0 && (
            <div className="grid gap-g-gap sm:grid-cols-3">
              <StatTile
                plain
                label="Coût moyen par tour"
                value={playing.length ? formatPrice(costPerSpin) : "—"}
                baseline={playing.length ? `${percent(lotsChance)} des tours gagnent un lot` : "Pas encore de lot"}
              />
              <StatTile
                plain
                label="Sur 100 tours"
                value={playing.length ? `${formatPrice(costPerSpin * 100)} de lots` : "—"}
                baseline={playing.map((prize, i) => `${average(chances[i] * 100)} × ${prize.label}`).join(" · ") || undefined}
              />
              <StatTile
                plain
                label="Points par tour"
                value={`≈ ${average(pointsPerSpin)}`}
                baseline={
                  loyalty.pointsPerEuro > 0
                    ? `Sur les autres tours : ce que rapportent ${formatPrice(pointsPerSpin / loyalty.pointsPerEuro)} de commande`
                    : "Sur les autres tours, de +2 à +50"
                }
              />
            </div>
          )}
        </SettingsCard>

        <SettingsCard title="Conditions" text="Quand un client peut tourner, et le tour qui rapporte double.">
          <Field
            label="Commande minimum"
            hint="Ce qu'il faut payer en marchandise, le jour même, pour ouvrir le tour."
            error={submitted ? errors.minOrder : undefined}
          >
            <Input
              numeric
              unit="€"
              value={minRaw}
              onChange={(event) => setMinRaw(event.target.value)}
              onBlur={() => minOrder !== null && setMinRaw(priceToInput(minOrder))}
              placeholder="5"
              className="w-32"
            />
          </Field>
          <Checkbox
            checked={golden}
            onChange={setGolden}
            label="Roue dorée"
            hint={`Un tour sur ${goldenValid && every ? every : "…"}, les points sont multipliés par ${multiplier || 2}.`}
          />
          {golden && (
            <Field label="Tous les" error={submitted ? errors.every : undefined}>
              <Input
                numeric
                unit="tours"
                inputMode="numeric"
                value={everyRaw}
                onChange={(event) => setEveryRaw(event.target.value)}
                placeholder="5"
                className="w-36"
              />
            </Field>
          )}
        </SettingsCard>

        <div className="flex flex-wrap items-center justify-end gap-3">
          {unchanged && <p className="text-g-meta text-muted">Rien à enregistrer.</p>}
          <GlassButton variant="primary" type="submit" disabled={saving || unchanged}>
            {saving ? "Enregistrement…" : "Enregistrer la roue"}
          </GlassButton>
        </div>
      </form>

      {stats && stats.spins > 0 && (
        <SettingsCard title="Ce que la roue a donné" text="Depuis son lancement, sur votre menu.">
          <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-g-label">
            <dt className="text-muted">Tours joués</dt>
            <dd className="text-right font-semibold tabular-nums">{stats.spins.toLocaleString("fr-FR")}</dd>
            <dt className="text-muted">Points crédités</dt>
            <dd className="text-right font-semibold tabular-nums">{stats.points.toLocaleString("fr-FR")}</dd>
            {stats.prizes.map((prize) => (
              <div key={prize.label} className="contents">
                <dt className="text-muted">{prize.label}</dt>
                <dd className="text-right font-semibold tabular-nums">
                  {prize.won} gagné{prize.won > 1 ? "s" : ""} · {prize.used} utilisé{prize.used > 1 ? "s" : ""}
                </dd>
              </div>
            ))}
          </dl>
        </SettingsCard>
      )}

      {editing && (
        <PrizeSheet
          initial={editingIndex === null ? null : prizes[editingIndex]}
          categories={categories}
          items={items}
          budget={budget && budget > 0 ? budget : null}
          otherPrices={othersPrices}
          onClose={() => setEditing(null)}
          onRemove={
            editingIndex === null
              ? undefined
              : () => {
                  setPrizes(prizes.filter((_, i) => i !== editingIndex));
                  setEditing(null);
                }
          }
          onSave={(prize) => {
            setPrizes(editingIndex === null ? [...prizes, prize] : prizes.map((old, i) => (i === editingIndex ? prize : old)));
            setEditing(null);
          }}
        />
      )}
    </>
  );
}
