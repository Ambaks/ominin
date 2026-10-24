/*
 * La démo d'Ominin Club, à envoyer aux clubs : L'Étoile, club fictif (pas
 * d'adresse, pas de téléphone), sur la salle du seed, réglée par le
 * fournisseur « demo » (aucun débit). Visible à club.ominin.com/l-etoile-demo,
 * son espace de gestion ouvert au compte CLUB_DEMO_EMAIL. Sa carte de L'Étoile
 * se commande sur son sous-domaine (club.ominin.com/l-etoile-demo/carte) :
 * retirée au bar sans table, apportée à la table avec ?table=<n>.
 *
 * Usage, depuis frontend/ :  npm run club:demo
 * Lit frontend/.env.local : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * CLUB_DEMO_EMAIL, CLUB_DEMO_PASSWORD. N'efface rien : il crée le club s'il
 * manque, ouvre la commande (carte et tables ajoutées si absentes),
 * rétablit l'accès du compte et ajoute les vendredis et samedis des semaines
 * à venir qui n'ont pas encore leur soirée. À relancer pour prolonger la démo.
 */

import { createClient } from "@supabase/supabase-js";
import { SEED_TABLE_COUNT } from "../lib/gestion/constants";
import { getRestaurant } from "../lib/menu-data";
import type { Database, Json } from "../lib/supabase/database.types";
import { check, must } from "../lib/supabase/result";
import { insertFloor, night, ZONES } from "./club-floor";
import { insertCarte } from "./insert-carte";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} manque — renseigne frontend/.env.local.`);
  return value;
}

const url = required("NEXT_PUBLIC_SUPABASE_URL");
const db = createClient<Database>(url, required("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

const SLUG = "l-etoile-demo";
const WEEKS_AHEAD = 6;

// La salle du seed, sans ce qui situe le vrai club.
const DEMO_ZONES = ZONES.map((zone) => ({
  ...zone,
  layout: {
    ...zone.layout,
    marks: zone.layout.marks.map((mark) =>
      mark.label === "Vue sur Toulouse" ? { ...mark, label: "Vue sur la ville" } : mark
    ),
  },
}));

// Une soirée par jour de la semaine (0 = dimanche), comme au programme d'un club.
const NIGHTS: Record<number, { slug: string; title: string; tag: string; start: string; description: string; guestList: number | null }> = {
  5: {
    slug: "orbite",
    title: "Orbite",
    tag: "House & afro house",
    start: "23:30",
    description: "Le vendredi de L'Étoile : house et afro house, du rooftop jusqu'au lever du jour.",
    guestList: null,
  },
  6: {
    slug: "supernova",
    title: "Supernova",
    tag: "Hip-hop · afro · shatta",
    start: "23:59",
    description: "Le samedi de L'Étoile : hip-hop, afro et shatta jusqu'au matin.",
    guestList: 120,
  },
};

/** Les dates (AAAA-MM-JJ, heure de Paris) d'aujourd'hui à WEEKS_AHEAD semaines. */
function upcomingDates(): string[] {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
  const day = new Date(`${today}T12:00:00Z`);
  return Array.from({ length: WEEKS_AHEAD * 7 }, (_, offset) => {
    const date = new Date(day);
    date.setUTCDate(day.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
  });
}

async function ensureClub(): Promise<string> {
  const existing = await db.from("etablissements").select("id").eq("slug", SLUG).maybeSingle();
  check(existing);
  if (existing.data) return existing.data.id;

  const club = must(
    await db
      .from("etablissements")
      .insert({
        name: "L'Étoile",
        slug: SLUG,
        tagline: "Club & Rooftop",
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
  await insertFloor(db, club.id, DEMO_ZONES);
  return club.id;
}

/**
 * La commande au menu QR, en fast food avec retrait au bar : la table d'un QR
 * de table reste notée et s'affiche à l'équipe, qui y apporte la commande.
 */
async function ensureOrdering(clubId: string) {
  check(
    await db
      .from("etablissements")
      .update({
        offre: "connect",
        service_mode: "fast_food",
        bar_pickup: true,
        show_table_number: true,
        online_payment: true,
      })
      .eq("id", clubId)
  );

  // La démo reste utilisable sans passer par Stripe, comme seed-restaurant.
  const subscribed = must(
    await db.from("subscriptions").select("etablissement_id").eq("etablissement_id", clubId).eq("product", "offre")
  );
  if (subscribed.length === 0) {
    check(await db.from("subscriptions").insert({ etablissement_id: clubId, product: "offre", status: "active" }));
  }

  const categories = must(await db.from("categories").select("id").eq("etablissement_id", clubId).limit(1));
  if (categories.length === 0) await insertCarte(db, clubId, getRestaurant("l-etoile")!);

  const tables = must(await db.from("tables").select("id").eq("etablissement_id", clubId).limit(1));
  if (tables.length === 0) {
    check(
      await db
        .from("tables")
        .insert(Array.from({ length: SEED_TABLE_COUNT }, (_, i) => ({ etablissement_id: clubId, number: i + 1 })))
    );
  }
}

async function ensureOwner(clubId: string, email: string, password: string) {
  const { data: list, error } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(error.message);
  let user = list.users.find((candidate) => candidate.email === email);
  if (user) {
    const updated = await db.auth.admin.updateUserById(user.id, { password });
    if (updated.error) throw new Error(updated.error.message);
  } else {
    const created = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { visites: [] },
    });
    if (created.error) throw new Error(created.error.message);
    user = created.data.user;
  }
  check(
    await db.from("memberships").upsert(
      {
        user_id: user.id,
        etablissement_id: clubId,
        role: "gerant",
        email,
        display_name: "Gérant L'Étoile",
      },
      { onConflict: "user_id,etablissement_id" }
    )
  );
}

async function addNights(clubId: string): Promise<number> {
  const taken = new Set(
    must(await db.from("club_events").select("slug").eq("etablissement_id", clubId)).map((event) => event.slug)
  );
  const zoneIds = must(await db.from("club_zones").select("id").eq("etablissement_id", clubId)).map((zone) => zone.id);

  let added = 0;
  for (const date of upcomingDates()) {
    const spec = NIGHTS[new Date(`${date}T12:00:00Z`).getUTCDay()];
    const slug = spec && `${spec.slug}-${date}`;
    if (!spec || taken.has(slug)) continue;
    const event = must(
      await db
        .from("club_events")
        .insert({
          etablissement_id: clubId,
          slug,
          title: spec.title,
          tag: spec.tag,
          description: spec.description,
          ...night(date, spec.start),
          published: true,
          guest_list_open: spec.guestList !== null,
          guest_list_capacity: spec.guestList,
          guest_list_max_party: 4,
        })
        .select("id")
        .single()
    );
    check(await db.from("club_event_zones").insert(zoneIds.map((zoneId) => ({ event_id: event.id, zone_id: zoneId }))));
    added += 1;
  }
  return added;
}

async function main() {
  console.log(`Base visée : ${new URL(url).host} · club « ${SLUG} »`);
  const clubId = await ensureClub();
  await ensureOrdering(clubId);
  await ensureOwner(clubId, required("CLUB_DEMO_EMAIL"), required("CLUB_DEMO_PASSWORD"));
  const added = await addNights(clubId);
  console.log(`Démo prête : ${added} soirée(s) ajoutée(s), accès gérant rétabli pour ${process.env.CLUB_DEMO_EMAIL}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
