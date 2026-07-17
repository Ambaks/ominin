import type { Tables } from "@/lib/supabase/database.types";

export type ClipperJobStatus =
  | "en_attente"
  | "en_cours"
  | "termine"
  | "echec";

export interface ClipperJob {
  id: string;
  sourceUrl: string;
  sourceTitle: string | null;
  sourceDurationS: number | null;
  status: ClipperJobStatus;
  currentStage: string | null;
  stageProgress: number;
  errorMessage: string | null;
  clipCount: number;
  createdAt: string;
  completedAt: string | null;
}

export interface ClipperClip {
  id: string;
  jobId: string;
  rank: number;
  title: string;
  titleAlternatives: string[];
  clipType: string | null;
  sourceStartS: number;
  sourceEndS: number;
  durationS: number;
  storagePath: string | null;
  thumbnailPath: string | null;
  judgeScores: Record<string, number> | null;
  judgeReasoning: string | null;
  signalSummary: Record<string, number> | null;
  riskFlags: string[];
  approved: boolean | null;
}

export function rowToJob(row: Tables<"clipper_jobs">): ClipperJob {
  return {
    id: row.id,
    sourceUrl: row.source_url,
    sourceTitle: row.source_title,
    sourceDurationS: row.source_duration_s,
    status: row.status as ClipperJobStatus,
    currentStage: row.current_stage,
    stageProgress: row.stage_progress,
    errorMessage: row.error_message,
    clipCount: row.clip_count,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

export function rowToClip(row: Tables<"clipper_clips">): ClipperClip {
  return {
    id: row.id,
    jobId: row.job_id,
    rank: row.rank,
    title: row.title,
    titleAlternatives: row.title_alternatives ?? [],
    clipType: row.clip_type,
    sourceStartS: row.source_start_s,
    sourceEndS: row.source_end_s,
    durationS: row.duration_s,
    storagePath: row.storage_path,
    thumbnailPath: row.thumbnail_path,
    judgeScores: row.judge_scores as Record<string, number> | null,
    judgeReasoning: row.judge_reasoning,
    signalSummary: row.signal_summary as Record<string, number> | null,
    riskFlags: row.risk_flags ?? [],
    approved: row.approved,
  };
}
