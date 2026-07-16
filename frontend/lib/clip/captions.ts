import Anthropic from "@anthropic-ai/sdk";
import type { CaptionSet, ClipPlatform } from "./provider/types";

/*
 * Génération des titres/descriptions par Claude (route /api/clip/captions
 * uniquement — clé API serveur). Une seule requête, sortie JSON garantie par
 * output_config.format ; le clippeur édite le résultat avant publication.
 */

const CAPTION_MODEL_DEFAULT = "claude-opus-4-8";
const CAPTION_MAX_TOKENS = 1500;
/** Borne la description fournie par le clippeur (et le coût de l'appel). */
export const CAPTION_CONTEXT_MAX_CHARS = 2000;

const SYSTEM_PROMPT = `Tu écris les titres et descriptions de clips vidéo verticaux (extraits de streams et de lives) destinés aux réseaux sociaux. Le clippeur décrit son clip ; tu produis, pour chaque plateforme demandée, un titre accrocheur et fidèle au contenu, dans la langue de sa description.

Règles par plateforme :
- tiktok, instagram, x : un titre de 100 caractères maximum, terminé par 2 à 4 hashtags pertinents.
- youtube : un titre de 100 caractères maximum sans hashtag, plus une description d'une à deux phrases terminée par 2 à 4 hashtags.

Pas de guillemets autour des titres, deux emojis maximum, jamais de mention inventée (nom de streamer, jeu ou événement absent de la description).`;

function captionsSchema(platforms: ClipPlatform[]) {
  const properties: Record<string, unknown> = {};
  for (const platform of platforms) {
    properties[platform] =
      platform === "youtube"
        ? {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
            },
            required: ["title", "description"],
            additionalProperties: false,
          }
        : {
            type: "object",
            properties: { title: { type: "string" } },
            required: ["title"],
            additionalProperties: false,
          };
  }
  return {
    type: "object",
    properties,
    required: platforms,
    additionalProperties: false,
  } as const;
}

export async function generateCaptions(
  context: string,
  platforms: ClipPlatform[]
): Promise<CaptionSet> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY manquante — renseigne frontend/.env.local."
    );
  }
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: process.env.CLIP_CAPTION_MODEL ?? CAPTION_MODEL_DEFAULT,
    max_tokens: CAPTION_MAX_TOKENS,
    system: SYSTEM_PROMPT,
    output_config: {
      format: { type: "json_schema", schema: captionsSchema(platforms) },
    },
    messages: [
      {
        role: "user",
        content: `Plateformes : ${platforms.join(", ")}.\nDescription du clip :\n${context}`,
      },
    ],
  });

  const text = response.content.find((block) => block.type === "text")?.text;
  if (response.stop_reason !== "end_turn" || !text) {
    throw new Error("La génération des titres a échoué.");
  }
  return JSON.parse(text) as CaptionSet;
}
