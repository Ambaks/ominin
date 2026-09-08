import { CART_MAX_QUANTITY } from "./constants";

/*
 * Validation des corps de requête des routes /api/shop. Chaque fonction
 * renvoie la valeur normalisée ou un message destiné à la cliente. Pas de
 * bibliothèque de schémas : les formes sont peu nombreuses et stables.
 */

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(value: unknown, max: number, min = 1): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) return null;
  return trimmed;
}

function optionalText(value: unknown, max: number): string | null | undefined {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || value.trim().length > max) return undefined;
  return value.trim();
}

export function parseEmail(value: unknown): string | null {
  const email = text(value, 254, 3)?.toLowerCase();
  return email && EMAIL.test(email) ? email : null;
}

export interface AddressInput {
  line1: string;
  line2: string | null;
  postal_code: string;
  city: string;
  country: string;
}

function parseAddress(value: unknown, country: string): Parsed<AddressInput> {
  const a = (value ?? {}) as Record<string, unknown>;
  const line1 = text(a.line1, 120);
  const postal = text(a.postal_code, 12, 3);
  const city = text(a.city, 80);
  const line2 = optionalText(a.line2, 120);
  if (!line1) return fail("Merci d'indiquer ton adresse.");
  if (!postal) return fail("Merci d'indiquer ton code postal.");
  if (!city) return fail("Merci d'indiquer ta ville.");
  if (line2 === undefined) return fail("Complément d'adresse trop long.");
  return { ok: true, value: { line1, line2, postal_code: postal, city, country } };
}

export interface RelayInput {
  name: string;
  address: string;
  postal_code: string;
  city: string;
  code: string | null;
}

function parseRelay(value: unknown): Parsed<RelayInput> {
  const r = (value ?? {}) as Record<string, unknown>;
  const name = text(r.name, 120);
  const address = text(r.address, 160);
  const postal = text(r.postal_code, 12, 3);
  const city = text(r.city, 80);
  const code = optionalText(r.code, 40);
  if (!name || !address || !postal || !city) {
    return fail("Merci d'indiquer le nom et l'adresse du point relais.");
  }
  if (code === undefined) return fail("Code du point relais trop long.");
  return { ok: true, value: { name, address, postal_code: postal, city, code } };
}

export interface CheckoutItemInput {
  productId: string;
  quantity: number;
  options: { linkId: string; valueId: string }[];
}

export interface CheckoutInput {
  slug: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  shippingMethodId: string;
  country: string;
  address: AddressInput | null;
  relayPoint: RelayInput | null;
  isGift: boolean;
  giftMessage: string | null;
  customerNote: string | null;
  discountCode: string | null;
  items: CheckoutItemInput[];
}

export function parseCheckout(body: unknown): Parsed<CheckoutInput> {
  const b = (body ?? {}) as Record<string, unknown>;
  const slug = text(b.slug, 80);
  if (!slug) return fail("Boutique inconnue.");
  const email = parseEmail(b.email);
  if (!email) return fail("Adresse e-mail invalide.");
  const firstName = text(b.firstName, 60);
  const lastName = text(b.lastName, 60);
  if (!firstName || !lastName) return fail("Merci d'indiquer ton prénom et ton nom.");
  const phone = optionalText(b.phone, 24);
  if (phone === undefined) return fail("Numéro de téléphone trop long.");
  const shippingMethodId = text(b.shippingMethodId, 40);
  if (!shippingMethodId || !UUID.test(shippingMethodId)) return fail("Choisis un mode de livraison.");
  const country = text(b.country, 2, 2)?.toUpperCase();
  if (!country) return fail("Pays invalide.");
  if (b.acceptTerms !== true) return fail("Merci d'accepter les conditions générales de vente.");

  let address: AddressInput | null = null;
  if (b.address) {
    const parsed = parseAddress(b.address, country);
    if (!parsed.ok) return parsed;
    address = parsed.value;
  }
  let relayPoint: RelayInput | null = null;
  if (b.relayPoint) {
    const parsed = parseRelay(b.relayPoint);
    if (!parsed.ok) return parsed;
    relayPoint = parsed.value;
  }

  const giftMessage = optionalText(b.giftMessage, 300);
  const customerNote = optionalText(b.customerNote, 500);
  const discountCode = optionalText(b.discountCode, 40);
  if (giftMessage === undefined) return fail("Le mot doux est limité à 300 caractères.");
  if (customerNote === undefined) return fail("La note est limitée à 500 caractères.");
  if (discountCode === undefined) return fail("Code promo invalide.");

  if (!Array.isArray(b.items) || b.items.length === 0) return fail("Ton panier est vide.");
  const items: CheckoutItemInput[] = [];
  for (const raw of b.items) {
    const i = (raw ?? {}) as Record<string, unknown>;
    const productId = typeof i.productId === "string" && UUID.test(i.productId) ? i.productId : null;
    const quantity = Number.isInteger(i.quantity) ? (i.quantity as number) : 0;
    if (!productId || quantity < 1 || quantity > CART_MAX_QUANTITY) return fail("Article de panier invalide.");
    const options: CheckoutItemInput["options"] = [];
    for (const o of Array.isArray(i.options) ? i.options : []) {
      const opt = (o ?? {}) as Record<string, unknown>;
      if (typeof opt.linkId !== "string" || typeof opt.valueId !== "string" || !UUID.test(opt.linkId) || !UUID.test(opt.valueId)) {
        return fail("Option de panier invalide.");
      }
      options.push({ linkId: opt.linkId, valueId: opt.valueId });
    }
    items.push({ productId, quantity, options });
  }

  return {
    ok: true,
    value: {
      slug,
      email,
      firstName,
      lastName,
      phone,
      shippingMethodId,
      country,
      address,
      relayPoint,
      isGift: b.isGift === true,
      giftMessage,
      customerNote,
      discountCode: discountCode ? discountCode.toUpperCase() : null,
      items,
    },
  };
}

export interface ContactInput {
  slug: string;
  name: string;
  email: string;
  subject: string | null;
  orderNumber: string | null;
  message: string;
}

export function parseContact(body: unknown): Parsed<ContactInput> {
  const b = (body ?? {}) as Record<string, unknown>;
  const slug = text(b.slug, 80);
  if (!slug) return fail("Boutique inconnue.");
  const name = text(b.name, 80);
  if (!name) return fail("Merci d'indiquer ton nom.");
  const email = parseEmail(b.email);
  if (!email) return fail("Adresse e-mail invalide.");
  const subject = optionalText(b.subject, 120);
  const orderNumber = optionalText(b.orderNumber, 30);
  const message = text(b.message, 3000, 5);
  if (subject === undefined || orderNumber === undefined) return fail("Champ trop long.");
  if (!message) return fail("Ton message est vide.");
  return {
    ok: true,
    value: { slug, name, email, subject, orderNumber: orderNumber?.toUpperCase() ?? null, message },
  };
}
