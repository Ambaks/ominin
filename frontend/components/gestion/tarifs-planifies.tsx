"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { PriceInput } from "@/components/ui/price-input";
import { Toggle } from "@/components/ui/toggle";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { WEEK_DAYS } from "@/lib/gestion/constants";
import {
  formatDays,
  parsePriceInput,
  priceToInput,
} from "@/lib/gestion/format";
import type {
  PriceRule,
  PriceRuleDirection,
  PriceRuleTarget,
  PriceRuleUnit,
} from "@/lib/gestion/types";
import { formatPrice, type MenuCategory } from "@/lib/menu-data";

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

export function formatAdjustment(rule: PriceRule): string {
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

// ---------------------------------------------------------------------------
// Formulaire

const targetKey = (target: PriceRuleTarget) => `${target.kind}:${target.id}`;

function parseTargetKey(key: string): PriceRuleTarget {
  const [kind, id] = key.split(":", 2);
  return kind === "category"
    ? { kind: "category", id }
    : { kind: "item", id };
}

export function RuleForm({
  rule,
  categories,
  initialTargets = [],
  onClose,
}: {
  rule: PriceRule | null;
  categories: MenuCategory[];
  /** Nouveau tarif ouvert depuis un article : celui-ci est déjà coché. */
  initialTargets?: PriceRuleTarget[];
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
    (rule?.targets ?? initialTargets).map(targetKey)
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
          {rule && (
            <button
              type="button"
              onClick={() => setDeleting(true)}
              className="mr-auto rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold text-ember-3 transition-colors hover:border-ember-3/40"
            >
              Supprimer
            </button>
          )}
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
      {deleting && rule && (
        <ConfirmDialog
          title="Supprimer ce tarif ?"
          message={`« ${rule.name} » ne s'appliquera plus. Les prix de votre carte, eux, ne changent pas.`}
          confirmLabel="Supprimer"
          destructive
          onConfirm={() => {
            setDeleting(false);
            void api
              .deletePriceRule(rule.id)
              .then(() => {
                toast.success("Tarif supprimé.");
                onClose();
              })
              .catch((error: unknown) =>
                toast.error(
                  error instanceof Error ? error.message : "Une erreur est survenue."
                )
              );
          }}
          onClose={() => setDeleting(false)}
        />
      )}
      <div className="flex flex-col gap-5">
        {rule && (
          <label className="flex items-center justify-between gap-4 rounded-2xl border border-hairline bg-background px-4 py-3 text-sm">
            <span className="font-medium">
              Tarif actif
              <span className="mt-0.5 block text-xs font-normal text-muted">
                Suspendu, il cesse de s&apos;appliquer sans être supprimé.
              </span>
            </span>
            <Toggle
              checked={rule.actif}
              onChange={(actif) =>
                void api
                  .setPriceRuleActive(rule.id, actif)
                  .then(() =>
                    toast.success(actif ? "Tarif activé." : "Tarif suspendu.")
                  )
                  .catch((error: unknown) =>
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Une erreur est survenue."
                    )
                  )
              }
              label={`Activer ${rule.name}`}
            />
          </label>
        )}
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
// Écran : un tarif se règle devant l'article qu'il touche

/**
 * Les tarifs planifiés d'une cible — un article, ou une catégorie entière —
 * posés dans la page Menu, là où le gérant regarde ses prix. Une règle de
 * catégorie est rappelée sur chacun de ses articles mais ne s'y modifie pas :
 * elle se règle depuis la catégorie, sinon un geste fait devant un plat
 * changerait le prix de plats qu'on n'a pas sous les yeux.
 */
export function TarifsInline({
  target,
  owned,
  inherited = [],
  categories,
  canEdit,
  effective,
}: {
  /** Ce que vise le bouton « + » : cet article, ou cette catégorie. */
  target: PriceRuleTarget;
  /** Règles qui visent exactement cette cible : modifiables ici. */
  owned: PriceRule[];
  /** Règles héritées de la catégorie : rappelées, réglées ailleurs. */
  inherited?: PriceRule[];
  categories: MenuCategory[];
  canEdit: boolean;
  /** Prix en vigueur à l'instant, relu en base (articles seulement). */
  effective?: { price: number; ruleName: string } | null;
}) {
  const [editing, setEditing] = useState<PriceRule | null>(null);
  const [creating, setCreating] = useState(false);

  if (!canEdit && owned.length === 0 && inherited.length === 0 && !effective) {
    return null;
  }

  const chipClass = (actif: boolean) =>
    `rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
      actif
        ? "border-ember-2/35 text-ember-1"
        : "border-hairline text-faint line-through"
    }`;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {effective && (
        <span
          title={`Tarif en vigueur : ${effective.ruleName}`}
          className="rounded-full bg-ember-2/15 px-2 py-0.5 text-[10px] font-semibold text-ember-1"
        >
          En ce moment {formatPrice(effective.price)}
        </span>
      )}
      {owned.map((rule) => (
        <button
          key={rule.id}
          type="button"
          disabled={!canEdit}
          onClick={() => setEditing(rule)}
          title={`${formatDays(rule.days)} · ${formatWindow(rule)}`}
          className={`${chipClass(rule.actif)} transition-colors enabled:hover:border-ember-2/60`}
        >
          {rule.name} {formatAdjustment(rule)}
        </button>
      ))}
      {inherited.map((rule) => (
        <span
          key={rule.id}
          title={`Posé sur la catégorie · ${formatDays(rule.days)} · ${formatWindow(rule)}`}
          className={chipClass(rule.actif)}
        >
          {rule.name} {formatAdjustment(rule)} · catégorie
        </span>
      ))}
      {canEdit && (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-full border border-dashed border-hairline px-2 py-0.5 text-[10px] font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
        >
          + Tarif planifié
        </button>
      )}

      {(creating || editing) && (
        <RuleForm
          rule={editing}
          categories={categories}
          initialTargets={[target]}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
