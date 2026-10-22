import { NextResponse } from "next/server";
import { raiseAlert } from "@/lib/admin/alerts";
import {
  CHURN_DROP_RATIO,
  CHURN_MIN_PREVIOUS_SESSIONS,
  CLIENT_PERIOD_DAYS,
} from "@/lib/admin/constants";
import { formatEuros } from "@/lib/admin/format";
import { ASSIGNEES, isAssignedTo, OWNERS } from "@/lib/admin/owners";
import { notifyOwners } from "@/lib/admin/push";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Le point du matin (workflow admin-digest) :
 * - à chacun, ce qui l'attend dans le suivi : la première étape (en cours,
 *   puis bloquée, puis à faire), les deux suivantes, le reste compté — rien
 *   à qui n'a rien d'ouvert ;
 * - à tous, les chiffres des dernières 24 h des clients en service (le
 *   service du soir est fini à cette heure-là), face aux 24 h équivalentes
 *   de la semaine d'avant (même jour, mêmes clients) ;
 * - à tous, un client qui décroche : visites du menu en baisse d'au moins
 *   CHURN_DROP_RATIO sur 30 jours face aux 30 d'avant (la règle de la
 *   Synthèse), une fois par semaine au plus par client.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 401 });
  }
  const db = createAdminClient();

  // --- Ce qui attend chacun dans le suivi.
  const { data: steps, error } = await db
    .from("projet_steps")
    .select("title, owner, status, position, projet_clients (name), projet_chantiers (title)")
    .in("owner", ASSIGNEES)
    .neq("status", "done")
    .order("position");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  for (const owner of OWNERS) {
    const mine = steps.filter((step) => isAssignedTo(step.owner, owner));
    if (!mine.length) continue;
    // En cours d'abord, puis bloqué, puis à faire (l'ordre du suivi sinon).
    const rank = { doing: 0, blocked: 1, todo: 2 } as Record<string, number>;
    const queue = [...mine].sort((a, b) => rank[a.status] - rank[b.status]);
    const [next, ...rest] = queue;
    const where = next.projet_clients?.name ?? next.projet_chantiers?.title ?? "";
    const blocked = queue.filter((step) => step.status === "blocked").length;
    await notifyOwners([owner], {
      title: `Aujourd'hui : ${next.title}${where ? ` (${where})` : ""}`,
      body:
        [
          ...rest.slice(0, 2).map((step) => step.title),
          rest.length > 2 && `+ ${rest.length - 2} autres`,
          blocked && `${blocked} bloquée${blocked > 1 ? "s" : ""}`,
        ]
          .filter(Boolean)
          .join(" · ") || "Rien d'autre d'ouvert.",
      tag: "point-du-matin",
      url: "/projet",
    });
  }

  // --- Clients en service : ceux du suivi reliés à un établissement ou une boutique.
  const { data: clients } = await db
    .from("projet_clients")
    .select("id, name, etablissement_id, shop_id");
  const linked = (clients ?? []).filter((client) => client.etablissement_id || client.shop_id);
  if (!linked.length) return NextResponse.json({ ok: true });

  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString();
  const period = CLIENT_PERIOD_DAYS[1] * DAY_MS;
  const [yesterday, sameDayLastWeek, current, previous] = await Promise.all(
    [
      [now - DAY_MS, now],
      [now - 8 * DAY_MS, now - 7 * DAY_MS],
      [now - period, now],
      [now - 2 * period, now - period],
    ].map(([from, to]) =>
      db.rpc("admin_service_figures", { p_from: iso(from), p_to: iso(to) }).then((r) => r.data ?? []),
    ),
  );
  const figure = (rows: typeof yesterday, client: (typeof linked)[number]) =>
    rows.find((row) => row.id === (client.etablissement_id ?? client.shop_id));

  // Chiffres des dernières 24 h.
  const day = linked
    .map((client) => ({ client, row: figure(yesterday, client) }))
    .filter(({ row }) => row && row.orders > 0);
  if (day.length) {
    const total = (pick: (row: NonNullable<(typeof day)[number]["row"]>) => number) =>
      day.reduce((sum, { row }) => sum + pick(row!), 0);
    const revenue = total((row) => row.revenue);
    // Le même service, une semaine plus tôt, chez les mêmes clients.
    const lastWeek = day.reduce((sum, { client }) => sum + (figure(sameDayLastWeek, client)?.revenue ?? 0), 0);
    const gap = lastWeek > 0 ? Math.round((revenue / lastWeek - 1) * 100) : null;
    const best = [...day].sort((a, b) => b.row!.revenue - a.row!.revenue);
    await notifyOwners(OWNERS, {
      title: `Hier ${formatEuros(revenue)} · ${formatEuros(total((row) => row.commission))} pour nous`,
      body: [
        best
          .slice(0, 2)
          .map(({ client, row }) => `${client.name} ${formatEuros(row!.revenue)} (${row!.orders} tickets)`)
          .join(" · ") + (best.length > 2 ? ` · + ${best.length - 2}` : ""),
        gap !== null && `${gap >= 0 ? "+" : "−"}${Math.abs(gap)} % vs même jour la semaine dernière`,
      ]
        .filter(Boolean)
        .join(" — "),
      tag: "chiffres-hier",
      url: "/clients",
    });
  }

  // Clients qui décrochent (établissements : la règle porte sur les visites du menu).
  for (const client of linked) {
    if (!client.etablissement_id) continue;
    const before = figure(previous, client)?.sessions ?? 0;
    const now30 = figure(current, client)?.sessions ?? 0;
    if (before >= CHURN_MIN_PREVIOUS_SESSIONS && now30 <= before * (1 - CHURN_DROP_RATIO)) {
      await raiseAlert("decroche", client.id, {
        title: `${client.name} : visites −${Math.round((1 - now30 / before) * 100)} % en ${CLIENT_PERIOD_DAYS[1]} j`,
        body: `Visites du menu ${before} → ${now30}. À appeler.`,
        url: `/projet/${client.id}`,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
