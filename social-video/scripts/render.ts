import { copyFile, mkdir, readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { CLIPS } from "../../frontend/lib/social/clips.ts";
import { MUSIC_BY_ID } from "../../frontend/lib/social/music.ts";
import { SCREEN_BY_ID, screenPath } from "../../frontend/lib/social/screens.ts";
import { STOCK_BY_ID } from "../../frontend/lib/social/stock.ts";
import { FPS } from "../src/format.ts";
import type { ReelProps, ReelScript, RenderScene } from "../src/types.ts";
import { type Recording, recordClips } from "./record.ts";
import { type PendingReel, pendingReels, remove, updatePost, upload } from "./supabase.ts";
import { synthesize } from "./tts.ts";

/*
 * Rendu des Reels (workflow GitHub social-render, lancé par le backend après
 * la rédaction ou une modification). Pour chaque Reel en attente : la voix
 * de chaque scène (ElevenLabs), les démos filmées, puis le montage Remotion
 * (src/Reel.tsx) en MP4 1080 × 1920, déposé dans le bucket social-videos.
 * Vidéos de personnes et musique viennent des catalogues Mixkit
 * (frontend/lib/social/stock.ts, music.ts), lues par URL au montage.
 * L'admin voit la vidéo dans « À valider ».
 */

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const FRONTEND = join(ROOT, "..", "frontend");
const PUBLIC = join(ROOT, "public");
const OUT = join(ROOT, "out");
/* Silence ajouté après chaque phrase, pour que la voix respire. */
const BREATH_SECONDS = 0.35;
/* Part de l'avancement atteinte au début de chaque étape (la barre de
 * l'admin) : le montage occupe l'essentiel. Et l'écart d'avancement du
 * montage entre deux écritures en base. */
const STEPS = { voice: 0.1, queued: 0.2, upload: 0.95 };
const PROGRESS_STEP = 0.05;
const CLIP_BY_ID = new Map(CLIPS.map((clip) => [clip.id, clip]));

function progress(id: string, stage: string, done: number, etaSeconds: number | null = null) {
  return updatePost(id, "rendering", {
    render_stage: stage,
    render_progress: done,
    render_eta_seconds: etaSeconds,
  });
}

async function main() {
  const reels = await pendingReels();
  if (!reels.length) {
    console.log("Aucun Reel à rendre.");
    return;
  }
  // Tous passent « en cours » d'emblée : l'admin montre leur avancement.
  for (const reel of reels) {
    await updatePost(reel.id, "pending", { render_status: "rendering", render_error: null });
    await progress(reel.id, "Démos filmées", 0);
  }
  await rm(PUBLIC, { recursive: true, force: true });
  await mkdir(join(PUBLIC, "voice"), { recursive: true });
  await mkdir(join(PUBLIC, "screens"), { recursive: true });
  await mkdir(OUT, { recursive: true });
  await prepareShared();

  // Chaque démo filmée une fois pour tous les Reels du passage.
  const demoIds = new Set(
    reels.flatMap((reel) =>
      (reel.reel.scenes as ReelScript["scenes"]).filter((s) => s.visual === "demo").map((s) => s.media),
    ),
  );
  const recordings = await recordClips([...demoIds], PUBLIC);

  const prepared: { reel: PendingReel; props: ReelProps }[] = [];
  const failures: string[] = [];
  for (const reel of reels) {
    try {
      await progress(reel.id, "Voix off", STEPS.voice);
      prepared.push({ reel, props: await prepare(reel, recordings) });
      await progress(reel.id, "En attente du montage", STEPS.queued);
    } catch (error) {
      failures.push(await fail(reel, error));
    }
  }

  // Le bundle embarque le dossier public : il se fait une fois tout préparé.
  const serveUrl = await bundle({ entryPoint: join(ROOT, "src", "index.tsx"), publicDir: PUBLIC });
  for (const { reel, props } of prepared) {
    try {
      const composition = await selectComposition({ serveUrl, id: "Reel", inputProps: props });
      const output = join(OUT, `${reel.id}.mp4`);
      const started = Date.now();
      let reported = 0;
      await renderMedia({
        composition,
        serveUrl,
        codec: "h264",
        audioCodec: "aac",
        outputLocation: output,
        inputProps: props,
        // Avancement du montage, écrit en base par paliers : l'admin le relit.
        onProgress: ({ progress: done }) => {
          if (done - reported < PROGRESS_STEP || done <= 0) return;
          reported = done;
          const elapsed = (Date.now() - started) / 1000;
          void progress(
            reel.id,
            "Montage",
            STEPS.queued + (STEPS.upload - STEPS.queued) * done,
            Math.round((elapsed * (1 - done)) / done),
          ).catch(() => undefined);
        },
      });
      await progress(reel.id, "Envoi de la vidéo", STEPS.upload);
      const path = `${reel.id}/${Date.now()}.mp4`;
      await upload(path, await readFile(output));
      if (
        await updatePost(reel.id, "rendering", {
          render_status: "ready",
          video_path: path,
          render_stage: null,
          render_progress: 1,
          render_eta_seconds: null,
        })
      ) {
        if (reel.video_path) await remove(reel.video_path);
        console.log(`Reel ${reel.id} rendu : ${path}`);
      } else {
        // Script modifié pendant le rendu : cette vidéo est déjà périmée.
        await remove(path);
      }
    } catch (error) {
      failures.push(await fail(reel, error));
    }
  }
  if (failures.length) throw new Error(failures.join("\n"));
}

/** Polices et logo du gabarit, captures du catalogue. */
async function prepareShared() {
  await mkdir(join(PUBLIC, "fonts"), { recursive: true });
  for (const font of [
    "geist-latin-400-normal.woff",
    "geist-latin-800-normal.woff",
    "fraunces-latin-500-normal.woff",
  ]) {
    await copyFile(join(FRONTEND, "assets", "fonts", font), join(PUBLIC, "fonts", font));
  }
  await copyFile(join(FRONTEND, "public", "logo.png"), join(PUBLIC, "logo.png"));
  for (const id of SCREEN_BY_ID.keys()) {
    await copyFile(join(FRONTEND, "public", screenPath(id)), join(PUBLIC, "screens", `${id}.jpg`));
  }
}

async function prepare(reel: PendingReel, recordings: Map<string, Recording>): Promise<ReelProps> {
  const script = reel.reel as ReelScript;
  const scenes: RenderScene[] = [];

  for (const [index, written] of script.scenes.entries()) {
    const voice = `voice/${reel.id}-${index}.wav`;
    const seconds = (await synthesize(written.voiceover, join(PUBLIC, voice))) + BREATH_SECONDS;
    const recording = written.visual === "demo" ? recordings.get(written.media) : undefined;
    // Démo non filmée (site injoignable) : sa capture de secours, dans le
    // même téléphone, plutôt qu'un Reel en échec.
    const fallback = written.visual === "demo" && !recording ? CLIP_BY_ID.get(written.media)?.fallbackScreen : undefined;
    if (written.visual === "demo" && !recording && !fallback) {
      throw new Error(`démo « ${written.media} » ni filmée ni remplaçable`);
    }
    const scene = fallback ? { ...written, visual: "screen" as const, media: fallback } : written;
    if (scene.visual === "screen" && !SCREEN_BY_ID.has(scene.media)) {
      throw new Error(`capture « ${scene.media} » inconnue`);
    }
    const stock = scene.visual === "stock" ? STOCK_BY_ID.get(scene.media) : undefined;
    if (scene.visual === "stock" && !stock) throw new Error(`vidéo « ${scene.media} » inconnue`);
    scenes.push({
      caption: scene.caption,
      voiceover: scene.voiceover,
      visual: scene.visual,
      src:
        scene.visual === "stock"
          ? stock!.url
          : scene.visual === "demo"
            ? recording!.file
            : scene.visual === "screen"
              ? `screens/${scene.media}.jpg`
              : null,
      clipStart: recording?.start ?? 0,
      clipSeconds: recording?.seconds ?? 0,
      focusBottom: SCREEN_BY_ID.get(scene.media)?.focus === "bottom",
      voice,
      frames: Math.ceil(seconds * FPS),
    });
  }
  return {
    brand: reel.brand as ReelProps["brand"],
    scenes,
    cta: script.cta,
    // Morceau retiré du catalogue depuis la rédaction : la voix seule.
    music: MUSIC_BY_ID.get(script.music)?.url ?? null,
  };
}

async function fail(reel: PendingReel, error: unknown): Promise<string> {
  const message = error instanceof Error ? error.message : String(error);
  await updatePost(reel.id, "rendering", { render_status: "failed", render_error: message }).catch(() => false);
  return `${reel.id} : ${message}`;
}

await main();
