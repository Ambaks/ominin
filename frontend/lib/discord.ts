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

/**
 * Poste un message dans un salon. Seuls les membres listés dans `mentions`
 * sont notifiés, même si le texte en cite d'autres.
 */
export async function postDiscord(channel: DiscordChannel, content: string, mentions: string[] = []): Promise<void> {
  const { token } = discordConfig();
  const channelId = process.env[CHANNELS[channel]];
  if (!channelId) throw new Error(`${CHANNELS[channel]} manquant.`);
  const response = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ content, allowed_mentions: { users: mentions } }),
  });
  if (!response.ok) throw new Error(`Discord a répondu ${response.status}.`);
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
