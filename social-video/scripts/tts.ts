import { writeFile } from "node:fs/promises";
import { required } from "./env.ts";

/*
 * Voix off des Reels. Fournisseur : synthèse vocale d'OpenAI (paiement à
 * l'usage). Le choix définitif reste à faire avec Ambaka : changer de
 * fournisseur, c'est réécrire cette seule fonction, qui rend un WAV et sa
 * durée. Modèle et voix se règlent dans les variables du dépôt (TTS_MODEL,
 * TTS_VOICE), consigne de diction dans TTS_INSTRUCTIONS.
 */

export async function synthesize(text: string, path: string): Promise<number> {
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${required("OPENAI_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: required("TTS_MODEL"),
      voice: required("TTS_VOICE"),
      input: text,
      response_format: "wav",
      ...(process.env.TTS_INSTRUCTIONS && { instructions: process.env.TTS_INSTRUCTIONS }),
    }),
  });
  if (!response.ok) {
    throw new Error(`Synthèse vocale : ${response.status} ${await response.text()}`);
  }
  const wav = Buffer.from(await response.arrayBuffer());
  await writeFile(path, wav);
  return wavSeconds(wav);
}

/** Durée d'un WAV PCM. La taille du bloc data n'est pas fiable (un flux la
 * laisse à 0xFFFFFFFF) : on compte ce qui suit son en-tête. */
function wavSeconds(wav: Buffer): number {
  let offset = 12;
  let byteRate = 0;
  while (offset + 8 <= wav.length) {
    const id = wav.toString("ascii", offset, offset + 4);
    const size = wav.readUInt32LE(offset + 4);
    if (id === "fmt ") byteRate = wav.readUInt32LE(offset + 16);
    if (id === "data") {
      if (!byteRate) break;
      return (wav.length - offset - 8) / byteRate;
    }
    offset += 8 + size;
  }
  throw new Error("WAV illisible : pas de bloc fmt ou data");
}
