"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RestaurantPicker } from "@/components/admin/restaurant-picker";
import { EmptyState } from "@/components/ui/empty-state";
import { inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useAdminBasePath } from "@/lib/admin/base-path";
import {
  deckUploaded,
  fetchClientPlaces,
  fetchSettings,
  linkClient,
  updateSettings,
  uploadDeck,
  type ClientPlace,
  type CommercialSettings,
} from "@/lib/admin/commerciaux";
import { formatDate } from "@/lib/admin/format";
import { useProjet } from "@/lib/admin/projet";
import type { LeadLite } from "@/lib/admin/types";
import { GHOST_BUTTON } from "./commerciaux-tab";

type NumericKey = {
  [K in keyof CommercialSettings]: CommercialSettings[K] extends number | null ? K : never;
}[keyof CommercialSettings];

/*
 * Réglages saisis par l'admin (13.2 n° 15) : aucune valeur n'est écrite dans
 * le code. Vide, une règle est désactivée ; celles qui ne peuvent pas l'être
 * sont signalées « à remplir avant la première invitation ».
 */
const EDITABLE: { key: NumericKey; label: string; unit: string; empty: string; required?: boolean }[] = [
  { key: "declaration_cap", label: "Plafond de déclarations actives", unit: "par commercial", empty: "pas de plafond" },
  { key: "cooldown_days", label: "Carence après un abandon ou une expiration", unit: "jours", empty: "pas de carence" },
  { key: "in_talks_days", label: "« En discussion » après une réponse ou une action d’un fondateur", unit: "jours", empty: "règle désactivée" },
  { key: "search_max_results", label: "Résultats par recherche", unit: "restaurants", empty: "recherche fermée", required: true },
  { key: "search_daily_quota", label: "Recherches par jour", unit: "par commercial", empty: "sans quota" },
  { key: "places_daily_quota", label: "Recherches Google par jour", unit: "par commercial", empty: "Google désactivé" },
  { key: "retained_note_max_chars", label: "Précision de la fiche retenue", unit: "caractères", empty: "sans limite" },
  { key: "expiry_warning_days", label: "Prévenir avant l’expiration d’une réservation", unit: "jours", empty: "pas d’alerte" },
  { key: "option_reminder_days", label: "Rappel de l’option avant l’échéance du contrat", unit: "jours", empty: "pas de rappel" },
  { key: "signup_link_days", label: "Validité d’un lien d’inscription", unit: "jours", empty: "liens fermés", required: true },
  { key: "appointment_reminder_minutes", label: "Rappel avant un rendez-vous", unit: "minutes", empty: "pas de rappel" },
  { key: "nearby_radius_m", label: "Rayon de « Autour de moi »", unit: "mètres", empty: "carte fermée", required: true },
  { key: "name_similarity", label: "Similarité de nom pour l’alerte « déjà client ? »", unit: "entre 0 et 1", empty: "pas d’alerte" },
];

const CONTRACT: { key: keyof CommercialSettings; label: string; unit: string }[] = [
  { key: "confirm_days", label: "Délai de confirmation", unit: "jours" },
  { key: "sign_window_months", label: "Fenêtre de signature", unit: "mois" },
  { key: "commission_percent", label: "Commission", unit: "%" },
  { key: "term_months", label: "Durée du contrat et de la commission par restaurant", unit: "mois" },
  { key: "option_years", label: "Option de prolongation", unit: "ans" },
  { key: "notice_months", label: "Préavis de résiliation", unit: "mois" },
  { key: "statement_before_day", label: "Relevé avant le", unit: "du mois" },
  { key: "payment_days", label: "Paiement après la facture", unit: "jours" },
  { key: "contest_months", label: "Contestation d’un relevé", unit: "mois" },
];

function SettingsForm() {
  const toast = useToast();
  const [settings, setSettings] = useState<CommercialSettings | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [demos, setDemos] = useState("");

  const load = useCallback(
    () =>
      fetchSettings().then((loaded) => {
        setSettings(loaded);
        setDraft(Object.fromEntries(EDITABLE.map(({ key }) => [key, loaded[key]?.toString() ?? ""])));
        setDemos(loaded.kit_demo_slugs.join(", "));
      }),
    []
  );
  useEffect(() => void load(), [load]);

  if (!settings) return <div aria-busy className="shimmer h-60 rounded-2xl" />;

  const save = async () => {
    try {
      await updateSettings({
        ...Object.fromEntries(EDITABLE.map(({ key }) => [key, draft[key] === "" ? null : Number(draft[key])])),
        kit_demo_slugs: demos
          .split(/[\s,]+/)
          .map((slug) => slug.trim())
          .filter(Boolean),
      });
      toast.success("Réglages enregistrés.");
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Une erreur est survenue.");
    }
  };

  const missing = EDITABLE.filter(({ key, required }) => required && settings[key] === null);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-faint">Réglages de l’espace</h2>
      {missing.length > 0 && (
        <p className="rounded-xl border border-ember-3/40 bg-ember-3/10 px-4 py-3 text-sm text-ember-3">
          À remplir avant la première invitation : {missing.map(({ label }) => label.toLowerCase()).join(", ")}.
        </p>
      )}
      <ul className="flex flex-col divide-y divide-hairline rounded-2xl border border-hairline bg-surface">
        {EDITABLE.map(({ key, label, unit, empty, required }) => (
          <li key={key} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <label htmlFor={`setting-${key}`} className="min-w-0 flex-1 text-sm">
              {label}
              {required && <span className="text-ember-2"> *</span>}
              <span className="block text-xs text-faint">
                {unit} · vide : {empty}
              </span>
            </label>
            <input
              id={`setting-${key}`}
              type="number"
              step={key === "name_similarity" ? "any" : 1}
              min={0}
              value={draft[key] ?? ""}
              onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
              className={`${inputClass} w-32`}
            />
          </li>
        ))}
        <li className="flex flex-col gap-2 px-4 py-3">
          <label htmlFor="setting-demos" className="text-sm">
            Démos du Kit
            <span className="block text-xs text-faint">
              Slugs de /menu/demo, séparés par des virgules ; la démo Ominin est toujours proposée.
            </span>
          </label>
          <input id="setting-demos" value={demos} onChange={(event) => setDemos(event.target.value)} className={inputClass} />
        </li>
      </ul>
      <button type="button" onClick={() => void save()} className="ember-gradient self-start rounded-full px-5 py-2.5 text-sm font-semibold text-background">
        Enregistrer les réglages
      </button>
      <details className="rounded-2xl border border-hairline bg-surface px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium">Valeurs du contrat (lib/legal/constants.ts)</summary>
        <ul className="mt-3 flex flex-col gap-1 text-muted">
          {CONTRACT.map(({ key, label, unit }) => (
            <li key={key}>
              {label} : <span className="text-foreground">{String(settings[key])}</span> {unit}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-faint">Elles changent avec une nouvelle version du contrat, par migration.</p>
      </details>
    </section>
  );
}

function Deck() {
  const toast = useToast();
  const [present, setPresent] = useState<boolean | null>(null);
  useEffect(() => {
    void deckUploaded().then(setPresent);
  }, []);
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-faint">Deck du Kit</h2>
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-hairline bg-surface p-4 text-sm">
        <span className="flex-1">
          {present === null ? "…" : present ? "Deck déposé : les commerciaux le voient dans leur Kit." : "Aucun deck déposé."}
        </span>
        <label className={`${GHOST_BUTTON} cursor-pointer`}>
          {present ? "Remplacer (PDF)" : "Déposer (PDF)"}
          <input
            type="file"
            accept="application/pdf"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              void uploadDeck(file).then(
                () => {
                  setPresent(true);
                  toast.success("Deck déposé.");
                },
                (cause: unknown) => toast.error(cause instanceof Error ? cause.message : "Dépôt impossible.")
              );
            }}
          />
        </label>
      </div>
    </section>
  );
}

/*
 * Rattachement (4.1, 13.2 n° 5) : avant toute invitation, chaque client en
 * service a sa fiche, et chaque client du Projet est relié à la sienne —
 * sinon un commercial pourrait déclarer un restaurant déjà client.
 */
function Rattachement() {
  const toast = useToast();
  const { basePath } = useAdminBasePath();
  const { data: projet } = useProjet();
  const [places, setPlaces] = useState<ClientPlace[] | null>(null);
  const [picking, setPicking] = useState<string | null>(null);

  const load = useCallback(() => fetchClientPlaces().then(setPlaces), []);
  useEffect(() => void load(), [load]);

  const link = async (place: ClientPlace, lead: LeadLite | null) => {
    try {
      await linkClient(lead?.restaurantId ?? null, place);
      toast.success(lead ? `Relié à ${lead.name}.` : "Fiche créée et reliée.");
      setPicking(null);
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Une erreur est survenue.");
    }
  };

  if (!places) return <div aria-busy className="shimmer h-40 rounded-2xl" />;
  const unlinked = places.filter((place) => !place.restaurant_id);
  const projetUnlinked = (projet?.clients ?? []).filter((client) => !client.restaurant_id);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-faint">
        Rattachement des clients ({places.length - unlinked.length}/{places.length} reliés)
      </h2>
      {unlinked.length === 0 && projetUnlinked.length === 0 ? (
        <EmptyState title="Tout est relié" body="Chaque client en service et chaque client du Projet a sa fiche." />
      ) : (
        <ul className="flex flex-col gap-2">
          {unlinked.map((place) => (
            <li key={`${place.kind}:${place.id}`} className="flex flex-col gap-2 rounded-2xl border border-hairline bg-surface p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <span className="font-medium">{place.name}</span>
                  <span className="text-muted"> · {place.kind === "shop" ? "boutique" : "établissement"} sans fiche</span>
                </span>
                <span className="flex gap-2">
                  <button type="button" onClick={() => setPicking(place.id)} className={GHOST_BUTTON}>
                    Relier à une fiche
                  </button>
                  <button type="button" onClick={() => void link(place, null)} className={GHOST_BUTTON}>
                    Créer sa fiche
                  </button>
                </span>
              </div>
              {picking === place.id && <RestaurantPicker value={null} onSelect={(lead) => lead && void link(place, lead)} />}
            </li>
          ))}
          {projetUnlinked.map((client) => (
            <li key={client.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-hairline bg-surface p-4 text-sm">
              <span>
                <span className="font-medium">{client.name}</span>
                <span className="text-muted"> · client du Projet sans fiche</span>
              </span>
              <Link href={`${basePath}/projet/${client.id}`} className={GHOST_BUTTON}>
                Relier dans le Projet
              </Link>
            </li>
          ))}
        </ul>
      )}
      {places.some((place) => place.client_ended_at) && (
        <p className="text-xs text-muted">
          Partis :{" "}
          {places
            .filter((place) => place.client_ended_at)
            .map((place) => `${place.name} (${formatDate(place.client_ended_at!)})`)
            .join(", ")}
        </p>
      )}
    </section>
  );
}

export function ReglagesTab() {
  return (
    <div className="flex flex-col gap-8">
      <Rattachement />
      <SettingsForm />
      <Deck />
    </div>
  );
}
