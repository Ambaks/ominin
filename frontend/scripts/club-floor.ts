/*
 * La salle de L'Étoile telle qu'elle est dessinée sur Fourvenues (5 zones,
 * 64 tables, mêmes numéros, mêmes places) et l'écriture des soirées à l'heure
 * de Paris : partagées par la base locale (seed-club) et la démo (club-demo).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ZoneLayout } from "../lib/club/types";
import type { Database, Json } from "../lib/supabase/database.types";
import { check, must } from "../lib/supabase/result";

export type TableSpec = [label: string, x: number, y: number];
export type ZoneSpec = {
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
export const ZONES: ZoneSpec[] = [
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
        { kind: "texte", x: 300, y: 205, label: "Vue sur Toulouse" },
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
      ["209", 100, 72], ["208", 162, 72], ["207", 224, 72], ["206", 286, 72],
      ["205", 348, 72], ["204", 410, 72], ["203", 472, 72], ["202", 534, 72],
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
export function night(date: string, start: string, end = "06:00") {
  const startsAt = new Date(`${date}T${start}:00${parisOffset(date)}`);
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const nextDay = next.toISOString().slice(0, 10);
  const endsAt = new Date(`${nextDay}T${end}:00${parisOffset(nextDay)}`);
  return { starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString() };
}


/** Crée les zones et les tables d'un club ; rend l'id de chaque zone, dans l'ordre de ZONES. */
export async function insertFloor(
  db: SupabaseClient<Database>,
  clubId: string,
  zones: ZoneSpec[] = ZONES
): Promise<string[]> {
  const zoneIds: string[] = [];
  for (const [sort, zone] of zones.entries()) {
    const row = must(
      await db
        .from("club_zones")
        .insert({
          etablissement_id: clubId,
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
          etablissement_id: clubId,
          label,
          seats: zone.seatsByLabel?.[label] ?? zone.seats,
          x,
          y,
          shape: zone.shape,
        }))
      )
    );
  }
  return zoneIds;
}
