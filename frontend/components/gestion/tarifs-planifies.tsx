"use client";

import { useState } from "react";
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
import { describeError } from "@/lib/gestion/errors";
import { useGestion } from "@/lib/gestion/store";
import {
  formatDays,
  parsePriceInput,
  priceToInput,
} from "@/lib/gestion/format";
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
  const [targets, setTargets] = useState<MenuTarget[]>(
    rule?.targets ?? initialTargets
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // `rule` est une photo prise à l'ouverture ; l'état actif se lit dans le store.
  const liveRule = useGestion()?.priceRules.find((candidate) => candidate.id === rule?.id);

  const value = parsePriceInput(valueRaw);
  const valid =
    name.trim().length > 0 &&
    value !== null &&
    value > 0 &&
    !(unit === "pourcentage" && direction === "remise" && value > 100) &&
    days.length > 0 &&
    targets.length > 0 &&
    (allDay || (startsAt !== "" && endsAt !== "" && startsAt !== endsAt));

  // Un bouton désactivé dit pourquoi (UX-SIMPLICITÉ § 3.9).
  const missing = !name.trim()
    ? "Donnez un nom au tarif pour enregistrer."
    : value === null || value <= 0
      ? "Indiquez l'écart de prix pour enregistrer."
      : unit === "pourcentage" && direction === "remise" && value > 100
        ? "Une remise ne peut pas dépasser 100 %."
        : days.length === 0
          ? "Cochez au moins un jour pour enregistrer."
          : !allDay && (startsAt === "" || endsAt === "" || startsAt === endsAt)
            ? "Indiquez les heures de début et de fin."
            : targets.length === 0
              ? "Cochez au moins un article ou une catégorie."
              : "";

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
      <div className="flex flex-col gap-5">
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
        <Field
          label="Nom"
          required
          hint="Affiché à vos clients sous le prix, pour qu'ils sachent pourquoi il change."
        >
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={60}
            placeholder="Tarif week-end"
            data-autofocus={rule ? undefined : ""}
          />
        </Field>

        <div className="g-field">
          <span className="g-field-label">
            Écart<b aria-hidden>*</b>
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented<PriceRuleDirection>
              glass={false}
              label="Sens de l'écart"
              options={[
                { value: "majoration", label: "Majoration" },
                { value: "remise", label: "Remise" },
              ]}
              value={direction}
              onChange={setDirection}
            />
            {unit === "montant" ? (
              <PrixInput value={valueRaw} onChange={setValueRaw} aria-label="Écart en euros" className="w-28" />
            ) : (
              <Input
                numeric
                unit="%"
                value={valueRaw}
                onChange={(event) => setValueRaw(event.target.value)}
                placeholder="10"
                aria-label="Écart en pourcentage"
                className="w-28"
              />
            )}
            <Segmented<PriceRuleUnit>
              glass={false}
              label="Unité de l'écart"
              options={[
                { value: "montant", label: "€" },
                { value: "pourcentage", label: "%" },
              ]}
              value={unit}
              onChange={setUnit}
            />
          </div>
          {unit === "pourcentage" &&
            direction === "remise" &&
            value !== null &&
            value > 100 && (
              <p role="alert" className="g-field-error">
                <span>Une remise ne peut pas dépasser 100 %.</span>
              </p>
            )}
        </div>

        <DayPicker value={days} onChange={setDays} />

        <HoursField
          allDay={allDay}
          onAllDayChange={setAllDay}
          startsAt={startsAt}
          onStartsAtChange={setStartsAt}
          endsAt={endsAt}
          onEndsAtChange={setEndsAt}
        />

        <MenuTargetPicker
          categories={categories}
          value={targets}
          onChange={setTargets}
          label="Articles concernés"
          formats
        />
      </div>
    </Sheet>
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
    <div className="g-money flex flex-wrap items-center gap-1.5">
      {effective && (
        <span title={`Tarif en vigueur : ${effective.ruleName}`}>
          <Chip icon={<ClockIcon />}>
            En ce moment {effective.format && `${effective.format} `}
            {formatPrice(effective.price)}
          </Chip>
        </span>
      )}
      {owned.map((rule) => (
        // Une pastille qu'on peut ouvrir : la classe du kit sur un bouton.
        <button
          key={rule.id}
          type="button"
          disabled={!canEdit}
          onClick={() => setEditing(rule)}
          title={`${formatDays(rule.days)} · ${formatWindow(rule)}`}
          className={`g-chip g-press max-w-full truncate relative after:absolute after:-inset-y-2.5 after:inset-x-0 after:content-[''] ${rule.actif ? "" : "text-muted line-through"}`}
        >
          {rule.name} {formatAdjustment(rule)}
          {formatsOf(rule)}
        </button>
      ))}
      {inherited.map((rule) => (
        <span
          key={rule.id}
          title={`Posé sur la catégorie · ${formatDays(rule.days)} · ${formatWindow(rule)}`}
          className={`g-chip max-w-full truncate ${rule.actif ? "" : "text-muted line-through"}`}
        >
          {rule.name} {formatAdjustment(rule)} · catégorie
        </span>
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
