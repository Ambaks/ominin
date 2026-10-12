/*
 * The film's sound, mastered in place after each render: brought to the
 * web's loudness (MASTER.lufs, integrated) through a limiter run on a 4×
 * oversampled signal, so the peaks between samples stay under the ceiling
 * too (MASTER.ceiling, dBFS) — with room for the web encode’s 128 kb/s AAC,
 * which lifts them by up to two dB. The picture is copied as rendered.
 *   node scripts/master.mjs out/film-16x9-1080p.mp4 [out/film-9x16.mp4]
 */
import { spawnSync } from "node:child_process";
import { renameSync } from "node:fs";

const MASTER = { lufs: -14.8, ceiling: -2.8, oversample: 4, rate: 48_000 };

/** Integrated loudness (LUFS) and true peak (dBTP) of a file's sound, as ffmpeg's EBU R128 meter reads them. */
const measure = (file) => {
  const { stderr } = spawnSync("ffmpeg", ["-nostats", "-i", file, "-map", "0:a", "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" });
  const summary = stderr.slice(stderr.lastIndexOf("Summary:"));
  const value = (label) => Number(summary.match(new RegExp(`${label}:\\s+(-?[\\d.]+)`))[1]);
  return { lufs: value("I"), peak: value("Peak") };
};

const master = (source, target, gain) => {
  const limit = 10 ** (MASTER.ceiling / 20);
  const chain = [
    `volume=${gain.toFixed(2)}dB`,
    `aresample=${MASTER.rate * MASTER.oversample}`,
    `alimiter=limit=${limit.toFixed(4)}:attack=1:release=60:level=disabled`,
    `aresample=${MASTER.rate}`,
  ].join(",");
  const run = spawnSync("ffmpeg", ["-loglevel", "error", "-y", "-i", source, "-c:v", "copy", "-af", chain, "-c:a", "aac", "-b:a", "320k", target]);
  if (run.status !== 0) throw new Error(run.stderr.toString());
  return measure(target);
};

for (const file of process.argv.slice(2)) {
  const raw = measure(file);
  const target = file.replace(/\.mp4$/, ".mastered.mp4");
  // The limiter takes a little loudness off the top: a second pass makes up for it.
  let gain = MASTER.lufs - raw.lufs;
  let result = master(file, target, gain);
  gain += MASTER.lufs - result.lufs;
  result = master(file, target, gain);
  renameSync(target, file);
  console.log(`${file}: ${raw.lufs} LUFS, ${raw.peak} dBTP → +${gain.toFixed(2)} dB → ${result.lufs} LUFS, ${result.peak} dBTP`);
}
