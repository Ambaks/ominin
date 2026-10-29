import { NextResponse } from "next/server";
import { REQUEST_BUTTON, outcomeText } from "@/lib/commercial/requests";
import { verifyInteraction } from "@/lib/discord";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Adresse que Discord appelle quand quelqu'un clique un bouton du bot
 * (Interactions Endpoint URL du portail développeur). Chaque appel est signé
 * par Discord ; on vérifie la signature avant tout. Seuls les boutons des
 * demandes de visite existent : Accepter ou Refuser, par celui qui suit le
 * restaurant (commercial_answer_request le vérifie).
 */

/* Types d'interaction et de réponse de l'API Discord. */
const PING = 1;
const COMPONENT = 3;
const PONG = 1;
const MESSAGE = 4;
const UPDATE_MESSAGE = 7;
const EPHEMERAL = 64;

interface Interaction {
  type: number;
  data?: { custom_id?: string };
  member?: { user?: { id: string } };
  user?: { id: string };
}

const privateReply = (content: string) => NextResponse.json({ type: MESSAGE, data: { content, flags: EPHEMERAL } });

export async function POST(request: Request) {
  const body = await request.text();
  const valid = await verifyInteraction(
    request.headers.get("x-signature-ed25519"),
    request.headers.get("x-signature-timestamp"),
    body
  );
  if (!valid) return NextResponse.json({ error: "Signature invalide." }, { status: 401 });

  const interaction = JSON.parse(body) as Interaction;
  if (interaction.type === PING) return NextResponse.json({ type: PONG });
  if (interaction.type !== COMPONENT) return privateReply("Action inconnue.");

  const [kind, answer, id] = (interaction.data?.custom_id ?? "").split(":");
  const userId = interaction.member?.user?.id ?? interaction.user?.id;
  if (kind !== REQUEST_BUTTON || !id || !userId || (answer !== "accept" && answer !== "refuse")) {
    return privateReply("Action inconnue.");
  }

  const admin = createAdminClient();
  const accept = answer === "accept";
  const { error } = await admin.rpc("commercial_answer_request", { p_request: id, p_discord_user: userId, p_accept: accept });
  if (error) return privateReply(error.message);
  return NextResponse.json({
    type: UPDATE_MESSAGE,
    data: { content: await outcomeText(admin, id, accept ? "accepted" : "refused"), components: [], allowed_mentions: { users: [] } },
  });
}
