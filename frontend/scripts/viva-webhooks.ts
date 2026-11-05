/*
 * Abonne Ominin aux webhooks Viva du programme ISV : une fois par
 * événement, pour tous les comptes connectés (POST /isv/v1/webhooks). Viva
 * relit d'abord la clé de l'URL par un GET : le déploiement doit déjà servir
 * /api/viva/webhook.
 *
 * Usage, depuis frontend/ :  npm run viva:webhooks -- https://<hôte>/api/viva/webhook
 * Lit .env.local : VIVA_ACCOUNTS_URL, VIVA_API_URL, VIVA_CLIENT_ID et
 * VIVA_CLIENT_SECRET (identifiants ISV).
 */

/**
 * Ceux que /api/viva/webhook traite : paiement créé, paiement refusé, compte
 * connecté, vérification changée (8194 n'existe qu'en production).
 */
const EVENTS = [1796, 1798, 8193, 8194];

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} manque — renseigne frontend/.env.local.`);
  return value;
}

async function main() {
  const url = process.argv[2];
  if (!url || !URL.canParse(url)) throw new Error("Usage : npm run viva:webhooks -- https://<hôte>/api/viva/webhook");

  const credentials = Buffer.from(`${required("VIVA_CLIENT_ID")}:${required("VIVA_CLIENT_SECRET")}`).toString("base64");
  const tokenResponse = await fetch(`${required("VIVA_ACCOUNTS_URL")}/connect/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });
  const { access_token: token } = (await tokenResponse.json()) as { access_token?: string };
  if (!token) throw new Error(`Viva OAuth : HTTP ${tokenResponse.status}`);

  console.log(`Webhooks Viva vers ${url} (${process.env.VIVA_API_URL})`);
  for (const eventTypeId of EVENTS) {
    const response = await fetch(`${required("VIVA_API_URL")}/isv/v1/webhooks`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, eventTypeId }),
    });
    console.log(`  ${eventTypeId} : ${response.ok ? "ok" : `HTTP ${response.status} ${await response.text()}`}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
