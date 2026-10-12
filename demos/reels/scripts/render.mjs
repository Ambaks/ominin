/*
 * Renders the Reels to out/<id>.mp4, then from each MP4: a contact sheet
 * (out/<id>-planche.png, six key frames) and, for review, one frame per
 * second on one sheet (out/review/<id>-chaque-seconde.png).
 * `node scripts/render.mjs [id…]`, every Reel by default.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia } from "@remotion/renderer";
import sharp from "sharp";
import { webpackOverride } from "../webpack.mjs";

const root = path.join(import.meta.dirname, "..");
const out = path.join(root, "out");
const ffmpeg = path.join(path.dirname(createRequire(import.meta.url).resolve("@remotion/compositor-win32-x64-msvc")), "ffmpeg.exe");

/** Contact sheets: frames in a grid, each with its time under it. */
const SHEET = { label: 56, gap: 12, background: "#1c1712", ink: "#f3ece1" };
const KEY_FRAMES = { scale: 1 / 3, columns: 3 };
const EVERY_SECOND = { scale: 1 / 5, columns: 10 };

mkdirSync(path.join(out, "review"), { recursive: true });
const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts"), webpackOverride });
/** `--sheets`: only redo the sheets from the MP4s already rendered. */
const sheetsOnly = process.argv.includes("--sheets");
const wanted = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const compositions = (await getCompositions(serveUrl)).filter(({ id }) => !wanted.length || wanted.includes(id));

/** Grabs the frames at `times` (seconds) from `file` into `dir`, scaled, and lays them out in a grid. */
const sheet = async (file, dir, times, { width, height }, { scale, columns }, target) => {
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const frames = times.map((t, i) => {
    const frame = path.join(dir, `${i}.png`);
    execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", "-ss", t.toFixed(2), "-i", file, "-frames:v", "1", "-vf", `scale=${w}:${h}`, frame]);
    return { t, frame };
  });
  const cell = { width: w + SHEET.gap, height: h + SHEET.label + SHEET.gap };
  const rows = Math.ceil(frames.length / columns);
  await sharp({ create: { width: cell.width * columns + SHEET.gap, height: cell.height * rows + SHEET.gap, channels: 3, background: SHEET.background } })
    .composite(
      frames.flatMap(({ t, frame }, i) => {
        const left = SHEET.gap + (i % columns) * cell.width;
        const top = SHEET.gap + Math.floor(i / columns) * cell.height;
        const label = `<svg width="${w}" height="${SHEET.label}"><text x="0" y="38" font-family="Arial" font-size="30" fill="${SHEET.ink}">${t.toFixed(1)} s</text></svg>`;
        return [
          { input: frame, left, top },
          { input: Buffer.from(label), left, top: top + h },
        ];
      }),
    )
    .png()
    .toFile(target);
};

for (const composition of compositions) {
  const { id, width, height, durationInFrames, fps } = composition;
  const file = path.join(out, `${id}.mp4`);
  if (!sheetsOnly) await renderMedia({ composition, serveUrl, codec: "h264", crf: 18, colorSpace: "bt709", chromiumOptions: { gl: "angle" }, outputLocation: file });
  const duration = durationInFrames / fps;

  const dir = mkdtempSync(path.join(os.tmpdir(), `${id}-`));
  const keyTimes = [0, 1.2, duration * 0.3, duration * 0.5, duration * 0.72, duration - 1];
  await sheet(file, dir, keyTimes, { width, height }, KEY_FRAMES, path.join(out, `${id}-planche.png`));
  const seconds = Array.from({ length: Math.ceil(duration) }, (_, t) => t);
  await sheet(file, dir, seconds, { width, height }, EVERY_SECOND, path.join(out, "review", `${id}-chaque-seconde.png`));
  rmSync(dir, { recursive: true, force: true });
  console.log(`${id}: ${duration.toFixed(1)} s`);
}
