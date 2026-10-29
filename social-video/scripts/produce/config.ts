/*
 * Le montage par agents (scripts/produce) : trois tours par scène, puis trois
 * par transition, arrêt anticipé dès la note visée. Les arbitres tournent sur
 * Sonnet, les monteurs qui réécrivent sur Opus ; PRODUCE_REVIEWER_MODEL et
 * PRODUCE_EDITOR_MODEL les changent le temps d'un essai.
 */
export const PRODUCE = {
  sceneRounds: 3,
  transitionRounds: 3,
  target: 9,
  reviewerModel: process.env.PRODUCE_REVIEWER_MODEL || "sonnet",
  editorModel: process.env.PRODUCE_EDITOR_MODEL || "opus",
};
