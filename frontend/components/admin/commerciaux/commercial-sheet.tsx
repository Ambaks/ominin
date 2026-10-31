"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useAdminBasePath } from "@/lib/admin/base-path";
import {
  CONTRACT_END_LABELS,
  exerciseOption,
  fetchCommercialPlaces,
  fetchDiscordMembers,
  inviteCommercial,
  removeCommercial,
  setCommissionPercent,
  setDiscordMember,
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
 * La fiche d'un commercial : son taux, son compte Discord, ses restaurants et
 * son contrat. Les gestes passent par `run`, qui recharge la liste.
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
  const [draft, setDraft] = useState("");
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
  const current = row.commissionPercent ?? settings.commission_percent;
  const taken = new Set(rows.filter((other) => other.id !== row.id).map((other) => other.discordUserId));

  const raise = async () => {
    const percent = Number(draft);
    if (!window.confirm(`Porter le taux de ${who} à ${percent.toLocaleString("fr-FR")} % ? Il ne pourra plus baisser. Prévenez-le par e-mail.`)) return;
    if (await run(row.id, () => setCommissionPercent(row.id, percent), `Taux de ${who} enregistré.`)) setDraft("");
  };

  return (
    <Modal title={who} onClose={onClose}>
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
          <h3 className={SECTION_TITLE}>Commission</h3>
          <label htmlFor="commercial-rate" className="text-sm">
            {row.commissionPercent === null ? "Taux de base" : "Taux propre"} : {current.toLocaleString("fr-FR")} %
            <span className="block text-xs text-faint">
              Sur chaque restaurant, pendant {settings.term_months} mois à partir de son inscription. Le taux ne fait que monter.
            </span>
          </label>
          <span className="flex items-center gap-2 text-sm text-muted">
            <input
              id="commercial-rate"
              type="number"
              step="any"
              min={current}
              max={100}
              placeholder={current.toString()}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className={`${inputClass} w-28`}
            />
            %
            <button type="button" disabled={busy || draft === "" || Number(draft) <= current} onClick={() => void raise()} className={GHOST_BUTTON}>
              Relever
            </button>
          </span>
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
            className={inputClass}
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
            <div aria-busy className="shimmer h-16 rounded-2xl" />
          ) : typeof places === "string" ? (
            <p className="text-sm text-ember-3">{places}</p>
          ) : places.length === 0 ? (
            <p className="text-sm text-muted">Aucun restaurant pour l’instant.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-hairline rounded-2xl border border-hairline bg-surface">
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
                Sans prolongation, le contrat s’arrête seul au bout de {settings.term_months} mois. Ominin peut le prolonger une fois de {settings.option_years} ans, au plus
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
    </Modal>
  );
}
