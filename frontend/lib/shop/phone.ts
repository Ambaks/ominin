import { PHONE_LOGIN_DOMAIN } from "./constants";

/*
 * Connexion des gérantes par numéro de téléphone : Supabase exige un e-mail
 * et un fournisseur de SMS pour le téléphone natif. On associe donc au
 * numéro une adresse technique jamais délivrable ; le numéro reste le seul
 * identifiant visible. Un lien magique ne doit jamais partir vers ce domaine.
 */

export function normalizePhone(input: string): string | null {
  const raw = input.replace(/[\s.\-()]/g, "");
  if (!/^\+?\d{9,15}$/.test(raw)) return null;
  if (raw.startsWith("+")) return raw;
  if (raw.startsWith("00")) return `+${raw.slice(2)}`;
  if (raw.startsWith("0") && raw.length === 10) return `+33${raw.slice(1)}`;
  return `+${raw}`;
}

export function looksLikePhone(input: string): boolean {
  return !input.includes("@") && /^[\s+\d.\-()]{9,}$/.test(input.trim());
}

export function phoneToLoginEmail(phone: string): string {
  return `${phone.replace(/^\+/, "")}@${PHONE_LOGIN_DOMAIN}`;
}

export function isPhoneLoginEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${PHONE_LOGIN_DOMAIN}`);
}

/** Identifiant saisi (téléphone ou e-mail) → e-mail de connexion Supabase. */
export function loginEmailFor(identifier: string): string | null {
  const value = identifier.trim();
  if (looksLikePhone(value)) {
    const phone = normalizePhone(value);
    return phone ? phoneToLoginEmail(phone) : null;
  }
  return value.includes("@") ? value.toLowerCase() : null;
}
