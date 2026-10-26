"use client";

import { useEffect, useState } from "react";
import { inputClass } from "@/components/ui/field";
import { useRunMutation } from "@/components/ui/toast";
import { useAdminBasePath } from "@/lib/admin/base-path";
import {
  fetchClientPlaces,
  linkClient,
  setClientEnded,
  setInTalks,
  type ClientPlace,
} from "@/lib/admin/commerciaux";
import { formatDate, formatRelative } from "@/lib/admin/format";
import { refreshDetail } from "@/lib/admin/lead-cache";
import type { LeadDetail } from "@/lib/admin/types";
import { STATUS_LABELS } from "@/lib/commercial/labels";
import { ActivityTimeline } from "./activity-timeline";

function Title({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">{children}</p>;
}

const SMALL = "rounded-full border border-hairline px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:text-foreground";

/** Déclaration active d'une fiche : en attente, ou réservée (états effectifs, calculés en base). */
export function activeDeclaration(detail: LeadDetail) {
  return detail.declarations.find((d) => d.status === "pending" || d.status === "confirmed");
}

/*
 * La fiche vue de l'espace commercial : le client qu'elle est devenue (le
 * lien fait foi pour « déjà client »), la déclaration en cours, l'état « en
 * discussion » forcé ; et, fermé par défaut, le travail des commerciaux —
 * à ouvrir en cas de litige, d'opposition ou de conflit d'attribution.
 */
export function CommercialSection({ detail }: { detail: LeadDetail }) {
  const run = useRunMutation();
  const { basePath } = useAdminBasePath();
  const restaurantId = detail.restaurant.id;
  const [places, setPlaces] = useState<ClientPlace[] | null>(null);
  const [choice, setChoice] = useState("");
  const [showWork, setShowWork] = useState(false);
  const active = activeDeclaration(detail);
  const work = detail.commercialWork;

  useEffect(() => {
    if (!detail.client) void fetchClientPlaces().then(setPlaces, () => setPlaces([]));
  }, [detail.client]);

  const refresh = () => refreshDetail(restaurantId);

  return (
    <>
      <section className="flex flex-col gap-2">
        <Title>Client Ominin</Title>
        {detail.client ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="flex-1">
              Relié à <span className="font-medium">{detail.client.name}</span>
              <span className="text-faint"> · {detail.client.kind === "shop" ? "boutique" : "établissement"}</span>
              {detail.client.endedAt && <span className="text-ember-3"> · parti le {formatDate(detail.client.endedAt)}</span>}
            </span>
            {detail.client.endedAt ? (
              <button
                type="button"
                onClick={() => void run(async () => { await setClientEnded(restaurantId, null); refresh(); }, "Client de retour")}
                className={SMALL}
              >
                Client revenu
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (!window.confirm(`${detail.client!.name} a quitté Ominin ? La fiche redevient déclarable par un commercial.`)) return;
                  void run(async () => { await setClientEnded(restaurantId, new Date().toISOString()); refresh(); }, "Départ enregistré");
                }}
                className={SMALL}
              >
                Client parti
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <select value={choice} onChange={(event) => setChoice(event.target.value)} className={`${inputClass} flex-1`}>
              <option value="">Pas client — relier à…</option>
              {(places ?? [])
                .filter((place) => !place.restaurant_id)
                .map((place) => (
                  <option key={`${place.kind}:${place.id}`} value={`${place.kind}:${place.id}`}>
                    {place.name} ({place.kind === "shop" ? "boutique" : "établissement"})
                  </option>
                ))}
            </select>
            <button
              type="button"
              disabled={!choice}
              onClick={() => {
                const [kind, id] = choice.split(":");
                void run(async () => { await linkClient(restaurantId, { kind, id }); refresh(); }, "Fiche reliée au client");
              }}
              className={SMALL}
            >
              Relier
            </button>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <Title>Espace commercial</Title>
        {active ? (
          <p className="text-sm">
            {active.status === "pending"
              ? `Déclaré par ${active.commercial} le ${formatDate(active.declaredAt)}, à trancher avant le ${formatDate(active.confirmDeadline!)}.`
              : `Réservé par ${active.commercial} jusqu’au ${formatDate(active.reservedUntil!)} · étape ${active.step}/5.`}{" "}
            <a href={`${basePath}/commerciaux?onglet=declarations`} className="font-semibold text-ember-1">
              Déclarations
            </a>
            <span className="block text-xs text-faint">Le statut de la fiche suit son travail : il ne se change pas ici.</span>
          </p>
        ) : (
          <p className="text-sm text-muted">Aucune déclaration en cours.</p>
        )}
        {detail.declarations.filter((d) => d !== active).length > 0 && (
          <ul className="text-xs text-muted">
            {detail.declarations
              .filter((d) => d !== active)
              .map((d) => (
                <li key={d.id}>
                  {formatDate(d.declaredAt)} · {d.commercial} · {STATUS_LABELS[d.status]}
                </li>
              ))}
          </ul>
        )}
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">En discussion avec Ominin :</span>
          <select
            value={detail.inTalksOverride === null ? "auto" : detail.inTalksOverride ? "oui" : "non"}
            onChange={(event) => {
              const value = event.target.value === "auto" ? null : event.target.value === "oui";
              void run(async () => { await setInTalks(restaurantId, value); refresh(); }, "Enregistré");
            }}
            className="rounded-full border border-hairline bg-background px-3 py-1 text-xs font-semibold text-muted"
          >
            <option value="auto">calculé</option>
            <option value="oui">forcé oui</option>
            <option value="non">forcé non</option>
          </select>
        </label>
      </section>

      {(work.activities.length > 0 || work.tasks.length > 0 || work.appointments.length > 0) && (
        <section className="flex flex-col gap-2">
          <Title>Travail des commerciaux</Title>
          {showWork ? (
            <>
              {[...work.appointments.map((rdv) => `Rendez-vous ${formatRelative(rdv.startAt)} · ${rdv.title}`),
                ...work.tasks.map((task) => `Relance ${task.dueAt ? formatRelative(task.dueAt) : ""} · ${task.title} (${task.status})`)].map(
                (line) => (
                  <p key={line} className="text-sm text-muted">{line}</p>
                )
              )}
              <ActivityTimeline activities={work.activities} />
            </>
          ) : (
            <button type="button" onClick={() => setShowWork(true)} className={`${SMALL} self-start`}>
              Ouvrir (litige, opposition ou conflit d’attribution)
            </button>
          )}
        </section>
      )}
    </>
  );
}
