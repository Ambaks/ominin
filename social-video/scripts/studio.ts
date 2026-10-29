import { copyFile, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { openBrowser, renderFrames, renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { SCREEN_BY_ID, screenPath } from "../../frontend/lib/social/screens.ts";
import type { PostScript } from "../../frontend/lib/social/script.ts";
import type { PostProps } from "../src/types.ts";
import { webpackOverride } from "./webpack.ts";

/*
 * Le banc de rendu partagé : public/ préparé (polices du site, logo,
 * captures), un seul bundle, un seul navigateur pour toutes les images fixes
 * que regardent les agents du montage.
 */

export const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
export const PUBLIC = join(ROOT, "public");
const FRONTEND = join(ROOT, "..", "frontend");
/* Images fixes des agents : demi-définition, assez pour juger, deux fois moins lourdes. */
const STILL_SCALE = 0.5;

/** Polices du site (le bundle charge toutes les compositions), logo, captures. */
export async function prepareShared(): Promise<void> {
  const fonts = join(FRONTEND, "assets", "fonts");
  await mkdir(join(PUBLIC, "fonts"), { recursive: true });
  await mkdir(join(PUBLIC, "screens"), { recursive: true });
  for (const font of (await readdir(fonts)).filter((file) => file.endsWith(".woff"))) {
    await copyFile(join(fonts, font), join(PUBLIC, "fonts", font));
  }
  await copyFile(join(FRONTEND, "public", "logo.png"), join(PUBLIC, "logo.png"));
  for (const id of SCREEN_BY_ID.keys()) {
    await copyFile(join(FRONTEND, "public", screenPath(id)), join(PUBLIC, "screens", `${id}.jpg`));
  }
}

export function bundleSite(): Promise<string> {
  return bundle({ entryPoint: join(ROOT, "src", "index.tsx"), publicDir: PUBLIC, webpackOverride });
}

export type Studio = Awaited<ReturnType<typeof openStudio>>;

export async function openStudio() {
  await prepareShared();
  const serveUrl = await bundleSite();
  const browser = await openBrowser("chrome");

  async function composition(props: PostProps) {
    return selectComposition({ serveUrl, id: "Post", inputProps: props, puppeteerInstance: browser });
  }

  return {
    /** Les images demandées du script, en JPEG : leurs chemins, dans l'ordre. */
    async stills(script: PostScript, frames: number[], dir: string, name: string): Promise<string[]> {
      await mkdir(dir, { recursive: true });
      const props: PostProps = { ...script };
      const target = await composition(props);
      const paths: string[] = [];
      for (const frame of frames) {
        const output = join(dir, `${name}-${frame}.jpg`);
        await renderStill({
          serveUrl,
          composition: target,
          inputProps: props,
          frame: Math.min(Math.max(frame, 0), target.durationInFrames - 1),
          output,
          imageFormat: "jpeg",
          scale: STILL_SCALE,
          puppeteerInstance: browser,
        });
        paths.push(output);
      }
      return paths;
    },
    /** Une suite d'images du script, en JPEG, rendues d'un seul passage : leurs chemins, dans l'ordre. */
    async sequence(script: PostScript, frames: number[], scale: number, dir: string): Promise<string[]> {
      await rm(dir, { recursive: true, force: true });
      await mkdir(dir, { recursive: true });
      const props: PostProps = { ...script };
      const target = await composition(props);
      const wanted = [...new Set(frames.map((frame) => Math.min(Math.max(frame, 0), target.durationInFrames - 1)))].sort((a, b) => a - b);
      await renderFrames({
        serveUrl,
        composition: target,
        inputProps: props,
        frames: wanted,
        outputDir: dir,
        imageFormat: "jpeg",
        imageSequencePattern: "f-[frame].[ext]",
        scale,
        puppeteerInstance: browser,
        onStart: () => {},
        onFrameUpdate: () => {},
      });
      const files = await readdir(dir);
      const byFrame = new Map(files.map((file) => [Number(file.match(/\d+/)?.[0]), join(dir, file)]));
      return wanted.map((frame) => byFrame.get(frame)!);
    },
    async video(script: PostScript, output: string): Promise<void> {
      const props: PostProps = { ...script };
      await renderMedia({
        serveUrl,
        composition: await composition(props),
        inputProps: props,
        codec: "h264",
        outputLocation: output,
        puppeteerInstance: browser,
      });
    },
    close: () => browser.close({ silent: true }),
  };
}
