export const VOD_POLL_INTERVAL_MS = 5_000;

export const VOD_HISTORY_LIMIT = 10;

export const JOB_STATUS_LABELS = {
  en_attente: "En attente",
  en_cours: "Analyse en cours",
  termine: "Terminé",
  echec: "Échec",
} as const;

export const STAGE_ORDER = [
  "ingest",
  "transcribe",
  "sense",
  "fuse",
  "refine",
  "judge",
  "rank",
  "reformat",
  "package",
] as const;

export type PipelineStage = (typeof STAGE_ORDER)[number];

export const STAGE_LABELS: Record<PipelineStage, string> = {
  ingest: "Téléchargement de la vidéo",
  transcribe: "Transcription",
  sense: "Analyse des signaux",
  fuse: "Détection des moments forts",
  refine: "Affinage des découpes",
  judge: "Évaluation par l'IA",
  rank: "Classement",
  reformat: "Mise en forme 9:16",
  package: "Préparation des clips",
};
