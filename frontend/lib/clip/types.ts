import type { Database, Tables } from "@/lib/supabase/database.types";
import type {
  CaptionSet,
  ClipPlatform,
  ConnectedAccount,
  PlatformResult,
} from "./provider/types";

export type ClipPostStatus = Database["public"]["Enums"]["clip_post_status"];

export interface ClipPost {
  id: string;
  title: string;
  captions: CaptionSet;
  platforms: ClipPlatform[];
  status: ClipPostStatus;
  storagePath: string | null;
  results: PlatformResult[];
  attempt: number;
  createdAt: string;
  publishedAt: string | null;
}

export function rowToClipPost(row: Tables<"clip_posts">): ClipPost {
  return {
    id: row.id,
    title: row.title,
    captions: (row.captions ?? {}) as CaptionSet,
    platforms: row.platforms as ClipPlatform[],
    status: row.status,
    storagePath: row.storage_path,
    results: (row.results ?? []) as unknown as PlatformResult[],
    attempt: row.attempt,
    createdAt: row.created_at,
    publishedAt: row.published_at,
  };
}

export interface ClipState {
  email: string;
  accounts: ConnectedAccount[];
  posts: ClipPost[];
}
