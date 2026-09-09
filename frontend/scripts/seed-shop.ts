/*
 * Insère la boutique MyBox (première boutique Ominin Shop) : catalogue,
 * parfums, livraisons, FAQ, textes et compte de la gérante.
 *
 * Usage, depuis frontend/ :  npm run seed:shop
 * Lit SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY depuis ../backend/.env ;
 * SEED_SHOP_OWNER_PHONE / SEED_SHOP_OWNER_PASSWORD (facultatifs) créent la
 * gérante avec connexion par téléphone (voir lib/shop/phone.ts).
 *
 * Idempotent : la boutique « mybox » existante est supprimée puis
 * réinsérée (les commandes de test avec).
 */

import { createClient } from "@supabase/supabase-js";
import { normalizePhone, phoneToLoginEmail } from "../lib/shop/phone";
import type { Database, TablesInsert } from "../lib/supabase/database.types";
import { must, check } from "../lib/supabase/result";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY manquent — renseigne backend/.env.");

const db = createClient<Database>(url, serviceKey, { auth: { persistSession: false } });

const SLUG = "mybox";
const IMAGE = (slug: string) => `/shop/mybox/${slug}.webp`;

const KAYALI = "Flacon KAYALI, parfum au choix";
const SOL = "Trio Sol de Janeiro : brume parfumée 30 ml, gel douche 90 ml, crème corps 50 ml";
const VOITURE = "Deux diffuseurs de parfum pour la voiture";
const ROSES = "Roses artificielles disposées à la main";
const SURPRISE = "Cadeaux surprise";

interface SeedProduct {
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  composition: string[];
  price: number;
  category: string;
  featured?: boolean;
  badge?: "best-seller" | "nouveau" | "coup-de-coeur";
  perfumeLinks?: string[];
}

const CATEGORIES = [
  { slug: "essentiel", name: "L'Essentiel", description: "Ton parfum KAYALI, un lit de roses et des surprises." },
  { slug: "evasion", name: "L'Évasion", description: "Le trio de soins Sol de Janeiro pour un moment rien qu'à toi." },
  { slug: "nomade", name: "La Nomade", description: "Des parfums pour la voiture, pour emporter ta bulle partout." },
  { slug: "duos", name: "Les Duos", description: "Deux univers réunis dans une seule box." },
  { slug: "ultime", name: "L'Ultime", description: "La box la plus complète : parfum, soins et voiture." },
  { slug: "petits-plaisirs", name: "Petits plaisirs", description: "Des attentions à glisser partout, à petit prix." },
];

const PRODUCTS: SeedProduct[] = [
  { slug: "l-essentiel-30-ml", name: "L'Essentiel 30 ML", subtitle: "Ton parfum KAYALI en grand format", description: "Le flacon KAYALI de 30 ml que tu choisis, posé sur un lit de roses, avec un ou plusieurs cadeaux surprise. La box qui va droit au but.", composition: [`${KAYALI} (30 ml)`, ROSES, SURPRISE], price: 8500, category: "essentiel", badge: "best-seller", featured: true, perfumeLinks: ["Ton parfum KAYALI"] },
  { slug: "l-essentiel-10-ml", name: "L'Essentiel 10 ML", subtitle: "Ton parfum KAYALI en format voyage", description: "Le même rituel, en flacon de 10 ml à glisser dans son sac. Roses et surprises comprises.", composition: [`${KAYALI} (10 ml)`, ROSES, SURPRISE], price: 6000, category: "essentiel", perfumeLinks: ["Ton parfum KAYALI"] },
  { slug: "signature", name: "Signature", subtitle: "Deux flacons KAYALI, un grand et un petit", description: "Notre best-seller : un flacon KAYALI 30 ml et un flacon 10 ml, à choisir dans deux parfums différents ou le même. De quoi parfumer sa journée et glisser le petit dans son sac.", composition: [`${KAYALI} (30 ml)`, `${KAYALI} (10 ml)`, ROSES, SURPRISE], price: 11000, category: "essentiel", badge: "best-seller", featured: true, perfumeLinks: ["Parfum du flacon 30 ml", "Parfum du flacon 10 ml"] },
  { slug: "l-evasion", name: "L'Évasion", subtitle: "Le trio Sol de Janeiro", description: "Brume parfumée, gel douche et crème corps Sol de Janeiro : le trio qui sent les vacances, sur un lit de roses, avec ses surprises.", composition: [SOL, ROSES, SURPRISE], price: 7000, category: "evasion", featured: true },
  { slug: "la-nomade", name: "La Nomade", subtitle: "Deux diffuseurs de parfum pour la voiture", description: "Deux diffuseurs de parfum pour la voiture, inspirés des grandes maisons, pour emporter ta bulle partout.", composition: [VOITURE, ROSES, SURPRISE], price: 6000, category: "nomade", featured: true },
  { slug: "duo-essentiel-30-ml", name: "Duo Essentiel 30 ML", subtitle: "Parfum KAYALI 30 ml et trio Sol de Janeiro", description: "Le parfum et les soins réunis : un flacon KAYALI 30 ml au choix et le trio Sol de Janeiro.", composition: [`${KAYALI} (30 ml)`, SOL, ROSES, SURPRISE], price: 10500, category: "duos", perfumeLinks: ["Ton parfum KAYALI"] },
  { slug: "duo-essentiel-10-ml", name: "Duo Essentiel 10 ML", subtitle: "Parfum KAYALI 10 ml et trio Sol de Janeiro", description: "Le duo parfum et soins en format voyage : un flacon KAYALI 10 ml au choix et le trio Sol de Janeiro.", composition: [`${KAYALI} (10 ml)`, SOL, ROSES, SURPRISE], price: 8000, category: "duos", perfumeLinks: ["Ton parfum KAYALI"] },
  { slug: "duo-nomade-30-ml", name: "Duo Nomade 30 ML", subtitle: "Parfum KAYALI 30 ml et diffuseurs voiture", description: "Ton parfum KAYALI 30 ml et deux diffuseurs pour la voiture : la même signature olfactive, partout.", composition: [`${KAYALI} (30 ml)`, VOITURE, ROSES, SURPRISE], price: 10000, category: "duos", perfumeLinks: ["Ton parfum KAYALI"] },
  { slug: "duo-nomade-10-ml", name: "Duo Nomade 10 ML", subtitle: "Parfum KAYALI 10 ml et diffuseurs voiture", description: "Le duo nomade en format voyage : un flacon KAYALI 10 ml au choix et deux diffuseurs pour la voiture.", composition: [`${KAYALI} (10 ml)`, VOITURE, ROSES, SURPRISE], price: 7500, category: "duos", perfumeLinks: ["Ton parfum KAYALI"] },
  { slug: "duo-evasion", name: "Duo Évasion", subtitle: "Trio Sol de Janeiro et diffuseurs voiture", description: "Les soins Sol de Janeiro et deux diffuseurs pour la voiture : l'évasion à la maison comme sur la route.", composition: [SOL, VOITURE, ROSES, SURPRISE], price: 8000, category: "duos" },
  { slug: "l-ultime-30-ml", name: "L'Ultime 30 ML", subtitle: "Parfum, soins et voiture : tout dedans", description: "La box la plus complète : ton parfum KAYALI 30 ml, le trio Sol de Janeiro et deux diffuseurs pour la voiture. Le cadeau qui ne laisse rien au hasard.", composition: [`${KAYALI} (30 ml)`, SOL, VOITURE, ROSES, SURPRISE], price: 12500, category: "ultime", badge: "coup-de-coeur", featured: true, perfumeLinks: ["Ton parfum KAYALI"] },
  { slug: "l-ultime-10-ml", name: "L'Ultime 10 ML", subtitle: "La box complète, parfum en format voyage", description: "Tout L'Ultime avec un flacon KAYALI 10 ml : soins Sol de Janeiro, diffuseurs voiture, roses et surprises.", composition: [`${KAYALI} (10 ml)`, SOL, VOITURE, ROSES, SURPRISE], price: 10000, category: "ultime", perfumeLinks: ["Ton parfum KAYALI"] },
  { slug: "chic-car-scent", name: "Chic Car Scent", subtitle: "Duo de diffuseurs voiture, mini sac et mini claquettes", description: "Deux diffuseurs de parfum pour la voiture, inspirés des grandes maisons de luxe : un mini sac et une paire de mini claquettes à suspendre au rétroviseur.", composition: ["Diffuseur voiture mini sac", "Diffuseur voiture mini claquettes"], price: 2500, category: "petits-plaisirs", badge: "nouveau" },
];

const PERFUMES = ["Vanilla | 28", "Lovefest Burning Cherry | 48", "Yum Pistachio Gelato | 33", "Eden Juicy Apple | 01", "Sweet Diamond Pink Pepper | 25", "Déjà Vu White Flower | 57", "Utopia Vanilla Coco | 21", "Invite Only Amber | 23", "Musk | 12", "Elixir | 11"];

const SHIPPING: Omit<TablesInsert<"shop_shipping_methods">, "shop_id">[] = [
  { name: "Colissimo à domicile", carrier: "Colissimo", description: "Livraison à domicile avec suivi", kind: "home", price_cents: 690, free_above_cents: 10000, countries: ["FR"], delay_min_days: 2, delay_max_days: 3, is_active: true, sort_order: 1 },
  { name: "Point relais Mondial Relay", carrier: "Mondial Relay", description: "Retrait dans le point relais de ton choix", kind: "relay", price_cents: 490, free_above_cents: 10000, countries: ["FR"], delay_min_days: 3, delay_max_days: 5, instructions: "Indique le nom et l'adresse du point relais souhaité. Tu peux le trouver sur mondialrelay.fr.", is_active: true, sort_order: 2 },
  { name: "Vinted Go, point relais ou casier", carrier: "Vinted Go", description: "Retrait dans un point relais ou un casier Vinted Go", kind: "relay", price_cents: 390, countries: ["FR"], delay_min_days: 3, delay_max_days: 6, instructions: "Indique le nom et l'adresse du point Vinted Go souhaité.", is_active: false, sort_order: 3 },
  { name: "Chronopost express", carrier: "Chronopost", description: "Livraison rapide à domicile", kind: "home", price_cents: 1290, countries: ["FR"], delay_min_days: 1, delay_max_days: 2, is_active: false, sort_order: 4 },
  { name: "Remise en main propre", description: "On convient ensemble d'un créneau après ta commande", kind: "pickup", price_cents: 0, countries: ["FR"], instructions: "Nous te contacterons par e-mail ou téléphone pour fixer un rendez-vous.", is_active: false, sort_order: 5 },
  { name: "Colissimo Europe", carrier: "Colissimo", description: "Belgique, Luxembourg, Suisse", kind: "home", price_cents: 1290, countries: ["BE", "LU", "CH"], delay_min_days: 3, delay_max_days: 6, is_active: false, sort_order: 6 },
];

const FAQ = [
  ["Quel est le délai de livraison ?", "Chaque box est préparée à la main après ta commande, sous 1 à 2 jours ouvrés, puis expédiée avec un numéro de suivi. Compte 2 à 3 jours ouvrés en Colissimo à domicile et 3 à 5 jours en point relais."],
  ["Puis-je choisir le parfum KAYALI ?", "Oui. Sur les box qui contiennent un flacon KAYALI, tu choisis ta fragrance dans la liste au moment d'ajouter la box au panier. La box Signature permet même deux parfums différents."],
  ["C'est pour offrir : comment ça se passe ?", "Au moment de la commande, coche « C'est un cadeau », écris ton mot doux et indique l'adresse de la personne. Le mot est glissé dans la box, aucun prix n'apparaît dans le colis."],
  ["Quels sont les cadeaux surprise ?", "Ils changent à chaque box : accessoires beauté, petites douceurs, jolis objets. C'est la surprise qui fait le charme de l'ouverture."],
  ["Comment payer ?", "Par carte bancaire, Apple Pay ou Google Pay, via Stripe. Le paiement est entièrement sécurisé et aucune donnée bancaire n'est stockée sur le site."],
  ["Puis-je changer d'avis ?", "Tu disposes de 14 jours après réception pour nous retourner une box non ouverte. Écris-nous via la page Contact pour organiser le retour."],
];

const LEGAL_PLACEHOLDER = "[À COMPLÉTER]";

async function main() {
  // Purge de la boutique précédente (cascade sur toutes les tables shop_*).
  check(await db.from("shops").delete().eq("slug", SLUG));

  const shop = must(
    await db
      .from("shops")
      .insert({
        slug: SLUG,
        name: "MyBox",
        tagline: "Petites attentions, grands bonheurs",
        hero_title: "Plus qu'une box, une pause pour toi",
        hero_subtitle: "Des box remplies de douceur, de beauté et de surprises, pour illuminer ton quotidien ou celui d'une personne que tu aimes.",
        catalog_label: "Nos box",
        order_prefix: "MB",
        contact_email: "contact@mybox.fr",
        announcement: "Chaque box est préparée à la main, avec un cadeau surprise glissé dedans",
        about_text:
          "MyBox est née d'une envie simple : offrir, ou s'offrir, une vraie pause. Une boîte ronde qu'on ouvre comme un cadeau, des roses disposées une à une, des produits qu'on aime déjà et toujours une petite surprise en plus.\n\nChaque box est préparée à la main, avec des produits choisis : parfums KAYALI, soins Sol de Janeiro, diffuseurs pour la voiture. Le mot doux est recopié à la main et glissé dans la boîte.",
        free_shipping_threshold_cents: 10000,
        logo_url: "/shop/mybox/logo.png",
        // Image des liens partagés : celle qui représente déjà MyBox sur la
        // page de vente. Le logo rond ne prendrait pas bien dans un aperçu.
        share_image_url: "/shop/mybox/signature.webp",
        theme: { fonts: "romantique" },
        legal_company_name: LEGAL_PLACEHOLDER,
        legal_address: LEGAL_PLACEHOLDER,
        legal_siret: LEGAL_PLACEHOLDER,
        legal_vat: "TVA non applicable, art. 293 B du CGI",
        legal_email: "contact@mybox.fr",
        livraison_retours:
          "Préparation\nChaque box est préparée à la main sous 1 à 2 jours ouvrés après paiement.\n\nLivraison\nColissimo à domicile (2 à 3 jours ouvrés) ou point relais Mondial Relay (3 à 5 jours ouvrés). Livraison offerte dès 100 € d'achat. Un numéro de suivi est envoyé par e-mail à l'expédition.\n\nRetours\nConformément à la loi, tu disposes de 14 jours après réception pour exercer ton droit de rétractation sur une box non ouverte. Écris-nous via la page Contact : nous t'indiquerons la marche à suivre. Les frais de retour restent à ta charge, le remboursement intervient sous 14 jours après réception du colis.",
        cgv: `Objet\nLes présentes conditions générales de vente régissent les ventes réalisées sur la boutique MyBox (${LEGAL_PLACEHOLDER}) auprès de consommateurs.\n\nProduits et prix\nLes box sont décrites sur chaque fiche. Les prix sont indiqués en euros, toutes taxes comprises, hors frais de livraison précisés avant validation de la commande.\n\nCommande et paiement\nLa commande est ferme après paiement en ligne sécurisé (Stripe). Un e-mail de confirmation est envoyé à l'adresse indiquée.\n\nLivraison\nVoir la page Livraison et retours. MyBox ne saurait être tenue responsable des retards imputables au transporteur.\n\nDroit de rétractation\n14 jours à compter de la réception, pour une box non ouverte. Modalités sur la page Livraison et retours.\n\nGaranties et réclamations\nLes garanties légales de conformité et des vices cachés s'appliquent. Toute réclamation peut être adressée via la page Contact. En cas de litige non résolu, le consommateur peut recourir au médiateur de la consommation ${LEGAL_PLACEHOLDER}.\n\nDonnées personnelles\nVoir la politique de confidentialité.`,
        mentions_legales: `Éditeur du site\n${LEGAL_PLACEHOLDER} (raison sociale, adresse, SIRET)\nE-mail : contact@mybox.fr\n\nHébergement\nLa boutique est hébergée par Ominin (ominin.com), sur l'infrastructure de Vercel Inc. et Supabase Inc.\n\nPaiement\nLes paiements sont opérés par Stripe Payments Europe Ltd.`,
        confidentialite:
          "Données collectées\nLors d'une commande : identité, e-mail, téléphone, adresse de livraison, contenu de la commande. Lors d'un message : identité, e-mail, contenu du message.\n\nFinalités\nTraitement et livraison des commandes, service client, envoi de la newsletter sur inscription volontaire.\n\nConservation\nLes données de commande sont conservées pendant la durée légale de conservation des documents comptables. Tu peux te désinscrire de la newsletter à tout moment.\n\nTes droits\nTu disposes d'un droit d'accès, de rectification, d'effacement et d'opposition. Écris-nous via la page Contact.\n\nSous-traitants\nStripe (paiement), Supabase (hébergement des données, Union européenne), Vercel (hébergement du site), Resend (envoi des e-mails).",
      })
      .select("id")
      .single()
  );

  const categories = must(await db.from("shop_categories").insert(CATEGORIES.map((c, i) => ({ ...c, shop_id: shop.id, sort_order: i + 1 }))).select("id, slug"));
  const categoryId = new Map(categories.map((c) => [c.slug, c.id]));

  const group = must(await db.from("shop_option_groups").insert({ shop_id: shop.id, name: "Parfum KAYALI", description: "Fragrance choisie par la cliente pour le flacon KAYALI de sa box." }).select("id").single());
  check(await db.from("shop_option_values").insert(PERFUMES.map((label, i) => ({ group_id: group.id, label, sort_order: i + 1 }))));

  for (const [i, p] of PRODUCTS.entries()) {
    const product = must(
      await db
        .from("shop_products")
        .insert({ shop_id: shop.id, slug: p.slug, name: p.name, subtitle: p.subtitle, description: p.description, composition: p.composition, price_cents: p.price, category_id: categoryId.get(p.category) ?? null, is_featured: p.featured ?? false, badge: p.badge ?? null, sort_order: i + 1 })
        .select("id")
        .single()
    );
    check(await db.from("shop_product_images").insert({ product_id: product.id, url: IMAGE(p.slug), alt: `Box ${p.name}`, sort_order: 0 }));
    if (p.perfumeLinks) {
      check(await db.from("shop_product_options").insert(p.perfumeLinks.map((label, j) => ({ shop_id: shop.id, product_id: product.id, group_id: group.id, label, is_required: true, sort_order: j }))));
    }
  }

  check(await db.from("shop_shipping_methods").insert(SHIPPING.map((m) => ({ ...m, shop_id: shop.id }))));
  check(await db.from("shop_faq_items").insert(FAQ.map(([question, answer], i) => ({ shop_id: shop.id, question, answer, sort_order: i + 1 }))));

  // Gérante : compte par téléphone (adresse technique) si demandé.
  const phone = process.env.SEED_SHOP_OWNER_PHONE ? normalizePhone(process.env.SEED_SHOP_OWNER_PHONE) : null;
  const password = process.env.SEED_SHOP_OWNER_PASSWORD;
  if (phone && password) {
    const email = phoneToLoginEmail(phone);
    const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
    let user = list?.users.find((u) => u.email === email) ?? null;
    if (user) check(await db.auth.admin.updateUserById(user.id, { password, email_confirm: true }));
    else {
      const created = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { product: "shop", phone } });
      if (created.error || !created.data.user) throw new Error(created.error?.message ?? "Création du compte impossible.");
      user = created.data.user;
    }
    check(await db.from("shop_members").upsert({ user_id: user.id, shop_id: shop.id, role: "proprietaire", email }, { onConflict: "user_id,shop_id" }));
    console.log(`Gérante : ${phone} (connexion par téléphone)`);
  }

  console.log(`✓ Boutique MyBox insérée : ${PRODUCTS.length} box, ${PERFUMES.length} parfums, ${SHIPPING.length} modes de livraison, ${FAQ.length} questions.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
