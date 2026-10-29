import { mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { CLIPS } from "../../frontend/lib/social/clips.ts";
import { MUSIC_BY_ID } from "../../frontend/lib/social/music.ts";
import { SCREEN_BY_ID } from "../../frontend/lib/social/screens.ts";
import { STOCK_BY_ID } from "../../frontend/lib/social/stock.ts";
import { FEATURES } from "../../frontend/lib/social/features.ts";
import { FPS } from "../src/format.ts";
import type { ReelProps, ReelScript, RenderScene } from "../src/types.ts";
import { type Recording, recordClips } from "./record.ts";
import { type PendingReel, pendingReels, remove, updatePost, upload } from "./supabase.ts";
import { produce } from "./produce/index.ts";
import { bundleSite, openStudio, PUBLIC, prepareShared, ROOT } from "./studio.ts";
import { synthesize } from "./tts.ts";

/*
 * Rendu des Reels (workflow GitHub social-render, lancé par le backend après
 * la rédaction ou une modification), en MP4 1080 × 1920 déposé dans le
 * bucket social-videos ; l'admin voit la vidéo dans « À valider ».
 * - Reel à voix off (reel) : la voix de chaque scène (ElevenLabs), les démos
 *   filmées, puis le montage Remotion (src/Reel.tsx). Vidéos de personnes et
 *   musique viennent des catalogues Mixkit (frontend/lib/social/stock.ts,
 *   music.ts), lues par URL au montage.
 * - Reel en scènes (script) : le montage par agents (scripts/produce), qui
 *   corrige chaque scène puis chaque transition sur ses planches-contacts,
 *   puis le rendu de src/Post.tsx ; le script retenu et les notes des agents
 *   (production) sont enregistrés avec la vidéo.
 */

const OUT = join(ROOT, "out");
/* Silence ajouté après chaque phrase, pour que la voix respire. */
const BREATH_SECONDS = 0.35;
/* Part de l'avancement atteinte au début de chaque étape (la barre de
 * l'admin) : le montage occupe l'essentiel. Et l'écart d'avancement du
 * montage entre deux écritures en base. */
const STEPS = { voice: 0.1, queued: 0.2, upload: 0.95 };
/* Reel en scènes : le montage par agents, puis le rendu de la vidéo. */
const SCENE_STEPS = { agents: 0.1, video: 0.85 };
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
    await progress(reel.id, reel.script ? "En attente du montage par agents" : "Démos filmées", 0);
  }
  await mkdir(OUT, { recursive: true });
  const failures = [
    ...(await renderVoiced(reels.filter((reel) => reel.reel))),
    ...(await renderStaged(reels.filter((reel) => reel.script))),
  ];
  if (failures.length) throw new Error(failures.join("\n"));
}

/** Les Reels en scènes, un par un : montage par agents, rendu, envoi. */
async function renderStaged(posts: PendingReel[]): Promise<string[]> {
  if (!posts.length) return [];
  const failures: string[] = [];
  const studio = await openStudio();
  try {
    for (const post of posts) {
      try {
        const feature = FEATURES.find((item) => item.id === post.feature) ?? null;
        const { script, report } = await produce(studio, post.script!, feature, join(OUT, post.id), async (stage) => {
          await progress(post.id, stage, SCENE_STEPS.agents);
        });
        await progress(post.id, "Rendu de la vidéo", SCENE_STEPS.video);
        const output = join(OUT, `${post.id}.mp4`);
        await studio.video(script, output);
        await progress(post.id, "Envoi de la vidéo", STEPS.upload);
        const path = `${post.id}/${Date.now()}.mp4`;
        await upload(path, await readFile(output));
        if (
          await updatePost(post.id, "rendering", {
            render_status: "ready",
            video_path: path,
            script,
            production: report,
            render_stage: null,
            render_progress: 1,
            render_eta_seconds: null,
          })
        ) {
          if (post.video_path) await remove(post.video_path);
          console.log(`Reel en scènes ${post.id} rendu (${report.final.score}/10) : ${path}`);
        } else {
          // Réécrit pendant le rendu : cette vidéo est déjà périmée.
          await remove(path);
        }
      } catch (error) {
        failures.push(await fail(post, error));
      }
    }
  } finally {
    await studio.close();
  }
  return failures;
}

/** Les Reels à voix off : démos filmées et voix pour tous, puis un montage chacun. */
async function renderVoiced(reels: PendingReel[]): Promise<string[]> {
  if (!reels.length) return [];
  await rm(PUBLIC, { recursive: true, force: true });
  await mkdir(join(PUBLIC, "voice"), { recursive: true });
  await mkdir(join(PUBLIC, "screens"), { recursive: true });
  await prepareShared();

  // Chaque démo filmée une fois pour tous les Reels du passage.
  const demoIds = new Set(
    reels.flatMap((reel) =>
      (reel.reel!.scenes as ReelScript["scenes"]).filter((s) => s.visual === "demo").map((s) => s.media),
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

  // Le bundle embarque le dossier public : il se fait une fois tout préparé,
  // et s'efface ensuite (31 Mo par rendu dans le dossier temporaire).
  const serveUrl = await bundleSite();
  try {
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
  } finally {
    await rm(serveUrl, { recursive: true, force: true });
  }
  return failures;
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
