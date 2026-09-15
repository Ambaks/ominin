"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, inputClass } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { Modal } from "@/components/ui/modal";
import { PriceInput } from "@/components/ui/price-input";
import { Toggle } from "@/components/ui/toggle";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { WEEK_DAYS } from "@/lib/gestion/constants";
import { parsePriceInput, priceToInput } from "@/lib/gestion/format";
import type {
  PriceRule,
  PriceRuleDirection,
  PriceRuleTarget,
  PriceRuleUnit,
} from "@/lib/gestion/types";
import { fetchActiveTarifs, type TarifMap } from "@/lib/menu/tarifs";
import { formatPrice, type MenuCategory } from "@/lib/menu-data";
import { createClient } from "@/lib/supabase/client";

/*
 * Tarifs planifiés : le prix de certains articles change les jours dits. Le
 * BOHO majore ses chichas de 5 € le week-end ; la même mécanique sert à une
 * happy hour ou à un mardi à −2 €.
 *
 * Ce qui s'y règle est volontairement étroit : des articles, des jours, un
 * écart. Pas de dates, pas de conditions — une règle se répète chaque semaine
 * et s'éteint d'un interrupteur. Le prix de la carte, lui, ne bouge jamais :
 * c'est ce qui permet d'arrêter une majoration sans avoir à se rappeler quel
 * prix elle avait remplacé.
 */

// ---------------------------------------------------------------------------
// Mise en mots

/** « samedi et dimanche », « tous les jours », « lundi, mardi et jeudi ». */
function formatDays(days: number[]): string {
  if (days.length === 7) return "tous les jours";
  const names = WEEK_DAYS.filter((day) => days.includes(day.iso)).map(
    (day) => day.long
  );
  if (names.length <= 1) return names[0] ?? "aucun jour";
  return `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}`;
}

function formatAdjustment(rule: PriceRule): string {
  const sign = rule.direction === "remise" ? "−" : "+";
  return rule.unit === "pourcentage"
    ? `${sign}${priceToInput(rule.value)} %`
    : `${sign}${formatPrice(rule.value)}`;
}

function formatWindow(rule: PriceRule): string {
  if (!rule.startsAt || !rule.endsAt) return "toute la journée";
  const short = (time: string) => time.slice(0, 5);
  // Fin avant début : le créneau passe minuit et appartient au jour d'ouverture.
  const overnight = rule.startsAt >= rule.endsAt;
  return `${short(rule.startsAt)} → ${short(rule.endsAt)}${
    overnight ? " (le lendemain)" : ""
  }`;
}

function formatTargets(
  targets: PriceRuleTarget[],
  categories: MenuCategory[]
): string {
  const names = targets.map((target) => {
    if (target.kind === "category") {
      const category = categories.find((c) => c.id === target.id);
      return category ? `toute la catégorie ${category.name}` : "catégorie supprimée";
    }
    for (const category of categories) {
      const item = category.items.find((i) => i.id === target.id);
      if (item) return item.name;
    }
    return "article supprimé";
  });
  return names.join(" · ");
}

// ---------------------------------------------------------------------------
// Formulaire

const targetKey = (target: PriceRuleTarget) => `${target.kind}:${target.id}`;

function parseTargetKey(key: string): PriceRuleTarget {
  const [kind, id] = key.split(":", 2);
  return kind === "category"
    ? { kind: "category", id }
    : { kind: "item", id };
}

function RuleForm({
  rule,
  categories,
  onClose,
}: {
  rule: PriceRule | null;
  categories: MenuCategory[];
  onClose: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(rule?.name ?? "");
  const [direction, setDirection] = useState<PriceRuleDirection>(
    rule?.direction ?? "majoration"
  );
  const [unit, setUnit] = useState<PriceRuleUnit>(rule?.unit ?? "montant");
  const [valueRaw, setValueRaw] = useState(
    rule ? priceToInput(rule.value) : ""
  );
  const [days, setDays] = useState<number[]>(rule?.days ?? []);
  const [allDay, setAllDay] = useState(!rule?.startsAt);
  const [startsAt, setStartsAt] = useState(rule?.startsAt?.slice(0, 5) ?? "");
  const [endsAt, setEndsAt] = useState(rule?.endsAt?.slice(0, 5) ?? "");
  const [targetKeys, setTargetKeys] = useState<string[]>(
    rule?.targets.map(targetKey) ?? []
  );
  const [saving, setSaving] = useState(false);

  const value = parsePriceInput(valueRaw);
  const pickedCategories = new Set(
    targetKeys.filter((key) => key.startsWith("category:"))
  );
  const valid =
    name.trim().length > 0 &&
    value !== null &&
    value > 0 &&
    !(unit === "pourcentage" && direction === "remise" && value > 100) &&
    days.length > 0 &&
    targetKeys.length > 0 &&
    (allDay || (startsAt !== "" && endsAt !== "" && startsAt !== endsAt));

  const toggleDay = (iso: number) =>
    setDays((current) =>
      current.includes(iso)
        ? current.filter((day) => day !== iso)
        : [...current, iso].sort((a, b) => a - b)
    );

  const toggleTarget = (key: string) =>
    setTargetKeys((current) =>
      current.includes(key)
        ? current.filter((candidate) => candidate !== key)
        : [...current, key]
    );

  const submit = async () => {
    if (!valid || value === null) return;
    setSaving(true);
    try {
      const input: api.PriceRuleInput = {
        name: name.trim(),
        direction,
        unit,
        value,
        days,
        startsAt: allDay ? null : startsAt,
        endsAt: allDay ? null : endsAt,
        targets: targetKeys.map(parseTargetKey),
      };
      if (rule) await api.updatePriceRule(rule.id, input);
      else await api.createPriceRule(input);
      toast.success("Tarif enregistré.");
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
      setSaving(false);
    }
  };

  return (
    <Modal
      title={rule ? "Modifier le tarif" : "Nouveau tarif"}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold text-muted transition-colors hover:text-foreground"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={!valid || saving}
            onClick={() => void submit()}
            className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-40"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Field
          label="Nom"
          required
          hint="Affiché à vos clients sous le prix, pour qu'ils sachent pourquoi il change."
        >
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={60}
            placeholder="Tarif week-end"
            className={inputClass}
          />
        </Field>

        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">
            Écart <span className="text-ember-2">*</span>
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              options={[
                { value: "majoration", label: "Majoration" },
                { value: "remise", label: "Remise" },
              ]}
              value={direction}
              onChange={(next) => setDirection(next as PriceRuleDirection)}
            />
            {unit === "montant" ? (
              <PriceInput
                value={valueRaw}
                onChange={setValueRaw}
                className="w-28"
              />
            ) : (
              <div className="relative w-28">
                <input
                  type="text"
                  inputMode="decimal"
                  value={valueRaw}
                  onChange={(event) => setValueRaw(event.target.value)}
                  placeholder="10"
                  className={`${inputClass} pr-8`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-faint">
                  %
                </span>
              </div>
            )}
            <Segmented
              options={[
                { value: "montant", label: "€" },
                { value: "pourcentage", label: "%" },
              ]}
              value={unit}
              onChange={(next) => setUnit(next as PriceRuleUnit)}
            />
          </div>
          {unit === "pourcentage" &&
            direction === "remise" &&
            value !== null &&
            value > 100 && (
              <span className="text-xs text-ember-3">
                Une remise ne peut pas dépasser 100 %.
              </span>
            )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">
            Jours <span className="text-ember-2">*</span>
          </span>
          <div className="flex gap-1.5">
            {WEEK_DAYS.map((day) => {
              const picked = days.includes(day.iso);
              return (
                <button
                  key={day.iso}
                  type="button"
                  onClick={() => toggleDay(day.iso)}
                  aria-pressed={picked}
                  aria-label={day.long}
                  className={`flex size-9 items-center justify-center rounded-xl text-sm font-semibold transition-colors ${
                    picked
                      ? "ember-gradient text-background"
                      : "border border-hairline text-muted hover:border-ember-2/40 hover:text-foreground"
                  }`}
                >
                  {day.short}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <label className="flex items-center gap-3">
            <Toggle
              checked={allDay}
              onChange={setAllDay}
              label="Toute la journée"
            />
            <span className="text-sm">Toute la journée</span>
          </label>
          {!allDay && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="time"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
                aria-label="Heure de début"
                className={`${inputClass} w-32`}
              />
              <span className="text-sm text-faint">→</span>
              <input
                type="time"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
                aria-label="Heure de fin"
                className={`${inputClass} w-32`}
              />
              {startsAt !== "" && endsAt !== "" && startsAt >= endsAt && (
                <span className="w-full text-xs text-faint">
                  Le créneau passe minuit : il se rattache au jour où il
                  commence.
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">
            Articles concernés <span className="text-ember-2">*</span>
          </span>
          <p className="text-xs text-faint">
            Cochez une catégorie entière et les articles que vous y ajouterez
            plus tard suivront d&apos;eux-mêmes.
          </p>
          <div className="flex flex-col gap-3 rounded-2xl border border-hairline bg-surface p-4">
            {categories.map((category) => {
              const wholeCategory = pickedCategories.has(
                `category:${category.id}`
              );
              return (
                <div key={category.id} className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2.5 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={wholeCategory}
                      onChange={() => toggleTarget(`category:${category.id}`)}
                      className="size-4 accent-ember-2"
                    />
                    {category.name}
                  </label>
                  <div className="flex flex-col gap-1 pl-7">
                    {category.items.map((item) => (
                      <label
                        key={item.id}
                        className={`flex items-center gap-2.5 text-sm ${
                          wholeCategory ? "text-faint" : "text-muted"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={
                            wholeCategory ||
                            targetKeys.includes(`item:${item.id}`)
                          }
                          disabled={wholeCategory}
                          onChange={() => toggleTarget(`item:${item.id}`)}
                          className="size-4 accent-ember-2"
                        />
                        {item.name}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex rounded-full border border-hairline p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            value === option.value
              ? "ember-gradient text-background"
              : "text-muted hover:text-foreground"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Écran

/**
 * Ce que les règles donnent à cet instant précis, relu en base. C'est le seul
 * endroit qui dit la vérité sans réinterpréter : plutôt que de recalculer les
 * jours et les heures côté navigateur — au risque d'un écart avec le calcul
 * qui facture —, l'écran demande les prix en cours et les affiche.
 */
function EnCeMoment({
  etablissementId,
  categories,
  rules,
}: {
  etablissementId: string;
  categories: MenuCategory[];
  rules: PriceRule[];
}) {
  const [tarifs, setTarifs] = useState<TarifMap | null>(null);

  useEffect(() => {
    let live = true;
    fetchActiveTarifs(createClient(), etablissementId)
      .then((loaded) => {
        if (live) setTarifs(loaded);
      })
      .catch(() => {
        if (live) setTarifs(new Map());
      });
    return () => {
      live = false;
    };
    // `rules` en dépendance : après une modification, la relecture montre son
    // effet immédiat plutôt que l'état d'avant.
  }, [etablissementId, rules]);

  if (!tarifs || tarifs.size === 0) return null;

  const lines = categories.flatMap((category) =>
    category.items.flatMap((item) => {
      const tarif = tarifs.get(item.id);
      return tarif ? [{ item, tarif }] : [];
    })
  );

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-ember-2/30 bg-ember-2/5 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ember-1">
        En ce moment
      </p>
      <ul className="flex flex-col gap-1">
        {lines.map(({ item, tarif }) => (
          <li
            key={item.id}
            className="flex items-baseline justify-between gap-4 text-sm"
          >
            <span className="min-w-0 truncate">
              {item.name}
              <span className="ml-2 text-xs text-faint">{tarif.ruleName}</span>
            </span>
            <span className="shrink-0 tabular-nums">
              <span className="mr-2 text-faint line-through">
                {formatPrice(item.price)}
              </span>
              <span className="font-semibold text-ember-1">
                {formatPrice(tarif.price)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TarifsPlanifies({
  etablissementId,
  rules,
  categories,
}: {
  etablissementId: string;
  rules: PriceRule[];
  categories: MenuCategory[];
}) {
  const toast = useToast();
  const [editing, setEditing] = useState<PriceRule | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<PriceRule | null>(null);

  const run = async (action: Promise<unknown>, done: string) => {
    try {
      await action;
      toast.success(done);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    }
  };

  return (
    <section className="flex max-w-xl flex-col gap-4 rounded-2xl border border-hairline bg-surface p-5 lg:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-medium">Tarifs planifiés</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Faites monter ou descendre le prix de certains articles les jours
            que vous choisissez. Le prix de votre carte ne change pas : l&apos;écart
            s&apos;applique tout seul, et cesse tout seul.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="shrink-0 rounded-full border border-hairline px-4 py-2 text-sm font-semibold transition-colors hover:border-ember-2/40"
        >
          Nouveau
        </button>
      </div>

      <EnCeMoment
        etablissementId={etablissementId}
        categories={categories}
        rules={rules}
      />

      {rules.length === 0 ? (
        <EmptyState
          title="Aucun tarif planifié"
          body="Par exemple : les chichas à +5 € le samedi et le dimanche, ou une happy hour à −20 % du lundi au jeudi."
        />
      ) : (
        <ul className="flex flex-col divide-y divide-hairline">
          {rules.map((rule) => (
            <li key={rule.id} className="flex items-start gap-3 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline gap-2 text-sm font-medium">
                  <span className="truncate">{rule.name}</span>
                  <span className="shrink-0 tabular-nums text-ember-1">
                    {formatAdjustment(rule)}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {formatDays(rule.days)} · {formatWindow(rule)}
                </p>
                <p className="mt-0.5 truncate text-xs text-faint">
                  {formatTargets(rule.targets, categories)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Toggle
                  checked={rule.actif}
                  onChange={(actif) =>
                    void run(
                      api.setPriceRuleActive(rule.id, actif),
                      actif ? "Tarif activé." : "Tarif suspendu."
                    )
                  }
                  label={`Activer ${rule.name}`}
                />
                <button
                  type="button"
                  onClick={() => setEditing(rule)}
                  className="rounded-full border border-hairline px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
                >
                  Modifier
                </button>
                <IconButton
                  tone="danger"
                  onClick={() => setDeleting(rule)}
                  aria-label={`Supprimer ${rule.name}`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden
                  >
                    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                  </svg>
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(creating || editing) && (
        <RuleForm
          rule={editing}
          categories={categories}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Supprimer ce tarif ?"
          message={`« ${deleting.name} » ne s'appliquera plus. Les prix de votre carte, eux, ne changent pas.`}
          confirmLabel="Supprimer"
          destructive
          onConfirm={() => {
            const rule = deleting;
            setDeleting(null);
            void run(api.deletePriceRule(rule.id), "Tarif supprimé.");
          }}
          onClose={() => setDeleting(null)}
        />
      )}
    </section>
  );
}
