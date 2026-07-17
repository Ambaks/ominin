import { createClient } from "@/lib/supabase/client";
import { fetchApi } from "../store";
import { VOD_HISTORY_LIMIT } from "./constants";
import { rowToJob, type ClipperClip, type ClipperJob } from "./types";

export async function fetchRecentJobs(): Promise<ClipperJob[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("clipper_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(VOD_HISTORY_LIMIT);
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToJob);
}

export async function createVodJob(url: string): Promise<ClipperJob> {
  return fetchApi<ClipperJob>("/api/clip/vod/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
}

export async function reviewClip(
  clipId: string,
  approved: boolean
): Promise<void> {
  await fetchApi("/api/clip/vod/clips/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clipId, approved }),
  });
}

export async function fetchJobClips(
  jobId: string
): Promise<{ clips: ClipperClip[]; playbackUrls: Record<string, string> }> {
  return fetchApi(`/api/clip/vod/jobs/${jobId}/clips`);
}

export async function preparePublish(
  clipId: string
): Promise<{ storagePath: string }> {
  return fetchApi("/api/clip/vod/prepare-publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clipId }),
  });
}
