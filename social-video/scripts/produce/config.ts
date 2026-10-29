/*
 * Le montage par agents (scripts/produce) : trois tours par scène, puis trois
 * par transition, arrêt anticipé dès la note visée. Les
 * arbitres tournent sur Sonnet, les monteurs qui réécrivent sur Opus.
 */
export const PRODUCE = {
  sceneRounds: 3,
  transitionRounds: 3,
  target: 9,
  reviewerModel: "sonnet",
  editorModel: "opus",
};
