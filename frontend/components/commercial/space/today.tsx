"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarIcon, PhoneIcon, RouteIcon, WhatsappIcon } from "@/components/admin/icons";
import { useRunMutation } from "@/components/ui/toast";
import { formatDayLong, formatRelative, formatTime } from "@/lib/admin/format";
import * as api from "@/lib/commercial/api";
import { END_LABELS, REFUSAL_LABELS, type EndReason, type RefusalReason } from "@/lib/commercial/labels";
import { mapsDirectionsHref } from "@/lib/collect/shared";
import { frenchDate } from "@/lib/legal/format";
import { readLastOpen, markOpened } from "./device";
import { spaceHref } from "./shell";
import {
  ErrorNote,
  PageTitle,
  SectionTitle,
  Skeleton,
  cardClass,
  errorMessage,
  ghostButton,
  primaryButton,
  telHref,
  whatsappHref,
} from "./ui";

function newsLine(item: api.Today["news"][number]): string {
  switch (item.kind) {
    case "confirmed":
      return item.tacit ? "Confirmé de droit, sans réponse d’Ominin" : "Déclaration confirmée par Ominin";
    case "refused":
      return `Déclaration refusée : ${REFUSAL_LABELS[item.reason as RefusalReason] ?? ""}`;
    case "signed":
      return "Inscrit chez Ominin : c’est un Client Apporté";
    case "demo_ready":
      return "Sa démo à ses couleurs est prête";
    case "statement":
      return "Votre relevé de commission est disponible";
    default:
      return `Déclaration close : ${END_LABELS[item.reason as EndReason]?.toLowerCase() ?? ""}`;
  }
}

/** Date choisie au calendrier, à l'heure de la relance d'origine. */
function postponed(dueAt: string, day: string): string {
  const due = new Date(dueAt);
  const [year, month, date] = day.split("-").map(Number);
  due.setFullYear(year, month - 1, date);
  return due.toISOString();
}

/*
 * Aujourd'hui : ce qui se fait maintenant, rien d'autre. Rendez-vous du jour,
 * relances dues (appeler, WhatsApp, faite, reporter : un geste chacune),
 * réservations qui expirent, et ce qui a changé depuis la dernière ouverture
 * — date gardée sur l'appareil, jamais sur le serveur.
 */
export function TodayScreen() {
  const run = useRunMutation();
  const since = useRef<string | null | undefined>(undefined);
  const [data, setData] = useState<api.Today | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (since.current === undefined) since.current = readLastOpen();
    api.today(since.current).then(
      (today) => {
        setData(today);
        setError(null);
        markOpened();
      },
      (cause: unknown) => setError(errorMessage(cause))
    );
  }, []);
  useEffect(load, [load]);

  const taskDone = (task: api.Today["tasks"][number]) =>
    void run(async () => {
      await api.upsertTask(task.declaration_id, { id: task.id, status: "done" });
      load();
    }, "Relance faite");
  const taskPostpone = (task: api.Today["tasks"][number], day: string) =>
    void run(async () => {
      await api.upsertTask(task.declaration_id, { id: task.id, due_at: postponed(task.due_at, day) });
      load();
    }, `Reportée au ${frenchDate(postponed(task.due_at, day))}`);

  if (error) return <ErrorNote message={error} onRetry={load} />;
  if (!data) return <Skeleton />;

  const empty =
    !data.appointments.length && !data.tasks.length && !data.expiring.length && !data.news.length;

  return (
    <div className="flex flex-col gap-7">
      <PageTitle sub={formatDayLong(new Date().toISOString())}>Aujourd’hui</PageTitle>

      {empty && (
        <div className={`${cardClass} flex flex-col items-center gap-4 py-10 text-center`}>
          <p className="font-display text-lg">Rien d’urgent aujourd’hui.</p>
          <p className="max-w-xs text-sm text-muted">
            Ni rendez-vous ni relance. Le bon moment pour passer voir un nouveau restaurant.
          </p>
          <Link href={spaceHref("/restaurants")} className={primaryButton}>
            Trouver un restaurant
          </Link>
        </div>
      )}

      {data.news.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <SectionTitle>Nouveau depuis votre dernière visite</SectionTitle>
          <ul className="flex flex-col gap-2">
            {data.news.map((item) => (
              <li key={`${item.kind}-${item.restaurant_id}-${item.at}`}>
                <Link
                  href={spaceHref(item.restaurant_id ? `/restaurants/${item.restaurant_id}` : "/argent")}
                  className={`${cardClass} block`}
                >
                  <p className="font-medium">{item.name ?? "Argent"}</p>
                  <p className="mt-0.5 text-sm text-muted">{newsLine(item)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.appointments.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <SectionTitle>Rendez-vous</SectionTitle>
          <ul className="flex flex-col gap-2">
            {data.appointments.map((rdv) => {
              const destination =
                rdv.latitude !== null && rdv.longitude !== null
                  ? `${rdv.latitude},${rdv.longitude}`
                  : rdv.location;
              return (
                <li key={rdv.id} className={`${cardClass} flex items-center gap-3`}>
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-ember-2/10 text-sm font-bold text-ember-1">
                    {formatTime(rdv.start_at)}
                  </span>
                  <Link href={spaceHref(`/restaurants/${rdv.restaurant_id}`)} className="min-w-0 flex-1">
                    <p className="truncate font-medium">{rdv.name}</p>
                    <p className="truncate text-sm text-muted">{rdv.title}</p>
                  </Link>
                  {destination && (
                    <a href={mapsDirectionsHref(destination)} target="_blank" rel="noopener" className={ghostButton}>
                      <RouteIcon className="size-4" />
                      Itinéraire
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {data.tasks.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <SectionTitle>Relances</SectionTitle>
          <ul className="flex flex-col gap-2">
            {data.tasks.map((task) => {
              const whatsapp = task.phone ? whatsappHref(task.phone) : null;
              const late = task.due_at < new Date().toISOString();
              return (
                <li key={task.id} className={`${cardClass} flex flex-col gap-3`}>
                  <Link href={spaceHref(`/restaurants/${task.restaurant_id}`)}>
                    <p className="font-medium">{task.name}</p>
                    <p className="text-sm text-muted">
                      {task.title} ·{" "}
                      <span className={late ? "font-semibold text-ember-3" : undefined}>
                        {formatRelative(task.due_at)}
                      </span>
                    </p>
                  </Link>
                  <div className="grid grid-cols-4 gap-2">
                    {task.phone ? (
                      <a href={telHref(task.phone)} className={ghostButton} aria-label={`Appeler ${task.name}`}>
                        <PhoneIcon className="size-4" />
                      </a>
                    ) : (
                      <span className={`${ghostButton} opacity-40`} aria-hidden>
                        <PhoneIcon className="size-4" />
                      </span>
                    )}
                    {whatsapp ? (
                      <a href={whatsapp} target="_blank" rel="noopener" className={ghostButton} aria-label={`WhatsApp ${task.name}`}>
                        <WhatsappIcon className="size-4" />
                      </a>
                    ) : (
                      <span className={`${ghostButton} opacity-40`} aria-hidden>
                        <WhatsappIcon className="size-4" />
                      </span>
                    )}
                    <button type="button" onClick={() => taskDone(task)} className={ghostButton}>
                      Faite
                    </button>
                    <label className={`${ghostButton} relative cursor-pointer`}>
                      <CalendarIcon className="size-4" />
                      <span className="sr-only">Reporter</span>
                      <input
                        type="date"
                        aria-label={`Reporter « ${task.title} »`}
                        className="absolute inset-0 cursor-pointer text-base opacity-0"
                        onChange={(event) => event.target.value && taskPostpone(task, event.target.value)}
                      />
                    </label>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {data.expiring.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <SectionTitle>Réservations qui expirent bientôt</SectionTitle>
          <ul className="flex flex-col gap-2">
            {data.expiring.map((item) => (
              <li key={item.declaration_id}>
                <Link href={spaceHref(`/restaurants/${item.restaurant_id}`)} className={`${cardClass} block`}>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted">Réservé jusqu’au {frenchDate(item.reserved_until)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
