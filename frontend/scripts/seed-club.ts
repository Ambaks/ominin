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
import type { ZoneLayout } from "../lib/club/types";
import type { Database, Json } from "../lib/supabase/database.types";
import { check, must } from "../lib/supabase/result";

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

type TableSpec = [label: string, x: number, y: number];
type ZoneSpec = {
  name: string;
  priceCents: number;
  inclus: string;
  seats: number;
  shape: "carre" | "rond";
  layout: ZoneLayout;
  tables: TableSpec[];
  /** Tables de la zone qui n'ont pas le nombre de places par défaut. */
  seatsByLabel?: Record<string, number>;
};

// Coordonnées relevées sur le plan Fourvenues du club, en unités de plan.
const ZONES: ZoneSpec[] = [
  {
    name: "Rooftop",
    priceCents: 50_000,
    inclus: "1 bouteille 70 cl, softs à volonté",
    seats: 5,
    shape: "carre",
    layout: {
      w: 600,
      h: 500,
      walls: [
        [[245, 30], [25, 30], [25, 470], [575, 470], [575, 230]],
        [[355, 30], [575, 30], [575, 160]],
        [[245, 30], [245, 150]],
        [[355, 30], [355, 150]],
        [[50, 150], [185, 150]],
      ],
      marks: [
        { kind: "dj", x: 310, y: 440, w: 80, h: 30, label: "DJ" },
        { kind: "bar", x: 240, y: 250, w: 140, h: 185, label: "Bar" },
        { kind: "entree", x: 585, y: 195, rotate: 180 },
        { kind: "texte", x: 300, y: 90, label: "Vue sur Toulouse" },
      ],
    },
    tables: [
      ["316", 87, 75], ["317", 159, 75], ["318", 208, 75], ["315", 87, 118],
      ["301", 381, 75], ["302", 430, 75], ["303", 474, 75], ["304", 517, 75],
      ["305", 517, 118], ["314", 80, 234], ["313", 80, 320], ["312", 80, 406],
      ["306", 517, 269], ["307", 517, 313], ["308", 517, 363], ["309", 517, 406],
      ["311", 425, 435], ["310", 474, 435],
    ],
  },
  {
    name: "Bar",
    priceCents: 30_000,
    inclus: "1 bouteille 70 cl",
    seats: 4,
    shape: "carre",
    layout: {
      w: 600,
      h: 220,
      walls: [[[10, 20], [590, 20]]],
      marks: [
        { kind: "bar", x: 20, y: 130, w: 560, h: 34, label: "Bar central" },
        { kind: "piste", x: 20, y: 180, w: 560, h: 30, label: "Piste" },
      ],
    },
    tables: [
      ["1B", 36, 75], ["2B", 94, 75], ["3B", 151, 75], ["4B", 209, 75], ["5B", 266, 75],
      ["6B", 324, 75], ["7B", 381, 75], ["8B", 438, 75], ["9B", 496, 75], ["10B", 553, 75],
    ],
  },
  {
    name: "VIP Balcon",
    priceCents: 150_000,
    inclus: "3 bouteilles 70 cl et 1 champagne",
    seats: 10,
    shape: "carre",
    layout: {
      w: 680,
      h: 320,
      walls: [
        [[35, 180], [35, 18], [652, 18], [640, 180]],
      ],
      marks: [
        { kind: "rambarde", x: 50, y: 172, w: 235 },
        { kind: "rambarde", x: 392, y: 172, w: 233 },
        { kind: "entree", x: 340, y: 190, rotate: -90 },
        { kind: "entree", x: 640, y: 217, rotate: 180 },
        { kind: "wc", x: 18, y: 217, label: "WC" },
        { kind: "piste", x: 40, y: 280, w: 598, h: 20, label: "Vue sur la piste" },
      ],
    },
    tables: [
      ["209", 112, 72], ["208", 155, 72], ["207", 220, 72], ["206", 285, 72],
      ["205", 356, 72], ["204", 420, 72], ["203", 486, 72], ["202", 556, 72],
      ["210", 84, 150], ["201", 586, 150],
    ],
  },
  {
    name: "VIP Salon Rouge",
    priceCents: 100_000,
    inclus: "2 bouteilles 70 cl, softs à volonté",
    seats: 8,
    shape: "rond",
    layout: {
      w: 670,
      h: 290,
      tone: "rouge",
      walls: [
        [[265, 265], [33, 265], [33, 20], [635, 20], [635, 265], [495, 265]],
      ],
      marks: [{ kind: "entree", x: 380, y: 280, rotate: -90 }],
    },
    tables: [
      ["08", 137, 85], ["07", 215, 85], ["06", 303, 85], ["05", 387, 85],
      ["04", 466, 85], ["03", 551, 85], ["09", 86, 141], ["02", 545, 158],
      ["10", 86, 228], ["01", 551, 228], ["11", 295, 177], ["12", 373, 177],
    ],
  },
  {
    name: "VIP Scène",
    priceCents: 250_000,
    inclus: "1 magnum de champagne et 2 bouteilles 70 cl, accès loge artiste",
    seats: 5,
    shape: "carre",
    layout: {
      w: 560,
      h: 330,
      tone: "or",
      walls: [
        [[205, 30], [30, 30], [30, 280], [230, 280]],
        [[230, 95], [230, 280], [510, 280]],
        [[420, 115], [530, 115], [530, 280]],
      ],
      marks: [
        { kind: "rambarde", x: 310, y: 30, w: 210 },
        { kind: "scene", x: 250, y: 102, w: 55, h: 22, label: "" },
        { kind: "dj", x: 80, y: 290, w: 80, h: 26, label: "DJ" },
        { kind: "entree", x: 200, y: 67, rotate: 180 },
        { kind: "entree", x: 525, y: 67, rotate: 180 },
        { kind: "entree", x: 367, y: 90, rotate: 90 },
      ],
    },
    seatsByLabel: { "21": 10, "22": 10, "23": 10, "24": 10 },
    tables: [
      ["32", 60, 76], ["31", 60, 119], ["30", 60, 162], ["29", 60, 205],
      ["25", 196, 125], ["26", 196, 170], ["27", 196, 206], ["28", 196, 248],
      ["33", 353, 33], ["34", 405, 26],
      ["24", 290, 155], ["23", 290, 215], ["21", 456, 155], ["22", 456, 215],
    ],
  },
];

/** Décalage de Paris (« +02:00 » l'été, « +01:00 » l'hiver) à une date donnée. */
function parisOffset(date: string): string {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    timeZoneName: "longOffset",
  })
    .formatToParts(new Date(`${date}T12:00:00Z`))
    .find((part) => part.type === "timeZoneName")!.value;
  return name.replace("GMT", "") || "+00:00";
}

/** Une soirée à l'heure de Paris, fin le lendemain matin. */
function night(date: string, start: string, end = "06:00") {
  const startsAt = new Date(`${date}T${start}:00${parisOffset(date)}`);
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const nextDay = next.toISOString().slice(0, 10);
  const endsAt = new Date(`${nextDay}T${end}:00${parisOffset(nextDay)}`);
  return { starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString() };
}

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

  const zoneIds: string[] = [];
  for (const [sort, zone] of ZONES.entries()) {
    const row = must(
      await db
        .from("club_zones")
        .insert({
          etablissement_id: club.id,
          name: zone.name,
          sort,
          layout: zone.layout as unknown as Json,
          price_cents: zone.priceCents,
          inclus: zone.inclus,
        })
        .select("id")
        .single()
    );
    zoneIds.push(row.id);
    check(
      await db.from("club_tables").insert(
        zone.tables.map(([label, x, y]) => ({
          zone_id: row.id,
          etablissement_id: club.id,
          label,
          seats: zone.seatsByLabel?.[label] ?? zone.seats,
          x,
          y,
          shape: zone.shape,
        }))
      )
    );
  }

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
