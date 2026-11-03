"use client";

import { useState, type ReactNode } from "react";
import { DayPicker } from "@/components/gestion/day-picker";
import { ClockIcon } from "@/components/gestion/icons";
import { HoursField } from "@/components/gestion/hours-field";
import { MenuTargetPicker } from "@/components/gestion/menu-target-picker";
import { PrixInput } from "@/components/gestion/menu/prix-input";
import {
  Chip,
  ConfirmSheet,
  Field,
  GlassButton,
  Input,
  Segmented,
  Sheet,
  Switch,
} from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { TARIF_PREVIEW_LINES } from "@/lib/gestion/constants";
import { describeError } from "@/lib/gestion/errors";
import { useGestion } from "@/lib/gestion/store";
import {
  formatDays,
  formatDaysShort,
  parsePriceInput,
  priceToInput,
} from "@/lib/gestion/format";
import {
  describeRuleTime,
  formatAdjustment,
  formatWindow,
  previewLines,
  ruleUnit,
  suggestRuleName,
} from "@/lib/gestion/tarif-rule";
import type {
  MenuTarget,
  PriceRule,
  PriceRuleDirection,
  PriceRuleUnit,
} from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu/format";
import { type MenuCategory } from "@/lib/menu-data";

/*
 * Tarifs planifiés : le prix de certains articles change les jours dits. Le
 * BOHO fait payer ses chichas 5 € de plus le week-end ; la même mécanique sert
 * à une happy hour ou à un mardi à prix fixe.
 *
 * Ce qui s'y règle est volontairement étroit : des articles, des jours, un
 * prix. Pas de dates, pas de conditions — une règle se répète chaque semaine et
 * s'éteint d'un interrupteur. Le prix de la carte, lui, ne bouge jamais : c'est
 * ce qui permet d'arrêter un tarif sans avoir à se rappeler quel prix il avait
 * remplacé.
 */

const PRICE_CHOICES: { value: PriceRuleDirection; label: string; field: string }[] = [
  { value: "majoration", label: "Plus cher de", field: "Combien de plus" },
  { value: "remise", label: "Moins cher de", field: "Combien de moins" },
  { value: "prix_fixe", label: "Prix fixe", field: "Le prix" },
];

// ---------------------------------------------------------------------------
// Formulaire : une phrase guidée, en trois temps

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-g-body font-semibold">
        <span className="tabular-nums text-muted">{number}. </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function PricePreview({
  categories,
  targets,
  direction,
  unit,
  value,
  days,
  startsAt,
  endsAt,
}: Pick<PriceRule, "direction" | "unit" | "days" | "startsAt" | "endsAt"> & {
  categories: MenuCategory[];
  targets: MenuTarget[];
  value: number | null;
}) {
  const lines =
    value !== null && value > 0 ? previewLines(categories, targets, { direction, unit, value }) : [];
  const free = lines.filter((line) => line.to === 0).length;
  const fixedOnFormats = direction === "prix_fixe" && lines.some((line) => line.startingAt);
  return (
    <div className="g-money g-plate flex flex-col gap-2 p-3" aria-live="polite">
      {lines.length === 0 ? (
        <p className="text-g-label text-muted">Choisissez des articles et un prix pour voir le résultat.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {lines.slice(0, TARIF_PREVIEW_LINES).map((line) => (
            <li key={line.key} className="flex flex-wrap items-baseline justify-between gap-x-3 text-g-label">
              <span className="min-w-0 wrap-anywhere">{line.label}</span>
              <span className="tabular-nums">
                {line.startingAt && <span className="text-muted">dès </span>}
                <span className="text-muted">{formatPrice(line.from)}</span> →{" "}
                <b className="font-semibold text-g-entity">{formatPrice(line.to)}</b>
              </span>
            </li>
          ))}
          {lines.length > TARIF_PREVIEW_LINES && (
            <li className="text-g-meta text-muted">
              + {lines.length - TARIF_PREVIEW_LINES} autre{lines.length - TARIF_PREVIEW_LINES > 1 ? "s" : ""}
            </li>
          )}
        </ul>
      )}
      {fixedOnFormats && (
        <p className="text-g-meta text-muted">
          Pour un article à plusieurs formats, ce prix remplace le prix de départ : les formats gardent leur supplément.
        </p>
      )}
      {free > 0 && (
        <p role="alert" className="text-g-meta font-semibold">
          {free} article{free > 1 ? "s" : ""} à {formatPrice(0)} : le prix ne descend pas plus bas.
        </p>
      )}
      {days.length > 0 && (
        <p className="text-g-meta text-muted">{describeRuleTime({ days, startsAt, endsAt })}</p>
      )}
    </div>
  );
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
  initialTargets?: MenuTarget[];
  onClose: () => void;
}) {
  const toast = useToast();
  // null : le nom suit la proposition, tant que le gérant n'y a pas touché.
  const [typedName, setTypedName] = useState<string | null>(rule?.name ?? null);
  const [direction, setDirection] = useState<PriceRuleDirection>(rule?.direction ?? "majoration");
  const [chosenUnit, setUnit] = useState<PriceRuleUnit>(rule?.unit ?? "montant");
  const [valueRaw, setValueRaw] = useState(rule ? priceToInput(rule.value) : "");
  const [days, setDays] = useState<number[]>(rule?.days ?? []);
  const [allDay, setAllDay] = useState(!rule?.startsAt);
  const [startsAt, setStartsAt] = useState(rule?.startsAt?.slice(0, 5) ?? "");
  const [endsAt, setEndsAt] = useState(rule?.endsAt?.slice(0, 5) ?? "");
  const [targets, setTargets] = useState<MenuTarget[]>(rule?.targets ?? initialTargets);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // `rule` est une photo prise à l'ouverture ; l'état actif se lit dans le store.
  const liveRule = useGestion()?.priceRules.find((candidate) => candidate.id === rule?.id);

  const unit = ruleUnit(direction, chosenUnit);
  const value = parsePriceInput(valueRaw);
  const name = typedName ?? suggestRuleName(direction, days, !allDay);
  const hoursMissing = !allDay && (startsAt === "" || endsAt === "" || startsAt === endsAt);
  const tooLow = direction === "remise" && unit === "pourcentage" && value !== null && value > 100;

  // Un bouton désactivé dit pourquoi (UX-SIMPLICITÉ § 3.9).
  const missing =
    targets.length === 0
      ? "Cochez au moins un article ou une catégorie."
      : days.length === 0
        ? "Cochez au moins un jour pour enregistrer."
        : hoursMissing
          ? "Indiquez les heures de début et de fin."
          : value === null || value <= 0
            ? "Indiquez le prix pour enregistrer."
            : tooLow
              ? "Le prix ne peut pas baisser de plus de 100 %."
              : !name.trim()
                ? "Donnez un nom au tarif pour enregistrer."
                : "";
  const valid = missing === "";

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
        targets,
      };
      if (rule) await api.updatePriceRule(rule.id, input);
      else await api.createPriceRule(input);
      toast.success("Tarif enregistré.");
      onClose();
    } catch (error) {
      toast.error(describeError(error).message);
      setSaving(false);
    }
  };

  // La confirmation remplace la feuille : imbriquée, Échap fermerait les deux.
  if (deleting && rule) {
    return (
        <ConfirmSheet
          title={`Supprimer « ${rule.name} » ?`}
          text="Ce tarif ne s'appliquera plus. Les prix de votre carte, eux, ne changent pas."
          confirmLabel="Supprimer le tarif"
          destructive
          onConfirm={() => {
            setDeleting(false);
            void api
              .deletePriceRule(rule.id)
              .then(() => {
                toast.success("Tarif supprimé.");
                onClose();
              })
              .catch((error: unknown) => toast.error(describeError(error).message));
          }}
          onClose={() => setDeleting(false)}
        />
    );
  }

  const choice = PRICE_CHOICES.find((candidate) => candidate.value === direction);

  return (
    <Sheet
      title={rule ? `Modifier « ${rule.name} »` : "Nouveau tarif"}
      onClose={onClose}
      footer={
        <>
          {(saving || !valid) && <p>{saving ? "Un instant…" : missing}</p>}
          {rule && (
            <GlassButton variant="danger" className="mr-auto" onClick={() => setDeleting(true)}>
              Supprimer
            </GlassButton>
          )}
          <GlassButton onClick={onClose}>Annuler</GlassButton>
          <GlassButton variant="primary" disabled={!valid || saving} onClick={() => void submit()}>
            Enregistrer
          </GlassButton>
        </>
      }
    >
      <div className="flex flex-col gap-7">
        {rule && (
          <Switch
            checked={liveRule?.actif ?? rule.actif}
            onChange={(actif) =>
              void api
                .setPriceRuleActive(rule.id, actif)
                .then(() => toast.success(actif ? "Tarif activé." : "Tarif suspendu."))
                .catch((error: unknown) => toast.error(describeError(error).message))
            }
            label="Tarif actif"
            hint="Suspendu, il cesse de s'appliquer sans être supprimé."
          />
        )}

        <Step number={1} title="Quels articles ?">
          <MenuTargetPicker
            categories={categories}
            value={targets}
            onChange={setTargets}
            label="Articles concernés"
            formats
            compact
          />
        </Step>

        <Step number={2} title="Quand ?">
          <DayPicker value={days} onChange={setDays} />
          <HoursField
            allDay={allDay}
            onAllDayChange={setAllDay}
            startsAt={startsAt}
            onStartsAtChange={setStartsAt}
            endsAt={endsAt}
            onEndsAtChange={setEndsAt}
          />
        </Step>

        <Step number={3} title="Quel prix ?">
          <div role="radiogroup" aria-label="Quel prix" className="grid grid-cols-3 gap-2">
            {PRICE_CHOICES.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={direction === option.value}
                onClick={() => setDirection(option.value)}
                className={`g-press min-h-g-control rounded-xl px-1 py-1.5 text-g-label font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-1 ${
                  direction === option.value
                    ? "ember-gradient text-background"
                    : "border border-hairline text-muted"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              {unit === "montant" ? (
                <PrixInput value={valueRaw} onChange={setValueRaw} aria-label={choice?.field} />
              ) : (
                <Input
                  numeric
                  unit="%"
                  value={valueRaw}
                  onChange={(event) => setValueRaw(event.target.value)}
                  placeholder="10"
                  aria-label={choice?.field}
                />
              )}
            </div>
            {direction !== "prix_fixe" && (
              <Segmented<PriceRuleUnit>
                glass={false}
                label="En euros ou en pourcentage"
                options={[
                  { value: "montant", label: "€" },
                  { value: "pourcentage", label: "%" },
                ]}
                value={unit}
                onChange={setUnit}
              />
            )}
          </div>
          {tooLow && (
            <p role="alert" className="g-field-error">
              <span>Le prix ne peut pas baisser de plus de 100 %.</span>
            </p>
          )}
          <PricePreview
            categories={categories}
            targets={targets}
            direction={direction}
            unit={unit}
            value={value}
            days={days}
            startsAt={allDay ? null : startsAt}
            endsAt={allDay ? null : endsAt}
          />
        </Step>

        <Field label="Nom" required hint="Vos clients le lisent sous le prix. Changez-le si vous voulez.">
          <Input
            value={name}
            onChange={(event) => setTypedName(event.target.value)}
            maxLength={60}
          />
        </Field>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Écran : un tarif se règle devant l'article qu'il touche

const RULE_ROW =
  "flex min-h-g-control w-full flex-col justify-center rounded-g-card border border-hairline px-3 py-1.5 text-left sm:w-auto sm:max-w-full";

/** Une règle en deux lignes : son nom, puis ce qu'elle fait et quand. */
function RuleText({ rule, formats, inherited = false }: { rule: PriceRule; formats?: string; inherited?: boolean }) {
  return (
    <>
      <span className={`truncate text-g-label font-semibold ${rule.actif ? "" : "text-muted"}`}>
        {rule.name}
        {formats}
      </span>
      <span className="truncate text-g-meta text-muted">
        {rule.actif
          ? [
              formatAdjustment(rule),
              rule.days.length === 7 ? "tous les jours" : formatDaysShort(rule.days),
              inherited && "catégorie",
            ]
              .filter(Boolean)
              .join(" · ")
          : "Suspendu"}
      </span>
    </>
  );
}

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
  offerNew = true,
  effective,
}: {
  /** Ce que vise le bouton « + » : cet article, ou cette catégorie. */
  target: MenuTarget;
  /** Règles qui visent exactement cette cible : modifiables ici. */
  owned: PriceRule[];
  /** Règles héritées de la catégorie : rappelées, réglées ailleurs. */
  inherited?: PriceRule[];
  categories: MenuCategory[];
  canEdit: boolean;
  /** Le bouton « + Tarif planifié » : une boutique à emporter le trouve une
   *  fois, sur la catégorie, plutôt que sur chaque article. */
  offerNew?: boolean;
  /** Prix en vigueur à l'instant, relu en base (articles seulement) ; `format` s'il ne vaut que pour lui. */
  effective?: { price: number; ruleName: string; format?: string } | null;
}) {
  const [editing, setEditing] = useState<PriceRule | null>(null);
  const [creating, setCreating] = useState(false);

  // Les formats qu'une règle vise seuls sur cet article : « · Verre 12 cl ».
  const choices =
    target.kind === "item"
      ? categories
          .flatMap((category) => category.items)
          .find((item) => item.id === target.id)
          ?.options?.find((group) => group.formats)?.choices
      : undefined;
  const formatsOf = (rule: PriceRule) => {
    const names = rule.targets.flatMap((candidate) =>
      candidate.kind === "item" && candidate.id === target.id && candidate.choiceId
        ? (choices ?? []).filter((choice) => choice.id === candidate.choiceId).map((choice) => choice.name)
        : []
    );
    return names.length > 0 ? ` · ${names.join(", ")}` : "";
  };

  if (!(canEdit && offerNew) && owned.length === 0 && inherited.length === 0 && !effective) {
    return null;
  }

  return (
    <div className="g-money flex flex-wrap items-center gap-2">
      {effective && (
        <span title={`Tarif en vigueur : ${effective.ruleName}`} className="w-full">
          <Chip icon={<ClockIcon />}>
            En ce moment {effective.format && `${effective.format} `}
            {formatPrice(effective.price)}
          </Chip>
        </span>
      )}
      {owned.map((rule) => (
        <button
          key={rule.id}
          type="button"
          disabled={!canEdit}
          onClick={() => setEditing(rule)}
          title={`${formatDays(rule.days)} · ${formatWindow(rule)}`}
          className={`g-press ${RULE_ROW} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-1`}
        >
          <RuleText rule={rule} formats={formatsOf(rule)} />
        </button>
      ))}
      {inherited.map((rule) => (
        <div
          key={rule.id}
          title={`Posé sur la catégorie · ${formatDays(rule.days)} · ${formatWindow(rule)}`}
          className={`${RULE_ROW} border-dashed`}
        >
          <RuleText rule={rule} inherited />
        </div>
      ))}
      {canEdit && offerNew && (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="g-chip g-press border-dashed text-muted relative after:absolute after:-inset-y-2.5 after:inset-x-0 after:content-['']"
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
