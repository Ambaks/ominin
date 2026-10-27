import { createHmac, timingSafeEqual } from "node:crypto";
import { POPINA } from "./config";

/*
 * Client de l'API Popina côté serveur (route handlers uniquement). L'API est
 * en lecture seule ; une clé vaut pour un lieu, et un 401 veut dire « clé
 * révoquée ». Montants en centimes, taux en centièmes de pour cent.
 */

export class PopinaError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

function apiUrl(): string {
  const url = process.env.POPINA_API_URL;
  if (!url) throw new Error("POPINA_API_URL manquant — renseigne frontend/.env.local.");
  return url.replace(/\/$/, "");
}

export async function popinaApi<T>(apiKey: string, path: string): Promise<T> {
  const response = await fetch(`${apiUrl()}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    signal: AbortSignal.timeout(POPINA.httpTimeoutMs),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = (body as { message?: string; title?: string } | null)?.message;
    throw new PopinaError(
      `Popina GET ${path} : ${detail ?? `HTTP ${response.status}`}`,
      response.status
    );
  }
  return body as T;
}

/** Liste paginée (index / size) lue jusqu'au bout. */
export async function popinaList<T>(apiKey: string, path: string): Promise<T[]> {
  const rows: T[] = [];
  const separator = path.includes("?") ? "&" : "?";
  for (let index = 0; ; index++) {
    const page = await popinaApi<{ data?: T[]; meta?: { totalPage?: number } }>(
      apiKey,
      `${path}${separator}index=${index}&size=${POPINA.pageSize}`
    );
    const data = page.data ?? [];
    rows.push(...data);
    // Une page incomplète est la dernière ; meta, quand il est là, le confirme.
    const totalPage = page.meta?.totalPage;
    if (data.length < POPINA.pageSize || (typeof totalPage === "number" && index + 1 >= totalPage)) {
      return rows;
    }
  }
}

/**
 * Signature des webhooks (x-popina-hmac-signature) : HMAC-SHA256 en
 * hexadécimal du corps BRUT, avec le secret que Popina nous a remis.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.POPINA_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"));
  const received = Buffer.from(signature.toLowerCase());
  return received.length === expected.length && timingSafeEqual(received, expected);
}
