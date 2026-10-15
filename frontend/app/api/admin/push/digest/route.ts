import { NextResponse } from "next/server";
import { raiseAlert } from "@/lib/admin/alerts";
import {
  CHURN_DROP_RATIO,
  CHURN_MIN_PREVIOUS_SESSIONS,
  CLIENT_PERIOD_DAYS,
} from "@/lib/admin/constants";
import { formatEuros } from "@/lib/admin/format";
import { OWNER_LABELS, OWNERS } from "@/lib/admin/owners";
import { notifyOwners } from "@/lib/admin/push";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Le point du matin (workflow admin-digest) :
 * - à chacun, ce qui l'attend dans le suivi (en cours, bloqué, à faire) et la
 *   prochaine étape — rien à qui n'a rien d'ouvert ;
 * - à tous, les chiffres des dernières 24 h des clients en service (le
 *   service du soir est fini à cette heure-là) ;
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
    .in("owner", OWNERS)
    .neq("status", "done")
    .order("position");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  for (const owner of OWNERS) {
    const mine = steps.filter((step) => step.owner === owner);
    if (!mine.length) continue;
    const count = (status: string) => mine.filter((step) => step.status === status).length;
    // En cours d'abord, puis bloqué, puis à faire.
    const next =
      mine.find((step) => step.status === "doing") ??
      mine.find((step) => step.status === "blocked") ??
      mine[0];
    const where = next.projet_clients?.name ?? next.projet_chantiers?.title ?? "";
    const parts = [
      count("doing") && `${count("doing")} en cours`,
      count("blocked") && `${count("blocked")} bloquée${count("blocked") > 1 ? "s" : ""}`,
      count("todo") && `${count("todo")} à faire`,
    ].filter(Boolean);
    await notifyOwners([owner], {
      title: `Bonjour ${OWNER_LABELS[owner]} · ${parts.join(" · ")}`,
      body: `Prochaine : ${next.title}${where ? ` (${where})` : ""}`,
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
  const [yesterday, current, previous] = await Promise.all(
    [
      [now - DAY_MS, now],
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
    await notifyOwners(OWNERS, {
      title: `Hier : ${formatEuros(total((row) => row.revenue))} encaissés, ${formatEuros(total((row) => row.commission))} pour nous`,
      body: day
        .map(({ client, row }) => `${client.name} ${formatEuros(row!.revenue)} · ${row!.orders} tickets`)
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
        title: `${client.name} décroche`,
        body: `Visites du menu : ${before} → ${now30} sur 30 jours. À appeler.`,
        url: `/projet/${client.id}`,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
