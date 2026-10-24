/*
 * L'Étoile (Toulouse) sur Ominin Club, pour une base LOCALE : le club, son
 * gérant de test, sa salle telle qu'elle est dessinée sur Fourvenues (5
 * zones, 64 tables, mêmes numéros, mêmes places) et ses prochaines soirées.
 *
 * Les prix et « ce que comprend la table » sont provisoires, à confirmer
 * avec le club ; les soirées reprennent leur programmation Shotgun.
 *
 * Usage, depuis frontend/ :  npm run seed:club
 * Lit frontend/.env.local : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * CLUB_GERANT_EMAIL, CLUB_GERANT_PASSWORD. Refuse toute base qui n'est pas
 * locale : il supprime et réinsère le club, réservations comprises.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "../lib/supabase/database.types";
import { check, must } from "../lib/supabase/result";
import { insertFloor, night, ZONES } from "./club-floor";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} manque — renseigne frontend/.env.local.`);
  return value;
}

const url = required("NEXT_PUBLIC_SUPABASE_URL");
const host = new URL(url).hostname;
if (host !== "127.0.0.1" && host !== "localhost") {
  throw new Error(`Base ${host} refusée : ce script ne vise qu'une base locale.`);
}
const db = createClient<Database>(url, required("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

const SLUG = "l-etoile";

const EVENTS = [
  {
    slug: "five-stars-24-oct",
    title: "Five Stars",
    tag: "Five Stars",
    ...night("2026-10-24", "23:59"),
    description: "Le samedi de L'Étoile : hip-hop, afro et shatta jusqu'au matin.",
    ticket_url: "https://shotgun.live/events/fivestars-2410",
    guest_list_open: true,
    guest_list_capacity: 120,
  },
  {
    slug: "la-chambre-972",
    title: "La Chambre 972",
    tag: "Halloween Caribbean",
    ...night("2026-10-29", "23:59"),
    description: "Shatta, bouyon, dancehall : Halloween aux couleurs des Antilles.",
    ticket_url: "https://shotgun.live/events/la-chambre-972",
    guest_list_open: true,
    guest_list_capacity: 80,
  },
  {
    slug: "showcase-bello-dallas",
    title: "Showcase Bello & Dallas",
    tag: "Showcase",
    ...night("2026-10-30", "23:00"),
    description: "Les Fantômes d'Hollywood : Bello & Dallas en showcase exceptionnel.",
    ticket_url: "https://shotgun.live/events/showcase-bello-dallas",
    guest_list_open: false,
    guest_list_capacity: null,
  },
  {
    slug: "la-derniere-nuit",
    title: "La Dernière Nuit",
    tag: "Five Stars Edition",
    ...night("2026-10-31", "23:00"),
    description: "Dernier check-in. Halloween au Hollywood Tower Hotel.",
    ticket_url: "https://shotgun.live/events/fivestars-3110",
    guest_list_open: true,
    guest_list_capacity: 150,
  },
  {
    slug: "showcase-vacra",
    title: "Showcase Vacra",
    tag: "The Rolling",
    ...night("2026-11-06", "23:00"),
    description: "Vacra en showcase. Afro, trap, hip-hop.",
    ticket_url: "https://shotgun.live/events/the-rolling-showcase-vacra",
    guest_list_open: false,
    guest_list_capacity: null,
  },
  {
    slug: "five-stars-7-nov",
    title: "Five Stars",
    tag: "Five Stars",
    ...night("2026-11-07", "23:59"),
    description: "Le samedi de L'Étoile : hip-hop, afro et shatta jusqu'au matin.",
    ticket_url: "https://shotgun.live/events/fivestars-0711",
    guest_list_open: true,
    guest_list_capacity: 120,
  },
];

async function main() {
  console.log(`Base visée : ${new URL(url).host} · club « ${SLUG} »`);

  check(await db.from("etablissements").delete().eq("slug", SLUG));
  const club = must(
    await db
      .from("etablissements")
      .insert({
        name: "L'Étoile",
        slug: SLUG,
        tagline: "Club & Rooftop",
        address: "2 avenue d'Atlanta, 31200 Toulouse",
        phone: "07 83 80 33 18",
        payment_provider: "demo",
        table_fee_percent: 5,
        table_deposit_percent: 10,
        club_dress_code: "Tenue élégante exigée",
        club_refused: "Casquettes, sacs et tongs refusés",
      })
      .select("id")
      .single()
  );
  check(
    await db
      .from("etablissement_settings")
      .upsert({ etablissement_id: club.id, features: { soirees: true } as Json })
  );

  const email = required("CLUB_GERANT_EMAIL");
  const password = required("CLUB_GERANT_PASSWORD");
  const { data: list, error } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(error.message);
  let user = list.users.find((candidate) => candidate.email === email);
  if (!user) {
    const created = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { visites: [] },
    });
    if (created.error) throw new Error(created.error.message);
    user = created.data.user;
  }
  check(await db.from("memberships").delete().eq("user_id", user.id));
  check(
    await db.from("memberships").insert({
      user_id: user.id,
      etablissement_id: club.id,
      role: "gerant",
      email,
      display_name: "Gérant L'Étoile",
    })
  );

  const zoneIds = await insertFloor(db, club.id);

  for (const event of EVENTS) {
    const row = must(
      await db
        .from("club_events")
        .insert({ etablissement_id: club.id, published: true, guest_list_max_party: 4, ...event })
        .select("id")
        .single()
    );
    // Les soirs de showcase, la loge artiste n'est pas en vente.
    const showcase = event.tag === "Showcase" || event.tag === "The Rolling";
    check(
      await db.from("club_event_zones").insert(
        zoneIds
          .filter((_, index) => !(showcase && ZONES[index].name === "VIP Scène"))
          .map((zoneId) => ({ event_id: row.id, zone_id: zoneId }))
      )
    );
  }

  const tables = ZONES.reduce((sum, zone) => sum + zone.tables.length, 0);
  console.log(`L'Étoile : ${ZONES.length} zones, ${tables} tables, ${EVENTS.length} soirées.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
