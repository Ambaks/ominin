/*
 * La démonstration des bulles du Boho, à montrer à son gérant avant la vente :
 * un établissement à part (boho-demo), jamais le vrai Boho. Sa carte est celle
 * du registre, habillée comme le menu du Boho ; ses quatre bulles sont posées
 * sur ses dernières tables, dont le menu QR reste fermé tant qu'une
 * réservation payée en entier n'a pas commencé ; le paiement est celui de
 * démonstration (aucun débit). On y voit :
 *   - le site :           menu.ominin.com/m/boho-demo/site
 *   - la réservation :    menu.ominin.com/m/boho-demo/bulle
 *   - le menu d'une bulle : menu.ominin.com/m/boho-demo?table=<n>
 *   - la gestion (onglet Bulles), au compte BOHO_DEMO_EMAIL.
 *
 * Usage, depuis frontend/ :  npm run bulles:demo
 * Lit frontend/.env.local : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * BOHO_DEMO_EMAIL, BOHO_DEMO_PASSWORD. N'efface rien : il crée ce qui manque
 * et rétablit l'accès du compte. À relancer sans risque.
 */

import { createClient } from "@supabase/supabase-js";
import { SEED_TABLE_COUNT } from "../lib/gestion/constants";
import { BOHO_DEMO_SLUG, getRestaurant } from "../lib/menu-data";
import type { Database, Json } from "../lib/supabase/database.types";
import { check, must } from "../lib/supabase/result";
import { ensureDemoOwner } from "./demo-owner";
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

const boho = getRestaurant("boho")!;

// Les réglages validés pour le Boho : 9,90 € la place, de 3 à 8 personnes,
// 2 h, réservable 14 jours à l'avance, TVA d'un article de la carte.
const REGLAGES = {
  place_cents: 990,
  min_party: 3,
  max_party: 8,
  duration_minutes: 120,
  booking_days: 14,
  vat_rate: 10,
};

const BULLES = [
  { name: "La Bleue", color: "#3e6b78" },
  { name: "La Rouge", color: "#b5443a" },
  { name: "La Grise", color: "#8a8580" },
  { name: "La Verte", color: "#6f7f4e" },
];

// Des créneaux de 2 h dans ses horaires du soir (16 h – 2 h ; le samedi, il
// ouvre à 18 h), en minutes depuis minuit du jour (1440 : minuit).
const STARTS = [960, 1080, 1200, 1320, 1440];
const SATURDAY = 6;
const SATURDAY_OPENING = 1080;

async function ensureEtablissement(): Promise<string> {
  const existing = await db.from("etablissements").select("id").eq("slug", BOHO_DEMO_SLUG).maybeSingle();
  check(existing);
  if (existing.data) return existing.data.id;

  const etab = must(
    await db
      .from("etablissements")
      .insert({
        slug: BOHO_DEMO_SLUG,
        name: boho.name,
        tagline: boho.tagline,
        address: boho.address,
        phone: boho.phone,
        hours: boho.hours,
        offre: "smart",
        payment_provider: "demo",
        online_payment: true,
        demo: true,
      })
      .select("id")
      .single()
  );
  check(
    await db
      .from("etablissement_settings")
      .upsert({ etablissement_id: etab.id, features: { bulles: true } as Json })
  );
  // La démo reste utilisable sans passer par Stripe, comme seed-restaurant.
  check(await db.from("subscriptions").insert({ etablissement_id: etab.id, product: "offre", status: "active" }));
  return etab.id;
}

async function ensureSalle(etablissementId: string) {
  const categories = must(await db.from("categories").select("id").eq("etablissement_id", etablissementId).limit(1));
  if (categories.length === 0) await insertCarte(db, etablissementId, boho);

  const tables = must(await db.from("tables").select("id").eq("etablissement_id", etablissementId).limit(1));
  if (tables.length === 0) {
    check(
      await db
        .from("tables")
        .insert(Array.from({ length: SEED_TABLE_COUNT }, (_, i) => ({ etablissement_id: etablissementId, number: i + 1 })))
    );
  }
}

async function ensureBulles(etablissementId: string) {
  const reglages = must(
    await db.from("bulle_reglages").select("etablissement_id").eq("etablissement_id", etablissementId)
  );
  if (reglages.length === 0) {
    check(await db.from("bulle_reglages").insert({ etablissement_id: etablissementId, ...REGLAGES }));
  }

  const bulles = must(await db.from("bulles").select("id").eq("etablissement_id", etablissementId).limit(1));
  if (bulles.length === 0) {
    // Les bulles prennent les dernières tables : les premières restent des
    // tables ordinaires, qui commandent librement.
    const tables = must(
      await db
        .from("tables")
        .select("id, number")
        .eq("etablissement_id", etablissementId)
        .order("number", { ascending: false })
        .limit(BULLES.length)
    ).reverse();
    check(
      await db.from("bulles").insert(
        BULLES.map((bulle, index) => ({
          etablissement_id: etablissementId,
          ...bulle,
          sort: index + 1,
          table_id: tables[index]?.id ?? null,
        }))
      )
    );
  }

  const creneaux = must(
    await db.from("bulle_creneaux").select("id").eq("etablissement_id", etablissementId).limit(1)
  );
  if (creneaux.length === 0) {
    check(
      await db.from("bulle_creneaux").insert(
        Array.from({ length: 7 }, (_, index) => index + 1).flatMap((weekday) =>
          STARTS.filter((start) => weekday !== SATURDAY || start >= SATURDAY_OPENING).map((start_minutes) => ({
            etablissement_id: etablissementId,
            weekday,
            start_minutes,
          }))
        )
      )
    );
  }
}

async function main() {
  console.log(`Base visée : ${new URL(url).host} · démo « ${BOHO_DEMO_SLUG} »`);
  const etablissementId = await ensureEtablissement();
  await ensureSalle(etablissementId);
  await ensureBulles(etablissementId);
  await ensureDemoOwner(db, etablissementId, {
    email: required("BOHO_DEMO_EMAIL"),
    password: required("BOHO_DEMO_PASSWORD"),
    displayName: "Gérant BOHO (démo)",
  });
  console.log(`Démo prête, accès gérant rétabli pour ${process.env.BOHO_DEMO_EMAIL}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
