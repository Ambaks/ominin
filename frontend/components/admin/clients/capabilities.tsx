"use client";

import { useState } from "react";
import { Toggle } from "@/components/ui/toggle";
import { useToast } from "@/components/ui/toast";
import {
  clientFeatures,
  nextOverrides,
  saveOverrides,
  type Client,
} from "@/lib/admin/clients";
import { OFFRE_LABELS, VIEWS } from "@/lib/gestion/constants";
import type { Feature } from "@/lib/gestion/types";

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

      <p className="text-xs leading-relaxed text-faint">
        Une case laissée telle que l&rsquo;offre la donne ne s&rsquo;enregistre
        pas : ce client suivra les évolutions d&rsquo;
        {client.products.offre
          ? `Ominin ${OFFRE_LABELS[client.products.offre]}`
          : "son offre"}
        . Les écarts, eux, tiennent jusqu&rsquo;à ce qu&rsquo;on les retire.
      </p>
    </div>
  );
}
