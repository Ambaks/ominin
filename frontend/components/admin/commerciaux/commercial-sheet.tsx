"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sheet } from "@/components/gestion/ui";
import { useAdminBasePath } from "@/lib/admin/base-path";
import {
  CONTRACT_END_LABELS,
  exerciseOption,
  fetchCommercialPlaces,
  fetchDiscordMembers,
  inviteCommercial,
  removeCommercial,
  setDiscordMember,
  updateCommercialSettings,
  type CommercialOwnSettings,
  type CommercialPlace,
  type CommercialPlaceStatus,
  type CommercialRow,
  type CommercialSettings,
} from "@/lib/admin/commerciaux";
import { formatDate, formatTime } from "@/lib/admin/format";
import type { DiscordMember } from "@/lib/discord";

export const GHOST_BUTTON =
  "rounded-full border border-hairline px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:text-foreground disabled:opacity-60";

const SECTION_TITLE = "text-[11px] font-semibold uppercase tracking-wider text-faint";

type SettingKey = keyof CommercialOwnSettings;

/* Les réglages d'un commercial, saisis par l'admin : aucune valeur n'est écrite dans le code. */
const SETTING_FIELDS: { key: SettingKey; label: string; unit: string; hint: string; required: boolean }[] = [
  {
    key: "commission_percent",
    label: "Commission",
    unit: "%",
    hint: "Part de ce qu’Ominin gagne sur chaque restaurant qu’il signe. Un relevé déjà envoyé garde son taux.",
    required: true,
  },
  {
    key: "term_months",
    label: "Durée de la commission",
    unit: "mois",
    hint: "À partir de l’inscription de chaque restaurant. C’est aussi la durée de son contrat.",
    required: true,
  },
  {
    key: "visit_request_days",
    label: "Délai d’une demande de visite",
    unit: "jours",
    hint: "Sans réponse, ou refusée sans que le restaurant avance, un restaurant qu’il suit est libéré pour tous. Vide : jamais libéré.",
    required: false,
  },
  {
    key: "search_radius_km",
    label: "Rayon de recherche sur la carte",
    unit: "km",
    hint: "Il ne trouve par son nom qu’un établissement à cette distance de lui.",
    required: true,
  },
];

const settingsDraft = (settings: CommercialOwnSettings) =>
  Object.fromEntries(SETTING_FIELDS.map(({ key }) => [key, settings[key]?.toString() ?? ""])) as Record<SettingKey, string>;

const PLACE_LABELS: Record<Exclude<CommercialPlaceStatus, "signed">, string> = {
  waiting: "Inscription en cours",
  not_interested: "Pas intéressé",
  absent: "Responsable absent",
};

function placeLine(place: CommercialPlace): string {
  if (place.status !== "signed") return PLACE_LABELS[place.status];
  if (place.clientEnded) return `Client parti le ${formatDate(place.clientEnded)}`;
  return place.clientSince ? `Client depuis le ${formatDate(place.clientSince)}` : "Client";
}

export function contractLine(row: CommercialRow): string {
  if (!row.signed) return `Invité le ${formatDate(row.invitedAt)} · pas encore signé`;
  const signed = `Signé le ${formatDate(row.signed.at)} à ${formatTime(row.signed.at)} · version ${row.signed.version}`;
  if (row.endedAt) {
    const past = row.endedAt <= new Date().toISOString();
    return `${signed} · ${past ? "terminé" : "prend fin"} le ${formatDate(row.endedAt)}${row.endReason ? ` (${CONTRACT_END_LABELS[row.endReason]})` : ""}`;
  }
  return `${signed}${row.optionExercisedAt ? " · prolongé" : ""}`;
}

/*
 * La fiche d'un commercial : ses réglages, son compte Discord, ses restaurants
 * et son contrat. Les gestes passent par `run`, qui recharge la liste.
 */
export function CommercialSheet({
  row,
  rows,
  settings,
  busy,
  run,
  onClose,
  onEnd,
}: {
  row: CommercialRow;
  rows: CommercialRow[];
  settings: CommercialSettings;
  busy: boolean;
  run: (key: string, action: () => Promise<void>, done: string) => Promise<boolean>;
  onClose: () => void;
  onEnd: () => void;
}) {
  const router = useRouter();
  const { basePath, localPath } = useAdminBasePath();
  const [draft, setDraft] = useState(() => settingsDraft(row.settings));
  const [members, setMembers] = useState<DiscordMember[] | string | null>(null);
  const [places, setPlaces] = useState<CommercialPlace[] | string | null>(null);

  useEffect(() => {
    void fetchDiscordMembers().then(setMembers, (reason: unknown) =>
      setMembers(reason instanceof Error ? reason.message : "Membres Discord illisibles.")
    );
    void fetchCommercialPlaces(row.id).then(setPlaces, (reason: unknown) =>
      setPlaces(reason instanceof Error ? reason.message : "Restaurants illisibles.")
    );
  }, [row.id]);

  const who = row.name ?? row.email;
  const taken = new Set(rows.filter((other) => other.id !== row.id).map((other) => other.discordUserId));
  const saved = settingsDraft(row.settings);
  const incomplete = SETTING_FIELDS.some(({ key, required }) => required && draft[key] === "");
  const unchanged = SETTING_FIELDS.every(({ key }) => draft[key] === saved[key]);

  const saveSettings = () => {
    const next = Object.fromEntries(
      SETTING_FIELDS.map(({ key }) => [key, draft[key] === "" ? null : Number(draft[key])])
    ) as CommercialOwnSettings;
    const from = row.settings.commission_percent.toLocaleString("fr-FR");
    const to = next.commission_percent.toLocaleString("fr-FR");
    if (from !== to && !window.confirm(`Passer le taux de ${who} de ${from} % à ${to} % ? Prévenez-le par e-mail.`)) return;
    void run(row.id, () => updateCommercialSettings(row.id, next), `Réglages de ${who} enregistrés.`);
  };

  return (
    <Sheet title={who} onClose={onClose}>
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <div>
            {row.name && <p className="truncate text-sm text-muted">{row.email}</p>}
            <p className={`mt-1 text-[10px] font-semibold uppercase tracking-wider ${row.signed ? "text-ember-1" : "text-faint"}`}>
              {contractLine(row)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {row.signed && (
              <a href={`/api/admin/commerciaux/contrat?id=${row.id}`} className={GHOST_BUTTON}>
                Contrat (PDF)
              </a>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(row.id, () => inviteCommercial(row.email), `Lien renvoyé à ${row.email}.`)}
              className={GHOST_BUTTON}
            >
              {row.signed ? "Envoyer un lien de connexion" : "Renvoyer l’invitation"}
            </button>
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className={SECTION_TITLE}>Réglages</h3>
          <ul className="flex flex-col divide-y divide-hairline g-plate">
            {SETTING_FIELDS.map(({ key, label, unit, hint, required }) => (
              <li key={key} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <label htmlFor={`commercial-${key}`} className="min-w-0 flex-1 text-sm">
                  {label}
                  {required && <span className="text-ember-2"> *</span>}
                  <span className="block text-xs text-faint">{hint}</span>
                </label>
                <span className="flex items-center gap-2 text-sm text-muted">
                  <input
                    id={`commercial-${key}`}
                    type="number"
                    step={key === "commission_percent" ? "any" : 1}
                    min={key === "commission_percent" ? 0 : 1}
                    max={key === "commission_percent" ? 100 : undefined}
                    value={draft[key]}
                    onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
                    className={`g-input w-28!`}
                  />
                  {unit}
                </span>
              </li>
            ))}
          </ul>
          <button type="button" disabled={busy || incomplete || unchanged} onClick={saveSettings} className={`${GHOST_BUTTON} self-start`}>
            Enregistrer
          </button>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className={SECTION_TITLE}>Discord</h3>
          <select
            aria-label="Compte Discord"
            value={row.discordUserId ?? ""}
            disabled={!Array.isArray(members) || busy}
            onChange={(event) => {
              const id = event.target.value || null;
              void run(row.id, () => setDiscordMember(row.id, id), id ? "Compte Discord relié." : "Compte Discord retiré.");
            }}
            className="g-input"
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
          {typeof members === "string" && <p className="text-sm text-ember-3">{members}</p>}
        </section>

        <section className="flex flex-col gap-2">
          <h3 className={SECTION_TITLE}>Restaurants</h3>
          {places === null ? (
            <div aria-busy className="g-shimmer h-16" />
          ) : typeof places === "string" ? (
            <p className="text-sm text-ember-3">{places}</p>
          ) : places.length === 0 ? (
            <p className="text-sm text-muted">Aucun restaurant pour l’instant.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-hairline g-plate">
              {places.map((place) => (
                <li key={place.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      router.push(`${basePath}${localPath}?lead=${place.id}`);
                    }}
                    className="flex w-full flex-col px-4 py-3 text-left text-sm transition-colors hover:bg-surface-raised"
                  >
                    <span className="font-medium">{place.name}</span>
                    <span className="text-xs text-muted">{placeLine(place)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {(!row.signed || !row.endedAt) && (
          <section className="flex flex-col gap-2">
            <h3 className={SECTION_TITLE}>Contrat</h3>
            {row.signed && !row.optionExercisedAt && (
              <p className="text-xs text-faint">
                Sans prolongation, le contrat s’arrête seul au bout de {row.settings.term_months} mois. Ominin peut le prolonger une fois de {settings.option_years} ans, au plus
                tard un mois avant la fin (article 3).
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {row.signed && !row.optionExercisedAt && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (!window.confirm(`Prolonger le contrat de ${who} de ${settings.option_years} ans (article 3.3) ? Prévenez-le par e-mail.`)) return;
                    void run(row.id, () => exerciseOption(row.id), "Contrat prolongé.");
                  }}
                  className={GHOST_BUTTON}
                >
                  Prolonger de {settings.option_years} ans
                </button>
              )}
              {row.signed ? (
                <button type="button" onClick={onEnd} className={GHOST_BUTTON}>
                  Fin de contrat
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (!window.confirm(`Retirer l’invitation de ${row.email} ? Son lien ne mènera plus à rien.`)) return;
                    void run(row.id, () => removeCommercial(row.id), `Invitation de ${row.email} retirée.`);
                  }}
                  className={GHOST_BUTTON}
                >
                  Retirer
                </button>
              )}
            </div>
          </section>
        )}
      </div>
    </Sheet>
  );
}
