import { writeFile } from "node:fs/promises";
import { required } from "./env.ts";

/*
 * Voix off des Reels : synthèse vocale ElevenLabs. La voix et le modèle se
 * règlent dans les variables du dépôt (ELEVENLABS_VOICE_ID,
 * ELEVENLABS_MODEL), la clé dans ses secrets (ELEVENLABS_API_KEY).
 *
 * ElevenLabs rend du PCM brut (16 bits, mono) : on l'enveloppe dans un WAV
 * pour le montage, et sa durée se déduit de sa taille.
 */

const SAMPLE_RATE = 24000;
const BYTES_PER_SAMPLE = 2;

export async function synthesize(text: string, path: string): Promise<number> {
  const voice = required("ELEVENLABS_VOICE_ID");
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=pcm_${SAMPLE_RATE}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": required("ELEVENLABS_API_KEY"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: required("ELEVENLABS_MODEL"),
        language_code: "fr",
      }),
    },
  );
  if (!response.ok) {
    throw new Error(`ElevenLabs : ${response.status} ${await response.text()}`);
  }
  const pcm = Buffer.from(await response.arrayBuffer());
  await writeFile(path, Buffer.concat([wavHeader(pcm.length), pcm]));
  return pcm.length / (SAMPLE_RATE * BYTES_PER_SAMPLE);
}

function wavHeader(dataBytes: number): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataBytes, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * BYTES_PER_SAMPLE, 28);
  header.writeUInt16LE(BYTES_PER_SAMPLE, 32);
  header.writeUInt16LE(BYTES_PER_SAMPLE * 8, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataBytes, 40);
  return header;
}
