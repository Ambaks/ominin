/*
 * Le bot Discord d'Ominin, sur le serveur de l'équipe. Route handlers
 * uniquement : le jeton du bot ne doit jamais atteindre le client.
 */
const DISCORD_API = "https://discord.com/api/v10";
// La plus grande page que rend Discord : le serveur de l'équipe y tient.
const MEMBERS_PAGE = 1000;

export interface DiscordMember {
  id: string;
  name: string;
  username: string;
}

function discordConfig() {
  const token = process.env.DISCORD_BOT_TOKEN;
  const guild = process.env.DISCORD_GUILD_ID;
  if (!token || !guild) throw new Error("DISCORD_BOT_TOKEN ou DISCORD_GUILD_ID manquant.");
  return { token, guild };
}

/* Les salons où écrit le site, chacun lu de l'environnement. */
const CHANNELS = {
  terrain: "DISCORD_TERRAIN_CHANNEL_ID",
  victoires: "DISCORD_VICTOIRES_CHANNEL_ID",
  demandes: "DISCORD_DEMANDES_CHANNEL_ID",
  inscriptions: "DISCORD_INSCRIPTIONS_CHANNEL_ID",
} as const;

export type DiscordChannel = keyof typeof CHANNELS;

/** Un bouton de message ; son custom_id revient dans l'interaction au clic. */
export interface DiscordButton {
  label: string;
  customId: string;
  style: "success" | "secondary";
}

/* Le format des boutons que lit Discord : une rangée, styles 3 (vert) et 2 (gris). */
const components = (buttons: DiscordButton[]) =>
  buttons.length
    ? [{ type: 1, components: buttons.map((button) => ({ type: 2, label: button.label, custom_id: button.customId, style: button.style === "success" ? 3 : 2 })) }]
    : [];

function channelId(channel: DiscordChannel): string {
  const id = process.env[CHANNELS[channel]];
  if (!id) throw new Error(`${CHANNELS[channel]} manquant.`);
  return id;
}

/**
 * Poste un message dans un salon et rend son identifiant. Seuls les membres
 * listés dans `mentions` sont notifiés, même si le texte en cite d'autres.
 */
export async function postDiscord(
  channel: DiscordChannel,
  content: string,
  { mentions = [], buttons = [] }: { mentions?: string[]; buttons?: DiscordButton[] } = {}
): Promise<string> {
  const { token } = discordConfig();
  const response = await fetch(`${DISCORD_API}/channels/${channelId(channel)}/messages`, {
    method: "POST",
    headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ content, allowed_mentions: { users: mentions }, components: components(buttons) }),
  });
  if (!response.ok) throw new Error(`Discord a répondu ${response.status}.`);
  return ((await response.json()) as { id: string }).id;
}

/** Réécrit un message du bot : son texte, sans boutons. */
export async function editDiscord(channel: DiscordChannel, messageId: string, content: string): Promise<void> {
  const { token } = discordConfig();
  const response = await fetch(`${DISCORD_API}/channels/${channelId(channel)}/messages/${messageId}`, {
    method: "PATCH",
    headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ content, allowed_mentions: { users: [] }, components: [] }),
  });
  if (!response.ok) throw new Error(`Discord a répondu ${response.status}.`);
}

/**
 * Vérifie qu'une interaction (un clic sur un bouton) vient bien de Discord :
 * signature Ed25519 de l'horodatage et du corps, avec la clé publique de
 * l'application.
 */
export async function verifyInteraction(signature: string | null, timestamp: string | null, body: string): Promise<boolean> {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey || !signature || !timestamp) return false;
  const hex = (value: string) => Uint8Array.from(value.match(/../g) ?? [], (byte) => parseInt(byte, 16));
  const key = await crypto.subtle.importKey("raw", hex(publicKey), { name: "Ed25519" }, false, ["verify"]);
  return crypto.subtle.verify("Ed25519", key, hex(signature), new TextEncoder().encode(timestamp + body));
}

/** Les membres humains du serveur, pour relier chaque commercial à son compte. */
export async function discordMembers(): Promise<DiscordMember[]> {
  const { token, guild } = discordConfig();
  const response = await fetch(`${DISCORD_API}/guilds/${guild}/members?limit=${MEMBERS_PAGE}`, {
    headers: { Authorization: `Bot ${token}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Discord a répondu ${response.status}.`);
  const members = (await response.json()) as {
    nick: string | null;
    user: { id: string; username: string; global_name: string | null; bot?: boolean };
  }[];
  return members
    .filter(({ user }) => !user.bot)
    .map(({ nick, user }) => ({ id: user.id, name: nick ?? user.global_name ?? user.username, username: user.username }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}
