"use client";

import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import {
  fetchCommerciaux,
  fetchDiscordMembers,
  fetchSettings,
  setDiscordMember,
  updateSettings,
  type CommercialRow,
  type CommercialSettings,
} from "@/lib/admin/commerciaux";
import type { DiscordMember } from "@/lib/discord";

type Key = "commission_percent" | "term_months" | "visit_request_days";

/* Les seuls réglages de l'espace commercial, saisis par l'admin : aucune valeur n'est écrite dans le code. */
const FIELDS: { key: Key; label: string; unit: string; hint: string; required: boolean }[] = [
  { key: "commission_percent", label: "Commission", unit: "%", hint: "Part de ce qu’Ominin gagne sur chaque restaurant signé.", required: true },
  { key: "term_months", label: "Durée de la commission", unit: "mois", hint: "À partir de l’inscription de chaque restaurant.", required: true },
  {
    key: "visit_request_days",
    label: "Délai d’une demande de visite",
    unit: "jours",
    hint: "Sans réponse, ou refusée sans que le restaurant avance, il est libéré pour tous. Vide : jamais libéré.",
    required: false,
  },
];

function SettingsForm() {
  const toast = useToast();
  const [draft, setDraft] = useState<Record<Key, string> | null>(null);
  const [guide, setGuide] = useState("");

  const load = useCallback(
    () =>
      fetchSettings().then((settings: CommercialSettings) => {
        setDraft(Object.fromEntries(FIELDS.map(({ key }) => [key, settings[key]?.toString() ?? ""])) as Record<Key, string>);
        setGuide(settings.guide_url ?? "");
      }),
    []
  );
  useEffect(() => void load(), [load]);

  if (!draft) return <div aria-busy className="shimmer h-48 rounded-2xl" />;

  const incomplete = FIELDS.some(({ key, required }) => required && draft[key] === "");

  const save = async () => {
    if (guide.trim() && !guide.trim().startsWith("https://")) {
      toast.error("Le lien du guide doit commencer par https://");
      return;
    }
    try {
      await updateSettings({
        ...Object.fromEntries(FIELDS.map(({ key }) => [key, draft[key] === "" ? null : Number(draft[key])])),
        guide_url: guide.trim() || null,
      });
      toast.success("Réglages enregistrés.");
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Une erreur est survenue.");
    }
  };

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-faint">Espace des commerciaux</h2>
      <ul className="flex flex-col divide-y divide-hairline rounded-2xl border border-hairline bg-surface">
        {FIELDS.map(({ key, label, unit, hint, required }) => (
          <li key={key} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <label htmlFor={`setting-${key}`} className="min-w-0 flex-1 text-sm">
              {label}
              {required && <span className="text-ember-2"> *</span>}
              <span className="block text-xs text-faint">{hint}</span>
            </label>
            <span className="flex items-center gap-2 text-sm text-muted">
              <input
                id={`setting-${key}`}
                type="number"
                step={key === "commission_percent" ? "any" : 1}
                min={0}
                value={draft[key]}
                onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
                className={`${inputClass} w-28`}
              />
              {unit}
            </span>
          </li>
        ))}
        <li className="flex flex-col gap-2 px-4 py-3">
          <label htmlFor="setting-guide" className="text-sm">
            Guide de vente
            <span className="block text-xs text-faint">
              Lien du message Discord qui le contient (clic droit sur le message, « Copier le lien du message »). Ouvert depuis la page
              Ressources des commerciaux.
            </span>
          </label>
          <input id="setting-guide" type="url" value={guide} onChange={(event) => setGuide(event.target.value)} placeholder="https://discord.com/channels/…" className={inputClass} />
        </li>
      </ul>
      <button
        type="button"
        disabled={incomplete}
        onClick={() => void save()}
        className="ember-gradient self-start rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-50"
      >
        Enregistrer
      </button>
    </section>
  );
}

/*
 * Le compte Discord que le site mentionne pour chaque commercial. Un membre
 * déjà relié à un autre commercial n'est pas proposé.
 */
function DiscordAccounts() {
  const toast = useToast();
  const [rows, setRows] = useState<CommercialRow[] | null>(null);
  const [members, setMembers] = useState<DiscordMember[] | string | null>(null);

  const load = useCallback(() => fetchCommerciaux().then(setRows), []);
  useEffect(() => {
    void load();
    void fetchDiscordMembers().then(setMembers, (reason: unknown) =>
      setMembers(reason instanceof Error ? reason.message : "Membres Discord illisibles.")
    );
  }, [load]);

  const link = async (row: CommercialRow, discordUserId: string | null) => {
    try {
      await setDiscordMember(row.id, discordUserId);
      toast.success(discordUserId ? "Compte Discord relié." : "Compte Discord retiré.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Une erreur est survenue.");
    }
    await load();
  };

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-faint">Comptes Discord</h2>
      {typeof members === "string" && <p className="text-sm text-ember-3">{members}</p>}
      {!rows ? (
        <div aria-busy className="shimmer h-32 rounded-2xl" />
      ) : rows.length === 0 ? (
        <EmptyState title="Aucun commercial" body="Les commerciaux invités apparaissent ici, pour relier leur compte Discord." />
      ) : (
        <ul className="flex flex-col divide-y divide-hairline rounded-2xl border border-hairline bg-surface">
          {rows.map((row) => {
            const taken = new Set(rows.filter((other) => other.id !== row.id).map((other) => other.discordUserId));
            return (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <label htmlFor={`discord-${row.id}`} className="min-w-0 flex-1 truncate text-sm">
                  {row.name ?? row.email}
                </label>
                <select
                  id={`discord-${row.id}`}
                  value={row.discordUserId ?? ""}
                  disabled={!Array.isArray(members)}
                  onChange={(event) => void link(row, event.target.value || null)}
                  className={`${inputClass} w-64`}
                >
                  <option value="">Pas relié</option>
                  {Array.isArray(members) &&
                    members
                      .filter((member) => !taken.has(member.id))
                      .map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name === member.username ? member.name : `${member.name} (${member.username})`}
                        </option>
                      ))}
                </select>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function ReglagesTab() {
  return (
    <div className="flex flex-col gap-8">
      <SettingsForm />
      <DiscordAccounts />
    </div>
  );
}
