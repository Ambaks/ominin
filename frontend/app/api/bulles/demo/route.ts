import { NextResponse } from "next/server";
import { BOHO_DEMO_SLUG } from "@/lib/bulles/demo";
import { addDays, currentServiceDate } from "@/lib/bulles/format";
import { rpcMessage } from "@/lib/club/server";
import { isCalendarDay, parisInstant } from "@/lib/collect/hours";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

/*
 * La gestion des bulles de la démonstration (/demo/boho/gestion), sans
 * compte : le serveur lit le soir et fait les gestes de l'accueil avec la clé
 * de service, sur l'établissement de démonstration seulement — la base
 * refuse ces gestes partout ailleurs (bulle_demo_service, 20261027000002).
 */

type Admin = ReturnType<typeof createAdminClient>;
type Source = Exclude<Database["public"]["Enums"]["bulle_reservation_source"], "en_ligne">;

async function demoEtablissement(admin: Admin) {
  const { data } = await admin
    .from("etablissements")
    .select("id, slug, demo, etablissement_settings(day_end_hour)")
    .eq("slug", BOHO_DEMO_SLUG)
    .maybeSingle();
  return data?.demo ? data : null;
}

/** Le soir demandé (?date=AAAA-MM-JJ), ou à défaut le soir de service en cours. */
export async function GET(request: Request) {
  const asked = new URL(request.url).searchParams.get("date");
  if (asked !== null && !isCalendarDay(asked)) {
    return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  }
  const admin = createAdminClient();
  const etab = await demoEtablissement(admin);
  if (!etab) return NextResponse.json({ error: "Démonstration introuvable." }, { status: 404 });
  const dayEndHour = etab.etablissement_settings?.day_end_hour ?? 0;
  const date = asked ?? currentServiceDate(dayEndHour);

  const [reglages, bulles, creneaux, tables, reservations] = await Promise.all([
    admin.from("bulle_reglages").select("*").eq("etablissement_id", etab.id).maybeSingle(),
    admin.from("bulles").select("*").eq("etablissement_id", etab.id).order("sort").order("name"),
    admin.from("bulle_creneaux").select("*").eq("etablissement_id", etab.id).order("weekday").order("start_minutes"),
    admin.from("tables").select("id, number").eq("etablissement_id", etab.id).order("number"),
    admin
      .from("bulle_reservations")
      .select("*, bulle_parts(id, name, places, amount_cents, method, status, organiser)")
      .eq("etablissement_id", etab.id)
      .gte("starts_at", parisInstant(date, dayEndHour * 60).toISOString())
      .lt("starts_at", parisInstant(addDays(date, 1), dayEndHour * 60).toISOString())
      .order("starts_at"),
  ]);
  const failed = [reglages, bulles, creneaux, tables, reservations].find((result) => result.error);
  if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 });

  return NextResponse.json({
    date,
    slug: etab.slug,
    dayEndHour,
    setup: { reglages: reglages.data, bulles: bulles.data, creneaux: creneaux.data },
    tables: tables.data,
    reservations: reservations.data,
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const admin = createAdminClient();
  const etab = await demoEtablissement(admin);
  if (!etab || !body) return NextResponse.json({ error: "Démonstration introuvable." }, { status: 404 });

  let result: { error: { code?: string; message: string } | null };
  if (body.action === "creer") {
    const { data: bulle } = await admin
      .from("bulles")
      .select("id")
      .eq("id", String(body.bulleId))
      .eq("etablissement_id", etab.id)
      .maybeSingle();
    if (!bulle) return NextResponse.json({ error: "Bulle introuvable." }, { status: 404 });
    result = await admin.rpc("creer_reservation_bulle", {
      p_bulle: bulle.id,
      p_starts_at: String(body.startsAt),
      p_name: String(body.name ?? ""),
      p_phone: String(body.phone ?? ""),
      p_party: Number(body.partySize),
      p_source: (body.source === "sur_place" ? "sur_place" : "telephone") satisfies Source,
      p_note: String(body.note ?? ""),
    });
  } else {
    const { data: reservation } = await admin
      .from("bulle_reservations")
      .select("id")
      .eq("id", String(body.reservationId))
      .eq("etablissement_id", etab.id)
      .maybeSingle();
    if (!reservation) return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });
    result =
      body.action === "arrivee"
        ? await admin.rpc("bulle_marquer_arrivee", {
            p_reservation: reservation.id,
            p_arrived: body.arrived === true,
            p_paid: body.paid === true,
          })
        : body.action === "annuler"
          ? await admin.rpc("bulle_annuler_reservation", { p_reservation: reservation.id })
          : { error: { message: "Geste inconnu." } };
  }

  if (result.error) {
    const message = rpcMessage(result.error);
    return NextResponse.json({ error: message ?? "Ce geste n'a pas pu se faire." }, { status: message ? 409 : 500 });
  }
  return NextResponse.json({ ok: true });
}
