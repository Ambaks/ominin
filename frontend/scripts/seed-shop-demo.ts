/*
 * Boutique de démonstration FICTIVE « Cire & Lin » (bougies et parfums
 * d'intérieur) : vitrine et espace de gestion montrables sans exposer une
 * vraie cliente — captures pour les réseaux, démonstrations commerciales.
 *
 * Usage, depuis frontend/ :  npm run seed:shop-demo
 * Écrit dans le projet Supabase lié à la CLI (la production), via
 * `supabase db query --linked`, en un seul bloc : tout ou rien.
 *
 * Compte de la gérante fictive (connexion par téléphone), une fois la
 * boutique en place :
 *   DEMO_OWNER_PHONE=… DEMO_OWNER_PASSWORD=… npm run seed:shop-demo -- --owner
 * Refuse si le compte existe déjà ; rien d'autre n'est touché.
 *
 * N'efface jamais rien : si le slug existe déjà, le bloc s'arrête en erreur.
 * Pour repartir de zéro, supprimer la boutique à la main, en connaissance de
 * cause. Les commandes insérées sont fictives (aucun paiement Stripe) et
 * marquées comme telles dans leurs notes internes.
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { normalizePhone, phoneToLoginEmail } from "../lib/shop/phone";
import type { ShopPalette } from "../lib/shop/theme";

const SLUG = "cire-et-lin";
const DEMO_NOTE = "Commande fictive : boutique de démonstration Ominin, aucun paiement réel.";
const photo = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=75`;

const PALETTE: ShopPalette = {
  bg: "#f8f4ee",
  paper: "#fffdf9",
  tint: "#f1e9de",
  tintStrong: "#e6d8c6",
  accentSoft: "#d9b99b",
  accent: "#a8714a",
  accentStrong: "#8f5c39",
  accentDeep: "#5e3b26",
  ink: "#2f2620",
  inkSoft: "#6b5d52",
  inkMute: "#9c8f84",
  inkFaint: "#d6cabd",
  line: "#e7dccf",
  lineSoft: "#f0e8dd",
  gold: "#b08d57",
  goldSoft: "#e3d3b5",
  cream: "#f4ead9",
};

const CATEGORIES = [
  { slug: "bougies", name: "Bougies", description: "Cire de soja, mèche en coton ou en bois, coulées à la main.", image: "photo-1602874801007-bd458bb1b8b6" },
  { slug: "diffuseurs", name: "Diffuseurs", description: "Des bâtonnets de rotin pour parfumer une pièce, sans flamme.", image: "photo-1750433101188-8284e112d250" },
  { slug: "coffrets", name: "Coffrets", description: "Nos duos et trios, prêts à offrir.", image: "photo-1603905179139-db12ab535ca9" },
  { slug: "petits-formats", name: "Petits formats", description: "Pour découvrir un parfum ou glisser dans un sac." },
];

interface DemoProduct {
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  composition: string[];
  price: number;
  category: string;
  photo: string;
  featured?: boolean;
  badge?: "best-seller" | "nouveau" | "coup-de-coeur";
  stock?: number;
}

const PRODUCTS: DemoProduct[] = [
  { slug: "bougie-figuier-sauvage", name: "Figuier sauvage", subtitle: "Bougie en céramique, 180 g", description: "Feuille de figuier, lait de figue et une pointe de bois de cèdre : l'odeur d'un jardin en fin d'été. Coulée dans un pot en céramique émaillée, réutilisable une fois la bougie terminée.", composition: ["Cire de soja française", "Mèche en bois", "Pot en céramique émaillée", "Environ 40 heures de combustion"], price: 3200, category: "bougies", photo: "photo-1603897076223-17f346f02a03", featured: true, badge: "best-seller" },
  { slug: "bougie-fleur-de-coton", name: "Fleur de coton", subtitle: "Bougie en verre, 200 g", description: "Un parfum de linge propre, doux et poudré, pour la chambre ou la salle de bain. Le verre se lave et se garde pour un petit bouquet.", composition: ["Cire de soja française", "Mèche en coton", "Verre recyclé", "Environ 45 heures de combustion"], price: 2600, category: "bougies", photo: "photo-1661313562934-d902cb4ad0bb", featured: true },
  { slug: "bougie-ambre-vanille", name: "Ambre & vanille", subtitle: "Bougie en verre ambré, 200 g", description: "Vanille bourbon, ambre chaud et une touche de fève tonka. La bougie des soirées d'hiver, ronde et enveloppante.", composition: ["Cire de soja française", "Mèche en coton", "Verre ambré", "Environ 45 heures de combustion"], price: 2800, category: "bougies", photo: "photo-1554057009-6798cb3d4a04", badge: "nouveau" },
  { slug: "bougie-miel-fleur-oranger", name: "Miel & fleur d'oranger", subtitle: "Grande bougie, 320 g", description: "Un miel doré relevé de fleur d'oranger, lumineux sans être sucré. Notre plus grand format, pour les pièces à vivre.", composition: ["Cire de soja française", "Mèche en coton", "Verre dépoli", "Environ 70 heures de combustion"], price: 3900, category: "bougies", photo: "photo-1585641689080-2e530457803b" },
  { slug: "diffuseur-the-blanc", name: "Thé blanc", subtitle: "Diffuseur à bâtonnets, 100 ml", description: "Thé blanc, bergamote et muguet : une note fraîche et nette pour l'entrée ou le bureau. Retourne les bâtonnets une fois par semaine pour raviver le parfum.", composition: ["Flacon en verre, 100 ml", "8 bâtonnets de rotin", "Environ 8 semaines de diffusion"], price: 3400, category: "diffuseurs", photo: "photo-1750433101188-8284e112d250", featured: true, badge: "best-seller" },
  { slug: "diffuseur-linge-frais", name: "Linge frais", subtitle: "Diffuseur à bâtonnets, 200 ml", description: "Coton, fleur blanche et musc léger, comme une pile de serviettes propres. Le grand flacon pour la salle de bain.", composition: ["Flacon en verre soufflé, 200 ml", "10 bâtonnets de rotin", "Environ 12 semaines de diffusion"], price: 4200, category: "diffuseurs", photo: "photo-1620733717720-bdbe43674ab9" },
  { slug: "diffuseur-ceramique-bois-flotte", name: "Bois flotté", subtitle: "Diffuseur en céramique blanche, 120 ml", description: "Bois flotté, sel marin et sauge : le bord de mer en hiver. Le vase en céramique blanche se recharge avec nos recharges de 200 ml.", composition: ["Vase en céramique, 120 ml", "Bâtonnets en fibre", "Environ 10 semaines de diffusion"], price: 3800, category: "diffuseurs", photo: "photo-1620733719370-0c388a50fe9c", badge: "nouveau", stock: 3 },
  { slug: "coffret-trio-ceramique", name: "Trio céramique", subtitle: "Trois bougies de 100 g dans leur coffret", description: "Figuier sauvage, Fleur de coton et Ambre & vanille, chacune dans son pot en céramique, réunies dans un coffret kraft fermé d'une ficelle. Le cadeau qu'on n'a pas besoin d'emballer.", composition: ["3 bougies de 100 g", "Pots en céramique émaillée", "Coffret kraft et carte manuscrite"], price: 6900, category: "coffrets", photo: "photo-1603905179139-db12ab535ca9", featured: true, badge: "coup-de-coeur" },
  { slug: "coffret-douceur", name: "Coffret Douceur", subtitle: "Un diffuseur et deux bougies piliers", description: "Le diffuseur Linge frais de 100 ml et deux bougies piliers non parfumées, pour une salle de bain qui sent bon et une lumière douce le soir.", composition: ["Diffuseur Linge frais, 100 ml", "2 bougies piliers", "Coffret kraft et carte manuscrite"], price: 5900, category: "coffrets", photo: "photo-1620733723429-0025a5c38b1a" },
  { slug: "photophore-figuier", name: "Photophore Figuier", subtitle: "Petite bougie en verre strié, 80 g", description: "Notre parfum Figuier sauvage en petit format, dans un verre strié qui joue avec la flamme. Idéal pour découvrir le parfum.", composition: ["Cire de soja française", "Mèche en coton", "Verre strié", "Environ 18 heures de combustion"], price: 1400, category: "petits-formats", photo: "photo-1669334388727-9a3437e12fa2" },
];

const SHIPPING = [
  { name: "Colissimo à domicile", carrier: "Colissimo", description: "Livraison à domicile avec suivi", kind: "home", price: 690, freeAbove: 6000, delay: [2, 3] },
  { name: "Point relais Mondial Relay", carrier: "Mondial Relay", description: "Retrait dans le point relais de ton choix", kind: "relay", price: 490, freeAbove: 6000, delay: [3, 5], instructions: "Indique le nom et l'adresse du point relais souhaité." },
  { name: "Retrait à l'atelier", carrier: null, description: "Sur rendez-vous, après ta commande", kind: "pickup", price: 0, freeAbove: null, delay: [1, 2], instructions: "On t'écrit pour convenir d'un créneau." },
];

const FAQ = [
  ["Combien de temps brûle une bougie ?", "Chaque fiche indique une durée moyenne. Laisse la cire fondre jusqu'aux bords dès le premier allumage et recoupe la mèche à 5 mm : la bougie brûlera plus longtemps et plus régulièrement."],
  ["Vos bougies sont-elles naturelles ?", "Elles sont coulées à la main dans une cire de soja française, avec des parfums sans CMR et des mèches en coton ou en bois."],
  ["Quel est le délai de livraison ?", "Les commandes partent sous 2 jours ouvrés. Compte 2 à 3 jours en Colissimo et 3 à 5 jours en point relais. La livraison est offerte dès 60 € d'achat."],
  ["Puis-je offrir une commande ?", "Oui : coche « C'est un cadeau » au moment de commander, écris ton message, il sera recopié à la main. Aucun prix n'apparaît dans le colis."],
];

// Clientes inventées : prénoms courants, adresses en example.com, aucune donnée réelle.
const ORDERS = [
  { first: "Léa", last: "Fontaine", city: "Nantes", items: [["coffret-trio-ceramique", 1]], ship: 0, status: "paid", daysAgo: 0, gift: true },
  { first: "Inès", last: "Garnier", city: "Lille", items: [["bougie-figuier-sauvage", 2]], ship: 1, status: "paid", daysAgo: 1 },
  { first: "Chloé", last: "Bertin", city: "Rennes", items: [["diffuseur-the-blanc", 1], ["photophore-figuier", 1]], ship: 0, status: "preparing", daysAgo: 2 },
  { first: "Manon", last: "Lefort", city: "Tours", items: [["bougie-ambre-vanille", 1], ["bougie-fleur-de-coton", 1]], ship: 1, status: "shipped", daysAgo: 4 },
  { first: "Sarah", last: "Perrin", city: "Dijon", items: [["coffret-douceur", 1]], ship: 0, status: "shipped", daysAgo: 6 },
  { first: "Julie", last: "Marchand", city: "Angers", items: [["bougie-miel-fleur-oranger", 1], ["diffuseur-linge-frais", 1]], ship: 0, status: "delivered", daysAgo: 9 },
  { first: "Emma", last: "Rousseau", city: "Reims", items: [["diffuseur-ceramique-bois-flotte", 1]], ship: 1, status: "delivered", daysAgo: 12 },
  { first: "Camille", last: "Vidal", city: "Annecy", items: [["coffret-trio-ceramique", 1], ["photophore-figuier", 2]], ship: 0, status: "delivered", daysAgo: 17 },
  { first: "Zoé", last: "Lambert", city: "Brest", items: [["bougie-figuier-sauvage", 1]], ship: 1, status: "delivered", daysAgo: 23 },
] as const;

const PLATFORM_FEE = 0.05;

const lit = (value: string | null | undefined) => (value == null ? "null" : `'${value.replaceAll("'", "''")}'`);
const json = (value: unknown) => `${lit(JSON.stringify(value))}::jsonb`;
const textArray = (values: string[]) => `array[${values.map(lit).join(", ")}]::text[]`;

function ownerSql(): string {
  const rawPhone = process.env.DEMO_OWNER_PHONE;
  const password = process.env.DEMO_OWNER_PASSWORD;
  if (!rawPhone || !password) throw new Error("DEMO_OWNER_PHONE et DEMO_OWNER_PASSWORD manquent.");
  const phone = normalizePhone(rawPhone);
  if (!phone) throw new Error("DEMO_OWNER_PHONE n'est pas un numéro valide.");
  const email = phoneToLoginEmail(phone);
  // Les quatre jetons à '' : laissés NULL, GoTrue refuse toute connexion.
  return `
  if exists (select 1 from auth.users where email = ${lit(email)}) then
    raise exception 'Un compte % existe déjà.', ${lit(email)};
  end if;
  v_user := gen_random_uuid();
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', v_user, 'authenticated', 'authenticated', ${lit(email)},
    extensions.crypt(${lit(password)}, extensions.gen_salt('bf')), now(),
    ${json({ provider: "email", providers: ["email"] })}, ${json({ product: "shop", phone })}, now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_user, v_user::text, 'email',
    jsonb_build_object('sub', v_user::text, 'email', ${lit(email)}, 'email_verified', true), now(), now(), now());
  insert into public.shop_members (user_id, shop_id, role, email) values (v_user, v_shop, 'proprietaire', ${lit(email)});`;
}

function shopSql(): string {
  const price = new Map(PRODUCTS.map((p) => [p.slug, p]));
  const lines: string[] = [];

  lines.push(`
  if exists (select 1 from public.shops where slug = ${lit(SLUG)}) then
    raise exception 'La boutique « % » existe déjà : rien n''a été écrit.', ${lit(SLUG)};
  end if;
  insert into public.shops (slug, name, tagline, hero_title, hero_subtitle, catalog_label, order_prefix, contact_email,
    announcement, about_text, free_shipping_threshold_cents, hero_image_url, share_image_url, theme,
    legal_company_name, legal_address, legal_siret, legal_vat, legal_email, livraison_retours, cgv, mentions_legales, confidentialite)
  values (${lit(SLUG)}, 'Cire & Lin', 'Coulées à la main, dans notre atelier',
    'Une flamme douce, un parfum qui reste',
    'Bougies en cire de soja et parfums d''intérieur, fabriqués en petites séries.',
    'Nos créations', 'CL', 'bonjour@cire-et-lin.example',
    'Livraison offerte dès 60 € d''achat',
    ${lit("Cire & Lin est un petit atelier de bougies et de parfums d'intérieur. Chaque bougie est coulée à la main, en petites séries, dans une cire de soja française, puis laissée à reposer deux semaines avant de partir chez toi.\n\nNos parfums sont composés pour rester discrets : une pièce qui sent bon, pas une odeur qui s'impose.")},
    6000, ${lit(photo("photo-1643122966676-29e8597257f7"))}, ${lit(photo("photo-1603905179139-db12ab535ca9"))},
    ${json({ fonts: "elegant", palette: PALETTE })},
    'Boutique de démonstration fictive (Ominin)', 'Adresse fictive', 'Sans objet : boutique fictive',
    'TVA non applicable, art. 293 B du CGI', 'bonjour@cire-et-lin.example',
    ${lit("Expédition\nLes commandes partent sous 2 jours ouvrés, avec un numéro de suivi.\n\nLivraison\nColissimo à domicile (2 à 3 jours ouvrés) ou point relais Mondial Relay (3 à 5 jours ouvrés). Livraison offerte dès 60 € d'achat.\n\nRetours\nTu disposes de 14 jours après réception pour nous retourner un produit non utilisé.")},
    ${lit("Boutique de démonstration\nCire & Lin est une boutique fictive, créée par Ominin pour montrer Ominin Shop. Aucune commande n'y est réellement traitée.")},
    ${lit("Boutique de démonstration\nCire & Lin est une boutique fictive, créée par Ominin pour montrer Ominin Shop.\n\nHébergement\nLa boutique est hébergée par Ominin (ominin.com), sur l'infrastructure de Vercel Inc. et Supabase Inc.")},
    ${lit("Boutique de démonstration\nAucune donnée saisie sur cette boutique fictive n'est utilisée.")})
  returning id into v_shop;`);

  CATEGORIES.forEach((c, i) => {
    lines.push(`
  insert into public.shop_categories (shop_id, slug, name, description, sort_order, image_url, is_highlighted)
  values (v_shop, ${lit(c.slug)}, ${lit(c.name)}, ${lit(c.description)}, ${i + 1}, ${lit(c.image ? photo(c.image) : null)}, ${Boolean(c.image)});`);
  });

  PRODUCTS.forEach((p, i) => {
    lines.push(`
  insert into public.shop_products (shop_id, slug, name, subtitle, description, composition, price_cents, category_id, is_featured, badge, sort_order, stock)
  values (v_shop, ${lit(p.slug)}, ${lit(p.name)}, ${lit(p.subtitle)}, ${lit(p.description)}, ${textArray(p.composition)}, ${p.price},
    (select id from public.shop_categories where shop_id = v_shop and slug = ${lit(p.category)}),
    ${p.featured ?? false}, ${p.badge ? `${lit(p.badge)}::public.shop_product_badge` : "null"}, ${i + 1}, ${p.stock ?? "null"})
  returning id into v_product;
  insert into public.shop_product_images (product_id, url, alt, sort_order) values (v_product, ${lit(photo(p.photo))}, ${lit(`${p.name}, ${p.subtitle.toLowerCase()}`)}, 0);`);
  });

  SHIPPING.forEach((m, i) => {
    lines.push(`
  insert into public.shop_shipping_methods (shop_id, name, carrier, description, kind, price_cents, free_above_cents, countries, delay_min_days, delay_max_days, instructions, is_active, sort_order)
  values (v_shop, ${lit(m.name)}, ${lit(m.carrier)}, ${lit(m.description)}, ${lit(m.kind)}::public.shop_shipping_kind, ${m.price}, ${m.freeAbove ?? "null"}, array['FR'], ${m.delay[0]}, ${m.delay[1]}, ${lit(m.instructions)}, true, ${i + 1});`);
  });

  FAQ.forEach(([question, answer], i) => {
    lines.push(`
  insert into public.shop_faq_items (shop_id, question, answer, sort_order) values (v_shop, ${lit(question)}, ${lit(answer)}, ${i + 1});`);
  });

  // Du plus ancien au plus récent : les numéros suivent les dates.
  for (const o of ORDERS.toReversed()) {
    const subtotal = o.items.reduce((s, [slug, qty]) => s + price.get(slug)!.price * qty, 0);
    const method = SHIPPING[o.ship];
    const shipping = method.freeAbove != null && subtotal >= method.freeAbove ? 0 : method.price;
    const total = subtotal + shipping;
    const at = `now() - interval '${o.daysAgo} days' - interval '${(o.first.length * 37) % 600} minutes'`;
    const email = `${o.first.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()}.${o.last.toLowerCase()}@example.com`;
    const address = { line1: "12 rue des Lilas", postal_code: "00000", city: o.city, country: "FR" };
    lines.push(`
  insert into public.shop_orders (shop_id, email, first_name, last_name, shipping_address, shipping_method_id, shipping_method_name, shipping_kind,
    shipping_cents, is_gift, gift_message, subtotal_cents, platform_fee_cents, total_cents, status, payment_status, carrier, paid_at, shipped_at, delivered_at, admin_notes, created_at)
  values (v_shop, ${lit(email)}, ${lit(o.first)}, ${lit(o.last)}, ${json(address)},
    (select id from public.shop_shipping_methods where shop_id = v_shop and name = ${lit(method.name)}), ${lit(method.name)}, ${lit(method.kind)}::public.shop_shipping_kind,
    ${shipping}, ${"gift" in o}, ${"gift" in o ? lit("Joyeux anniversaire, profite bien de ce petit moment pour toi !") : "null"},
    ${subtotal}, ${Math.round(total * PLATFORM_FEE)}, ${total}, ${lit(o.status)}::public.shop_order_status, 'paid', ${lit(method.carrier)},
    ${at}, ${o.status === "shipped" || o.status === "delivered" ? `${at} + interval '1 day'` : "null"},
    ${o.status === "delivered" ? `${at} + interval '3 days'` : "null"}, ${lit(DEMO_NOTE)}, ${at})
  returning id into v_order;`);
    for (const [slug, qty] of o.items) {
      const p = price.get(slug)!;
      lines.push(`
  insert into public.shop_order_items (order_id, product_id, product_name, product_slug, image_url, unit_price_cents, quantity, total_cents)
  values (v_order, (select id from public.shop_products where shop_id = v_shop and slug = ${lit(slug)}), ${lit(p.name)}, ${lit(slug)}, ${lit(photo(p.photo))}, ${p.price}, ${qty}, ${p.price * qty});`);
    }
  }

  lines.push(`
  insert into public.shop_conversations (shop_id, customer_email, customer_name, subject, last_message_at)
  values (v_shop, 'ines.garnier@example.com', 'Inès Garnier', 'Recharge pour le diffuseur Bois flotté ?', now() - interval '3 hours')
  returning id into v_order;
  insert into public.shop_messages (conversation_id, sender, body, created_at)
  values (v_order, 'customer', 'Bonjour, vendez-vous des recharges pour le diffuseur Bois flotté ? Merci !', now() - interval '3 hours');`);

  return lines.join("\n");
}

const ownerMode = process.argv.includes("--owner");
const body = ownerMode
  ? `
  select id into v_shop from public.shops where slug = ${lit(SLUG)};
  if v_shop is null then
    raise exception 'La boutique « % » n''existe pas : lancer d''abord npm run seed:shop-demo.', ${lit(SLUG)};
  end if;${ownerSql()}`
  : shopSql();

const file = join(mkdtempSync(join(tmpdir(), "seed-shop-demo-")), "seed.sql");
writeFileSync(file, `do $seed$\ndeclare\n  v_shop uuid;\n  v_product uuid;\n  v_order uuid;\n  v_user uuid;\nbegin${body}\nend\n$seed$;\n`);
console.log(`Base visée : projet Supabase lié à la CLI · boutique « ${SLUG} »`);
const run = spawnSync(`npx supabase --workdir .. db query --linked --output-format text --file "${file}"`, { stdio: "inherit", shell: true });
if (run.status !== 0) process.exit(run.status ?? 1);
console.log(ownerMode ? "✓ Compte de la gérante fictive créé." : `✓ Boutique fictive « ${SLUG} » insérée : ${PRODUCTS.length} produits, ${ORDERS.length} commandes fictives.`);
