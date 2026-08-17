/*
 * Peuple le CRM admin de ~25 restaurants fictifs autour de Montpellier et du
 * littoral, répartis sur les 10 statuts, avec contacts, activités, tâches,
 * rendez-vous et tags — de quoi tester carte, filtres, pipeline, fiches et
 * tableau de bord immédiatement.
 *
 * Usage, depuis frontend/ :  npm run seed:crm
 * Lit SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY depuis ../backend/.env.
 *
 * Idempotent : purge par provenance (source = 'seed', cascade sur les tables
 * filles) puis réinsère. Coordonnées réalistes fixes, téléphones/emails
 * manifestement factices (06 00 00 00 xx, exemple.fr).
 */

import { createClient } from "@supabase/supabase-js";
import type { Database, TablesInsert } from "../lib/supabase/database.types";
import { must } from "../lib/supabase/result";

type LeadStatus = Database["public"]["Enums"]["crm_lead_status"];
type Category = Database["public"]["Enums"]["crm_restaurant_category"];
type Priority = Database["public"]["Enums"]["crm_priority"];

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  throw new Error(
    "SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY manquent — renseigne backend/.env."
  );
}

const db = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false },
});

const daysAgo = (days: number, hour = 11) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};
const daysAhead = (days: number, hour = 10) => daysAgo(-days, hour);

interface SeedRestaurant {
  slug: string;
  name: string;
  category: Category;
  cuisine: string | null;
  address: string;
  city: string;
  postal: string;
  lat: number;
  lng: number;
  owner: string | null;
  status: LeadStatus;
  priority?: Priority;
  value?: number;
  /** Jours depuis le dernier contact réel ; absent = jamais contacté. */
  lastContactDays?: number;
  importantNotes?: string;
  noPhone?: boolean;
  noEmail?: boolean;
  website?: boolean;
}

/* Coordonnées : centres réels des quartiers/communes, décalages à la main. */
const R: SeedRestaurant[] = [
  // Écusson / centre de Montpellier
  { slug: "la-table-de-l-ecusson", name: "La Table de l'Écusson", category: "restaurant", cuisine: "Française", address: "12 rue de l'Aiguillerie", city: "Montpellier", postal: "34000", lat: 43.6119, lng: 3.8772, owner: "Jean Fabre", status: "visited", priority: "high", value: 79, lastContactDays: 2, importantNotes: "Parler à Jean directement, pas au comptoir. Très occupé 12h-14h, repasser vers 15h.", website: true },
  { slug: "chez-marius-demo", name: "Chez Marius", category: "brasserie", cuisine: "Brasserie", address: "4 place Jean-Jaurès", city: "Montpellier", postal: "34000", lat: 43.6104, lng: 3.8749, owner: "Marius Blanc", status: "negotiation", priority: "high", value: 99, lastContactDays: 1, importantNotes: "Utilise Zenchef, déteste la structure de commission. Sensible au prix fixe.", website: true },
  { slug: "pizzeria-del-corso", name: "Pizzeria del Corso", category: "pizzeria", cuisine: "Italienne", address: "18 rue du Faubourg de la Saunerie", city: "Montpellier", postal: "34000", lat: 43.6089, lng: 3.8737, owner: "Enzo Rossi", status: "contacted", lastContactDays: 6 },
  { slug: "le-comptoir-des-halles", name: "Le Comptoir des Halles", category: "restaurant", cuisine: "Marché", address: "2 rue de la Petite Loge", city: "Montpellier", postal: "34000", lat: 43.6113, lng: 3.8761, owner: null, status: "to_contact", noEmail: true },
  { slug: "cafe-du-peyrou", name: "Café du Peyrou", category: "cafe", cuisine: null, address: "31 boulevard Professeur Louis-Vialleton", city: "Montpellier", postal: "34000", lat: 43.6108, lng: 3.8703, owner: "Claire Dumas", status: "new", noPhone: true },
  { slug: "burger-comedie", name: "Burger Comédie", category: "fast_food", cuisine: "Burgers", address: "7 place de la Comédie", city: "Montpellier", postal: "34000", lat: 43.6087, lng: 3.8796, owner: "Karim Saadi", status: "signed", value: 79, lastContactDays: 12, website: true },
  { slug: "boulangerie-saint-roch", name: "Boulangerie Saint-Roch", category: "bakery", cuisine: null, address: "14 rue du Grand Saint-Jean", city: "Montpellier", postal: "34000", lat: 43.6068, lng: 3.8775, owner: "Paul Verdier", status: "not_interested", lastContactDays: 20 },
  // Port Marianne
  { slug: "le-bassin-port-marianne", name: "Le Bassin", category: "restaurant", cuisine: "Méditerranéenne", address: "220 avenue Raymond-Dugrand", city: "Montpellier", postal: "34000", lat: 43.6021, lng: 3.8983, owner: "Sophie Andrieu", status: "appointment_scheduled", priority: "high", value: 99, lastContactDays: 3, importantNotes: "Veut voir une démo du menu QR sur tablette. Associée : Sarah, présente le jeudi.", website: true },
  { slug: "sushi-marianne", name: "Sushi Marianne", category: "restaurant", cuisine: "Japonaise", address: "34 avenue de la Mer-Raymond-Dugrand", city: "Montpellier", postal: "34000", lat: 43.6035, lng: 3.8952, owner: "Léa Nguyen", status: "proposal", value: 79, lastContactDays: 4, website: true },
  { slug: "le-quai-antigone", name: "Le Quai d'Antigone", category: "brasserie", cuisine: "Brasserie", address: "12 esplanade de l'Europe", city: "Montpellier", postal: "34000", lat: 43.6079, lng: 3.8901, owner: "Hugo Martin", status: "contacted", lastContactDays: 9 },
  { slug: "odysseum-tacos", name: "Odysseum Tacos", category: "fast_food", cuisine: "Tex-mex", address: "2 place de Lisbonne", city: "Montpellier", postal: "34000", lat: 43.6047, lng: 3.9204, owner: null, status: "new", noEmail: true },
  // Castelnau-le-Lez / Juvignac / Saint-Jean-de-Védas
  { slug: "l-olivier-de-castelnau", name: "L'Olivier de Castelnau", category: "restaurant", cuisine: "Provençale", address: "355 avenue de la Monnaie", city: "Castelnau-le-Lez", postal: "34170", lat: 43.6331, lng: 3.9021, owner: "Nadia Cherif", status: "visited", lastContactDays: 5 },
  { slug: "pizza-vedas", name: "Pizza Védas", category: "pizzeria", cuisine: "Italienne", address: "12 rue des Écoles", city: "Saint-Jean-de-Védas", postal: "34430", lat: 43.5772, lng: 3.8253, owner: "Toni Greco", status: "to_contact" },
  // Lattes
  { slug: "le-mas-de-lattes", name: "Le Mas de Lattes", category: "restaurant", cuisine: "Française", address: "170 avenue de Pérols", city: "Lattes", postal: "34970", lat: 43.5679, lng: 3.9024, owner: "Bernard Roque", status: "visited", priority: "medium", value: 59, lastContactDays: 7, importantNotes: "Intéressé mais veut en parler à son associé avant de décider." },
  { slug: "port-ariane-grill", name: "Port Ariane Grill", category: "restaurant", cuisine: "Grillades", address: "10 quai du Port-Ariane", city: "Lattes", postal: "34970", lat: 43.5701, lng: 3.9077, owner: "Marc Delor", status: "contacted", lastContactDays: 15 },
  // Pérols
  { slug: "l-etang-de-perols", name: "L'Étang de Pérols", category: "restaurant", cuisine: "Poissons", address: "4 rue des Cabanes", city: "Pérols", postal: "34470", lat: 43.5628, lng: 3.9513, owner: "Élise Bosc", status: "appointment_scheduled", value: 79, lastContactDays: 2 },
  { slug: "perols-kebab-house", name: "Pérols Kebab House", category: "fast_food", cuisine: "Kebab", address: "22 avenue Marcel-Pagnol", city: "Pérols", postal: "34470", lat: 43.5644, lng: 3.9488, owner: null, status: "lost", lastContactDays: 30 },
  // Palavas-les-Flots
  { slug: "la-paillote-bleue", name: "La Paillote Bleue", category: "restaurant", cuisine: "Bord de mer", address: "8 quai Paul-Cunq", city: "Palavas-les-Flots", postal: "34250", lat: 43.5281, lng: 3.9291, owner: "Vincent Sauvaire", status: "proposal", priority: "high", value: 99, lastContactDays: 3, importantNotes: "Saisonnier : décision avant l'ouverture de la saison. Terrasse 120 couverts.", website: true },
  { slug: "le-phare-gourmand", name: "Le Phare Gourmand", category: "restaurant", cuisine: "Fruits de mer", address: "31 boulevard Sarrail", city: "Palavas-les-Flots", postal: "34250", lat: 43.5269, lng: 3.9337, owner: "Anne Castel", status: "visited", lastContactDays: 8 },
  { slug: "glacier-des-flots", name: "Glacier des Flots", category: "cafe", cuisine: "Glaces", address: "2 place du Docteur-Clément", city: "Palavas-les-Flots", postal: "34250", lat: 43.5275, lng: 3.9312, owner: null, status: "new", noPhone: true, noEmail: true },
  // Carnon / Mauguio
  { slug: "carnon-plage-cafe", name: "Carnon Plage Café", category: "bar", cuisine: null, address: "12 avenue Grassion-Cibrand", city: "Carnon", postal: "34280", lat: 43.5452, lng: 3.9721, owner: "Julien Payan", status: "contacted", lastContactDays: 11 },
  { slug: "l-annexe-de-mauguio", name: "L'Annexe de Mauguio", category: "restaurant", cuisine: "Française", address: "5 place de la Libération", city: "Mauguio", postal: "34130", lat: 43.6163, lng: 4.0079, owner: "Céline Vidal", status: "to_contact" },
  // La Grande-Motte
  { slug: "le-ponant-grande-motte", name: "Le Ponant", category: "restaurant", cuisine: "Méditerranéenne", address: "140 rue du Port", city: "La Grande-Motte", postal: "34280", lat: 43.5605, lng: 4.0821, owner: "Franck Aldebert", status: "negotiation", priority: "high", value: 129, lastContactDays: 2, importantNotes: "Compare avec un devis Lightspeed. Rappeler avant vendredi.", website: true },
  { slug: "pyramide-pizza", name: "Pyramide Pizza", category: "pizzeria", cuisine: "Italienne", address: "18 avenue de l'Europe", city: "La Grande-Motte", postal: "34280", lat: 43.5631, lng: 4.0854, owner: null, status: "new" },
  { slug: "hotel-le-large", name: "Hôtel Le Large — Restaurant", category: "hotel_restaurant", cuisine: "Demi-pension", address: "2 allée du Levant", city: "La Grande-Motte", postal: "34280", lat: 43.5587, lng: 4.0788, owner: "Isabelle Reig", status: "visited", lastContactDays: 6 },
  // Le Grau-du-Roi
  { slug: "la-criee-du-grau", name: "La Criée du Grau", category: "restaurant", cuisine: "Poissons", address: "16 quai Colbert", city: "Le Grau-du-Roi", postal: "30240", lat: 43.5384, lng: 4.1358, owner: "Rémi Bastide", status: "signed", value: 99, lastContactDays: 18, website: true },
];

const TAGS = [
  "Fort potentiel",
  "Bord de mer",
  "Zone touristique",
  "Utilise un concurrent",
  "Terrasse",
  "Indépendant",
];

/** Étapes de contact plausibles selon la profondeur du statut. */
const STATUS_DEPTH: Record<LeadStatus, number> = {
  new: 0,
  to_contact: 0,
  contacted: 1,
  visited: 2,
  appointment_scheduled: 3,
  proposal: 4,
  negotiation: 5,
  signed: 6,
  lost: 3,
  not_interested: 2,
};

async function main() {
  // Purge de la passe précédente : cascade sur leads, activités, contacts,
  // tâches, RDV et liaisons de tags.
  const { error: purgeError } = await db
    .from("crm_restaurants")
    .delete()
    .eq("source", "seed");
  if (purgeError) throw new Error(purgeError.message);
  const { error: tagPurgeError } = await db
    .from("crm_tags")
    .delete()
    .in("name", TAGS);
  if (tagPurgeError) throw new Error(tagPurgeError.message);

  const inserted = must(
    await db
      .from("crm_restaurants")
      .insert(
        R.map((r, index): TablesInsert<"crm_restaurants"> => ({
          slug: r.slug,
          name: r.name,
          category: r.category,
          cuisine: r.cuisine,
          address: r.address,
          city: r.city,
          postal_code: r.postal,
          latitude: r.lat,
          longitude: r.lng,
          phone: r.noPhone ? null : `06 00 00 00 ${String(10 + index)}`,
          email: r.noEmail ? null : `contact@${r.slug}.exemple.fr`,
          website: r.website ? `https://${r.slug}.exemple.fr` : null,
          owner_name: r.owner,
          important_notes: r.importantNotes ?? null,
          source: "seed",
        }))
      )
      .select("id, slug")
  );
  const idBySlug = new Map(inserted.map((row) => [row.slug, row.id]));
  const id = (slug: string) => {
    const value = idBySlug.get(slug);
    if (!value) throw new Error(`Restaurant seed introuvable : ${slug}`);
    return value;
  };

  // Les leads ont été créés par trigger — on récupère leurs ids.
  const leadRows = must(
    await db
      .from("crm_leads")
      .select("id, restaurant_id")
      .in("restaurant_id", [...idBySlug.values()])
  );
  const leadByRestaurant = new Map(
    leadRows.map((row) => [row.restaurant_id, row.id])
  );
  const leadId = (slug: string) => {
    const value = leadByRestaurant.get(id(slug));
    if (!value) throw new Error(`Lead seed introuvable : ${slug}`);
    return value;
  };

  // Statuts et champs commerciaux — chaque update de statut journalise une
  // activité status_change via le trigger (created_by null : seed).
  for (const r of R) {
    if (r.status === "new" && !r.value && !r.lastContactDays) continue;
    const { error } = await db
      .from("crm_leads")
      .update({
        status: r.status,
        priority: r.priority ?? "medium",
        estimated_value: r.value ?? null,
        last_contact_at:
          r.lastContactDays !== undefined ? daysAgo(r.lastContactDays) : null,
        lost_reason:
          r.status === "lost"
            ? "Parti chez un concurrent moins cher."
            : r.status === "not_interested"
              ? "Pas de besoin : clientèle d'habitués."
              : null,
      })
      .eq("id", leadId(r.slug));
    if (error) throw new Error(`${r.slug} : ${error.message}`);
  }

  // Fil d'activité plausible selon la profondeur du statut.
  const activities: TablesInsert<"crm_activities">[] = [];
  for (const r of R) {
    const depth = STATUS_DEPTH[r.status];
    const base = r.lastContactDays ?? 10;
    const push = (
      type: TablesInsert<"crm_activities">["type"],
      offset: number,
      description: string | null,
      metadata?: TablesInsert<"crm_activities">["metadata"]
    ) =>
      activities.push({
        restaurant_id: id(r.slug),
        lead_id: leadId(r.slug),
        type,
        description,
        metadata: metadata ?? {},
        created_at: daysAgo(base + offset, 10 + (offset % 7)),
      });

    if (depth >= 1) push("call", 6, "Premier appel. Présentation d'Ominin.");
    if (depth >= 2)
      push(
        "visit",
        3,
        r.slug === "la-table-de-l-ecusson"
          ? "Visite. Parlé avec Jean : intéressé par le menu digital, inquiet du prix."
          : "Visite du restaurant, échange rapide avec l'équipe.",
        { lat: r.lat, lng: r.lng }
      );
    if (depth >= 3) push("appointment", 2, "Rendez-vous calé pour une démo.");
    if (depth >= 4) push("demo", 1, "Démo du menu QR sur tablette, bon accueil.");
    if (depth >= 5)
      push("note", 0, "Négociation en cours : demande un geste sur le premier mois.");
    if (depth >= 6) push("note", 0, "Contrat signé. Onboarding à planifier.");
    if (r.status === "lost") push("note", 0, "Perdu : parti à la concurrence.");
    if (r.status === "not_interested")
      push("note", 0, "Pas intéressé pour le moment. Reessayer la saison prochaine.");
  }
  {
    const { error } = await db.from("crm_activities").insert(activities);
    if (error) throw new Error(error.message);
  }

  // Contacts : décideurs et relais sur une dizaine de fiches.
  const contacts: TablesInsert<"crm_contacts">[] = [
    { restaurant_id: id("la-table-de-l-ecusson"), first_name: "Jean", last_name: "Fabre", role: "Gérant", is_decision_maker: true, phone: "06 00 00 01 01" },
    { restaurant_id: id("la-table-de-l-ecusson"), first_name: "Lucie", last_name: "Moreno", role: "Cheffe de salle", is_decision_maker: false, notes: "Relais sympa, présente en semaine." },
    { restaurant_id: id("le-bassin-port-marianne"), first_name: "Sophie", last_name: "Andrieu", role: "Gérante", is_decision_maker: true, email: "sophie@le-bassin.exemple.fr" },
    { restaurant_id: id("le-bassin-port-marianne"), first_name: "Sarah", last_name: "K.", role: "Associée", is_decision_maker: true, notes: "Présente le jeudi uniquement." },
    { restaurant_id: id("chez-marius-demo"), first_name: "Marius", last_name: "Blanc", role: "Patron", is_decision_maker: true, phone: "06 00 00 01 05" },
    { restaurant_id: id("la-paillote-bleue"), first_name: "Vincent", last_name: "Sauvaire", role: "Gérant", is_decision_maker: true },
    { restaurant_id: id("le-ponant-grande-motte"), first_name: "Franck", last_name: "Aldebert", role: "Directeur", is_decision_maker: true, email: "franck@le-ponant.exemple.fr" },
    { restaurant_id: id("le-mas-de-lattes"), first_name: "Bernard", last_name: "Roque", role: "Gérant", is_decision_maker: true, notes: "Décide avec son associé." },
    { restaurant_id: id("la-criee-du-grau"), first_name: "Rémi", last_name: "Bastide", role: "Gérant", is_decision_maker: true },
    { restaurant_id: id("sushi-marianne"), first_name: "Léa", last_name: "Nguyen", role: "Gérante", is_decision_maker: true },
  ];
  {
    const { error } = await db.from("crm_contacts").insert(contacts);
    if (error) throw new Error(error.message);
  }

  // Tâches : retards, aujourd'hui, semaine — le trigger recalcule
  // next_follow_up_at des leads concernés.
  const task = (
    slug: string,
    title: string,
    dueOffsetDays: number | null,
    priority: Priority = "medium",
    status: "open" | "done" = "open"
  ): TablesInsert<"crm_tasks"> => ({
    restaurant_id: id(slug),
    lead_id: leadId(slug),
    title,
    due_at: dueOffsetDays === null ? null : daysAhead(dueOffsetDays, 9),
    priority,
    status,
    completed_at: status === "done" ? daysAgo(1, 17) : null,
  });
  const tasks: TablesInsert<"crm_tasks">[] = [
    task("chez-marius-demo", "Envoyer la proposition tarifaire", -2, "high"),
    task("la-table-de-l-ecusson", "Relancer Jean après la visite", 0, "high"),
    task("le-ponant-grande-motte", "Rappeler avant vendredi (devis concurrent)", 1, "high"),
    task("le-mas-de-lattes", "Relancer après discussion avec l'associé", 2),
    task("sushi-marianne", "Envoyer la documentation Collect", 3),
    task("la-paillote-bleue", "Préparer l'offre saison (terrasse 120 couverts)", 5, "high"),
    task("port-ariane-grill", "Relancer, sans nouvelles depuis 15 j", -5, "low"),
    task("l-olivier-de-castelnau", "Proposer un créneau de démo", 4),
    task("burger-comedie", "Planifier l'onboarding", 6, "medium"),
    task("le-phare-gourmand", "Déposer une plaquette", null, "low"),
    task("la-criee-du-grau", "Appel de suivi post-signature", 10, "low"),
    task("pizzeria-del-corso", "Rappeler Enzo", -1, "medium"),
    { ...task("burger-comedie", "Envoyer le contrat", null, "medium", "done") },
  ];
  {
    const { error } = await db.from("crm_tasks").insert(tasks);
    if (error) throw new Error(error.message);
  }

  // Rendez-vous passés (tous statuts) et à venir.
  const contactRows = must(
    await db
      .from("crm_contacts")
      .select("id, restaurant_id, is_decision_maker")
  );
  const decisionMaker = (slug: string) =>
    contactRows.find(
      (row) => row.restaurant_id === id(slug) && row.is_decision_maker
    )?.id ?? null;
  const rdv = (
    slug: string,
    title: string,
    startOffsetDays: number,
    hour: number,
    status: Database["public"]["Enums"]["crm_appointment_status"],
    type: Database["public"]["Enums"]["crm_appointment_type"] = "demo"
  ): TablesInsert<"crm_appointments"> => ({
    restaurant_id: id(slug),
    contact_id: decisionMaker(slug),
    title,
    start_at: daysAhead(startOffsetDays, hour),
    end_at: daysAhead(startOffsetDays, hour + 1),
    location: `${R.find((r) => r.slug === slug)?.address}, ${R.find((r) => r.slug === slug)?.city}`,
    status,
    type,
  });
  const appointments: TablesInsert<"crm_appointments">[] = [
    rdv("le-bassin-port-marianne", "Démo menu QR sur tablette", 1, 15, "scheduled"),
    rdv("l-etang-de-perols", "Présentation de l'offre", 3, 10, "scheduled", "visit"),
    rdv("le-ponant-grande-motte", "Point négociation", 4, 14, "scheduled", "follow_up"),
    rdv("chez-marius-demo", "Première démo", -6, 15, "completed"),
    rdv("burger-comedie", "Signature du contrat", -12, 11, "completed", "signing"),
    rdv("perols-kebab-house", "Démo (absent)", -20, 10, "no_show"),
    rdv("boulangerie-saint-roch", "Présentation", -18, 9, "cancelled", "visit"),
  ];
  {
    const { error } = await db.from("crm_appointments").insert(appointments);
    if (error) throw new Error(error.message);
  }

  // Tags et liaisons.
  const tagRows = must(
    await db
      .from("crm_tags")
      .insert(TAGS.map((name) => ({ name })))
      .select("id, name")
  );
  const tagId = (name: string) => {
    const value = tagRows.find((row) => row.name === name)?.id;
    if (!value) throw new Error(`Tag seed introuvable : ${name}`);
    return value;
  };
  const links: [string, string][] = [
    ["la-table-de-l-ecusson", "Fort potentiel"],
    ["chez-marius-demo", "Utilise un concurrent"],
    ["chez-marius-demo", "Fort potentiel"],
    ["le-ponant-grande-motte", "Utilise un concurrent"],
    ["la-paillote-bleue", "Bord de mer"],
    ["la-paillote-bleue", "Terrasse"],
    ["la-paillote-bleue", "Zone touristique"],
    ["le-phare-gourmand", "Bord de mer"],
    ["carnon-plage-cafe", "Bord de mer"],
    ["la-criee-du-grau", "Bord de mer"],
    ["le-mas-de-lattes", "Indépendant"],
    ["hotel-le-large", "Zone touristique"],
  ];
  {
    const { error } = await db.from("crm_restaurant_tags").insert(
      links.map(([slug, name]) => ({
        restaurant_id: id(slug),
        tag_id: tagId(name),
      }))
    );
    if (error) throw new Error(error.message);
  }

  console.log(
    `Seed CRM : ${R.length} restaurants, ${activities.length} activités, ` +
      `${contacts.length} contacts, ${tasks.length} tâches, ` +
      `${appointments.length} RDV, ${TAGS.length} tags.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
