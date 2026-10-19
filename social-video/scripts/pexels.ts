import { required } from "./env.ts";

/*
 * Vidéos libres de droits des scènes « stock » : de vraies personnes (une
 * salle pleine, un client qui paie au téléphone…) pour donner des visages
 * aux Reels. Pexels : usage commercial gratuit, sans attribution.
 */

interface PexelsVideo {
  id: number;
  duration: number;
  video_files: { link: string; width: number; height: number; file_type: string }[];
}

/* Assez net pour 1080 × 1920 sans tirer un fichier 4K à chaque scène. */
const MIN_HEIGHT = 1280;
const MAX_HEIGHT = 1920;
const RESULTS = 15;

/** Une vidéo verticale qui dure au moins la scène, jamais deux fois la même
 * dans un Reel (used). Rend l'URL du MP4. */
export async function findVideo(query: string, seconds: number, used: Set<number>): Promise<string> {
  const url = new URL("https://api.pexels.com/videos/search");
  url.search = new URLSearchParams({
    query,
    orientation: "portrait",
    per_page: String(RESULTS),
  }).toString();
  const response = await fetch(url, { headers: { Authorization: required("PEXELS_API_KEY") } });
  if (!response.ok) throw new Error(`Pexels « ${query} » : ${response.status}`);
  const { videos } = (await response.json()) as { videos: PexelsVideo[] };

  for (const video of videos) {
    if (used.has(video.id) || video.duration < seconds) continue;
    const file = video.video_files
      .filter((f) => f.file_type === "video/mp4" && f.height > f.width)
      .filter((f) => f.height >= MIN_HEIGHT && f.height <= MAX_HEIGHT)
      .sort((a, b) => b.height - a.height)[0];
    if (file) {
      used.add(video.id);
      return file.link;
    }
  }
  throw new Error(`Pexels « ${query} » : aucune vidéo verticale assez longue`);
}
