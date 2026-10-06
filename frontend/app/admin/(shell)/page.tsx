"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { screenOpen } from "@/components/admin/shell";
import { StatCard } from "@/components/admin/stat-card";
import { TaskRowItem } from "@/components/admin/tasks/task-row";
import * as api from "@/lib/admin/api";
import { useAdminBasePath } from "@/lib/admin/base-path";
import { useProductAdmin } from "@/lib/admin/filters";
import {
  addDays,
  dayStart,
  formatDayTime,
  formatPercent,
} from "@/lib/admin/format";
import type { Product } from "@/lib/admin/products";
import {
  selectActiveLeadCount,
  selectFollowUpBuckets,
  selectFunnel,
  selectStatusCounts,
} from "@/lib/admin/selectors";
import { fetchSocialWeek, type SocialWeek } from "@/lib/admin/social";
import type { OutreachStats } from "@/lib/admin/types";
import type { SocialBrand } from "@/lib/social/brands";

/*
 * Le cockpit de l'acquisition, pour la vue courante : ce qu'il faut faire
 * maintenant, où en est l'entonnoir, et ce que donnent la prospection et les
 * réseaux. Les blocs Prospection et Réseaux suivent la navigation : absents
 * d'un produit qui n'a pas l'écran correspondant.
 */

/** Réponse rattachée au produit qui l'a demandée : changer de vue n'affiche
 * jamais les chiffres de la précédente. */
interface ForProduct<T> {
  product: Product | null;
  value: T;
}

const SECTION_TITLE =
  "text-[11px] font-semibold uppercase tracking-wider text-faint";
const SECTION_LINK =
  "text-xs font-semibold text-muted transition-colors hover:text-foreground";

function Bar({
  label,
  count,
  pct,
  detail,
}: {
  label: string;
  count: number;
  pct: number;
  detail?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-muted">
          {count}
          {detail ? ` · ${detail}` : ""}
        </span>
      </div>
      <div className="h-2 rounded-full bg-surface-raised">
        <div
          className="bar-rise h-2 rounded-full bg-chart-mark"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Figure({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-faint">
        {label}
      </span>
      <span className="font-display text-2xl font-medium tabular-nums">
        {value}
      </span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}

function Loading() {
  return (
    <div aria-busy className="flex flex-col gap-3">
      <div className="shimmer h-8 rounded-xl" />
      <div className="shimmer h-8 rounded-xl" />
    </div>
  );
}

export default function ApercuPage() {
  const state = useProductAdmin();
  const { basePath, product } = useAdminBasePath();
  const withProspection = screenOpen("/prospection", product);
  const withReseaux = screenOpen("/reseaux", product);
  const loaded = state != null;

  const [weekly, setWeekly] =
    useState<ForProduct<api.WeeklyActivityCounts> | null>(null);
  const [social, setSocial] = useState<ForProduct<SocialWeek> | null>(null);
  const [outreach, setOutreach] = useState<OutreachStats | null>(null);

  useEffect(() => {
    if (!loaded) return;
    let active = true;
    api
      .fetchWeeklyActivityCounts(product)
      .then((value) => active && setWeekly({ product, value }))
      .catch(console.error);
    if (withReseaux) {
      // Réseaux n'existe que pour les produits qui ont leur marque.
      fetchSocialWeek(product as SocialBrand | null)
        .then((value) => active && setSocial({ product, value }))
        .catch(console.error);
    }
    return () => {
      active = false;
    };
  }, [loaded, product, withReseaux]);

  useEffect(() => {
    // Léa ne prospecte que pour Menu : ses chiffres ne dépendent pas de la vue.
    if (!loaded || !withProspection || outreach !== null) return;
    api.fetchOutreachStats().then(setOutreach).catch(console.error);
  }, [loaded, withProspection, outreach]);

  const leads = useMemo(() => state?.leads ?? [], [state?.leads]);
  const counts = useMemo(() => selectStatusCounts(leads), [leads]);
  const funnel = useMemo(() => selectFunnel(leads), [leads]);
  const followUps = useMemo(() => selectFollowUpBuckets(leads), [leads]);

  const weeklyCounts = weekly?.product === product ? weekly.value : null;
  const socialWeek = social?.product === product ? social.value : null;

  const in7Days = addDays(dayStart(), 8).toISOString();
  const upcomingRdv = (state?.appointments ?? []).filter(
    (rdv) => rdv.startAt < in7Days,
  );
  const nameById = new Map(leads.map((lead) => [lead.restaurantId, lead.name]));
  const endOfToday = addDays(dayStart(), 1).toISOString();
  const tasksToday = (state?.tasks ?? [])
    .filter((task) => task.dueAt !== null && task.dueAt < endOfToday)
    .slice(0, 5);

  const agenda = `${basePath}/agenda`;
  const todo: {
    label: string;
    count: number | null;
    href: string;
    urgent?: boolean;
  }[] = [
    {
      label: "Relances en retard",
      count: followUps.overdue.length,
      href: agenda,
      urgent: true,
    },
    { label: "Aujourd'hui", count: followUps.today.length, href: agenda },
    {
      label: "7 prochains jours",
      count: followUps.upcoming7.length,
      href: agenda,
    },
    ...(withProspection
      ? [
          {
            label: "Brouillons à approuver",
            count: state?.pendingDrafts ?? 0,
            href: `${basePath}/prospection`,
            urgent: true,
          },
        ]
      : []),
    ...(withReseaux
      ? [
          {
            label: "Snapchat à poster",
            count: socialWeek?.snapchatToPost ?? null,
            href: `${basePath}/reseaux`,
            urgent: true,
          },
        ]
      : []),
  ];

  const maxWeekly = Math.max(
    weeklyCounts?.visits ?? 0,
    weeklyCounts?.calls ?? 0,
    weeklyCounts?.emails ?? 0,
    weeklyCounts?.appointments ?? 0,
    1,
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-medium">Aperçu</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Restaurants"
          value={String(leads.length)}
          href={`${basePath}/restaurants`}
        />
        <StatCard
          label="Leads actifs"
          value={String(selectActiveLeadCount(leads))}
          href={`${basePath}/restaurants`}
          hint="hors signés, perdus, pas intéressés"
        />
        <StatCard
          label="Signés"
          value={String(counts.signed)}
          href={`${basePath}/restaurants`}
        />
        <StatCard
          label="RDV à venir (7 j)"
          value={String(upcomingRdv.length)}
          href={agenda}
        />
      </div>

      <section className="rounded-2xl border border-hairline bg-surface p-5">
        <h2 className={`mb-3 ${SECTION_TITLE}`}>À faire maintenant</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {todo.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex flex-col gap-1 rounded-xl border border-hairline p-3 transition-colors hover:border-ember-2/40"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-faint">
                {item.label}
              </span>
              <span
                className={`font-display text-2xl font-medium ${
                  item.urgent && item.count ? "text-ember-3" : ""
                }`}
              >
                {item.count ?? "…"}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-hairline bg-surface p-5">
          <h2 className={`mb-4 ${SECTION_TITLE}`}>Entonnoir de conversion</h2>
          <div className="flex flex-col gap-3">
            {funnel.map((stage) => (
              <Bar
                key={stage.label}
                label={stage.label}
                count={stage.count}
                pct={stage.pct}
                detail={`${stage.pct} %`}
              />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-hairline bg-surface p-5">
          <h2 className={`mb-4 ${SECTION_TITLE}`}>Activité cette semaine</h2>
          {weeklyCounts === null ? (
            <Loading />
          ) : (
            <div className="flex flex-col gap-3">
              {(
                [
                  ["Visites", weeklyCounts.visits],
                  ["Appels", weeklyCounts.calls],
                  ["E-mails", weeklyCounts.emails],
                  ["Rendez-vous", weeklyCounts.appointments],
                ] as const
              ).map(([label, count]) => (
                <Bar
                  key={label}
                  label={label}
                  count={count}
                  pct={Math.round((count / maxWeekly) * 100)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {(withProspection || withReseaux) && (
        <div
          className={`grid gap-6 ${
            withProspection && withReseaux ? "lg:grid-cols-2" : ""
          }`}
        >
          {withProspection && (
            <section className="rounded-2xl border border-hairline bg-surface p-5">
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className={SECTION_TITLE}>Prospection</h2>
                <Link href={`${basePath}/prospection`} className={SECTION_LINK}>
                  Ouvrir
                </Link>
              </div>
              {outreach === null ? (
                <Loading />
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <Figure label="Envoyés" value={String(outreach.sent)} />
                  <Figure
                    label="Réponses"
                    value={String(outreach.responded)}
                    hint={
                      outreach.sent > 0
                        ? formatPercent(outreach.responded / outreach.sent)
                        : undefined
                    }
                  />
                  <Figure
                    label="Intéressés"
                    value={String(outreach.positive)}
                  />
                </div>
              )}
            </section>
          )}
          {withReseaux && (
            <section className="rounded-2xl border border-hairline bg-surface p-5">
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className={SECTION_TITLE}>Réseaux · 7 derniers jours</h2>
                <Link href={`${basePath}/reseaux`} className={SECTION_LINK}>
                  Ouvrir
                </Link>
              </div>
              {socialWeek === null ? (
                <Loading />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Figure
                    label="Publications"
                    value={String(socialWeek.published)}
                  />
                  <Figure
                    label="Portée"
                    value={socialWeek.reach.toLocaleString("fr-FR")}
                    hint="Instagram et Facebook"
                  />
                </div>
              )}
            </section>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-hairline bg-surface p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className={SECTION_TITLE}>Prochains rendez-vous</h2>
            <Link href={agenda} className={SECTION_LINK}>
              Agenda
            </Link>
          </div>
          {upcomingRdv.length === 0 ? (
            <p className="text-sm text-faint">Aucun rendez-vous prévu.</p>
          ) : (
            <ul className="flex flex-col">
              {upcomingRdv.slice(0, 5).map((rdv) => (
                <li
                  key={rdv.id}
                  className="flex items-baseline justify-between gap-3 border-t border-hairline py-2.5 text-sm first:border-t-0"
                >
                  <span className="min-w-0 truncate">
                    {rdv.title}
                    <span className="text-faint">
                      {" "}
                      · {nameById.get(rdv.restaurantId) ?? ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-faint">
                    {formatDayTime(rdv.startAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-hairline bg-surface p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className={SECTION_TITLE}>Relances du jour</h2>
            <Link href={agenda} className={SECTION_LINK}>
              Agenda
            </Link>
          </div>
          {tasksToday.length === 0 ? (
            <p className="text-sm text-faint">
              Rien d’échu aujourd’hui — profitez-en pour prospecter.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {tasksToday.map((task) => (
                <TaskRowItem
                  key={task.id}
                  task={task}
                  restaurantName={
                    task.restaurantId
                      ? (nameById.get(task.restaurantId) ?? null)
                      : null
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
