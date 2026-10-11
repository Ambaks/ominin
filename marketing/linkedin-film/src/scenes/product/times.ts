import { beat } from "../../timeline";

// The product chapters, beat by beat: order (01), AI estimate (02), loyalty (03).
// Each step holds long enough to be read: a beat or more per tap, input and caption.
export const START = beat(8);
export const SCAN = beat(10);
export const MENU = SCAN + 6;
/** Smash +, fries +, the cart bar, « Payer ». */
export const TAPS = [beat(14), beat(16.5), beat(17.5), beat(19)];
export const SHEET = TAPS[2] + 3;
export const PAID = beat(20);
export const PRINT = beat(24);
export const PROOF = beat(27.5);

export const AI = beat(35);
export const INPUTS = [36, 37, 38, 39].map(beat);
export const ESTIMATE = beat(40.5);
/** One minute every three quarters of a beat, 12:46 → 12:52. */
export const LAPSE = [43, 43.75, 44.5, 45.25, 46, 46.75, 47.5].map(beat);
export const READY = beat(48.5);
/** The phone steps back after « C’est prêt ! »; the on-time check follows. */
export const MATCH = beat(52.5);
/** The phone comes close on the estimate once the panel has shown it. */
export const HERO_ETA = beat(42.5);

export const LOYALTY = beat(57.5);
export const POINTS = beat(58);
export const REGULARS = beat(62.5);
export const RETURN = beat(66.5);
export const BACK = beat(71.5);
/** The chapter's payoff: Inès's loyalty card, full width. */
export const RETENTION = beat(76.5);
export const END = beat(84);

export const ORDER_MINUTE = 45;
export const READY_MINUTE = ORDER_MINUTE + LAPSE.length;
