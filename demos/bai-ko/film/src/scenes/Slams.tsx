import type { ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { bk } from "../brand/tokens";
import { Stage } from "../kit/atmosphere";
import { useLayout } from "../kit/layout";
import { springs } from "../kit/motion";
import { beat } from "../timeline";
import { SLOGAN } from "./Slogan";
import { Chip, CLAIM, statement } from "./styles";

/**
 * Scene 14: the offer in three claims, one per slam, each with its terms
 * under it. The slams fall on the groove's bar downbeats (beats 68, 72 and
 * 76 land on the track's strongest onsets of the passage); the last holds
 * through the music's break, into the slogan.
 */
export const SLAMS = [beat(68), beat(72), beat(76)];

/**
 * The offer as the deck makes it, copied (the film is its own project and
 * cannot import the app's modules): the commission at the table and its
 * floor (frontend/lib/pitch/kit.ts, offer.commissionPercent), the takeaway
 * rate (frontend/lib/landing-data.ts, collectOffer.commission.percent), and
 * what starting costs, paid once (landing-data.ts, starterKit): a Cachet
 * per table and its delivery (« Cachets à votre logo : 1,50 € par table +
 * 20 € de livraison, une fois »), and the « Boîtier Omilink » for a till
 * that does not print in the kitchen (« 89 €, une fois »), named here for
 * what it does.
 */
const OFFER = { percent: { table: 3, floor: 1, takeaway: 5 }, cachet: 1.5, shipping: 20, omilink: 89 };
const euros = (amount: number) =>
  `${amount.toLocaleString("fr-FR", { minimumFractionDigits: Number.isInteger(amount) ? 0 : 2 })}\u00a0€`;
const percent = (value: number) => `${value}\u00a0%`;

/** Frames after the slam its terms rise in, together: read with the claim for as long as it holds. */
const TERMS_DELAY = 3;
/** A lead line over a claim, in em of the claim: it sets the claim up without competing with it. */
const LEAD = 0.6;
/** In the tall frame a term wraps onto a second line past this width, in px: clear of the edges, the drift included. */
const TALL_TERM_WIDTH = 900;
/** How much closer each claim comes over its slam. */
const DRIFT = 0.03;
const SETTLE = { from: 1.06, frames: 4 };
/** Where the claims' last line sits, and the line their terms center on, in px from the top. */
const GRID = { landscape: { claimBottom: 640, terms: 780 }, portrait: { claimBottom: 1000, terms: 1180 } };

const Claim = ({ children, terms, tone }: { children: ReactNode; terms: string[]; tone: string }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { height, portrait, pick } = useLayout();
  const settle = interpolate(frame, [0, SETTLE.frames], [SETTLE.from, 1], { easing: Easing.out(Easing.cubic), extrapolateRight: "clamp" });
  const rise = spring({ frame: frame - TERMS_DELAY, fps, config: springs.snappy });
  const grid = pick(GRID.landscape, GRID.portrait);
  const size = pick(30, 32);
  return (
    <Stage>
      <AbsoluteFill style={{ scale: String(1 + (DRIFT * frame) / durationInFrames) }}>
        <div
          style={{
            position: "absolute",
            left: 80,
            right: 80,
            bottom: height - grid.claimBottom,
            ...statement,
            fontSize: pick(CLAIM.landscape, CLAIM.portrait),
            lineHeight: 0.92,
            textAlign: "center",
            scale: String(settle),
          }}
        >
          {children}
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: grid.terms, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          {terms.map((term) => (
            <div key={term} style={{ translate: `0 ${(1 - rise) * 30}px`, opacity: rise }}>
              <Chip
                tone={tone}
                size={size}
                style={portrait ? { whiteSpace: "normal", textWrap: "balance", textAlign: "center", boxSizing: "border-box", maxWidth: TALL_TERM_WIDTH, borderRadius: size * 1.2 } : undefined}
              >
                {term}
              </Chip>
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </Stage>
  );
};

export const Slams = ({ from }: { from: number }) => {
  const { portrait } = useLayout();
  const at = (abs: number) => abs - from;
  // In the tall frame each claim (and lead) breaks at its own pause, never inside a phrase.
  const breakAt = portrait ? <br /> : " ";
  const accent = (words: string) => <span style={{ color: bk.pink }}>{words}</span>;
  // The terms split across the claims, two each, so each slam reads in one viewing.
  const claims = [
    {
      body: <>{accent(euros(0))}{breakAt}d’abonnement.</>,
      tone: bk.cyan,
      terms: ["Sans engagement", "Frais de carte en sus"],
    },
    {
      body: <>{accent(percent(OFFER.percent.table))} des commandes<br />payées à table.</>,
      tone: bk.gold,
      terms: [`Dégressif jusqu’à ${percent(OFFER.percent.floor)}`, `À emporter\u00a0: ${percent(OFFER.percent.takeaway)}`],
    },
    {
      // Paid once, to start — after « 0 € d'abonnement » it must never read as a fee per table and month.
      body: (
        <>
          <div style={{ fontSize: `${LEAD}em` }}>
            Pour démarrer&nbsp;:{breakAt}votre Cachet,
          </div>
          {accent(euros(OFFER.cachet))} par table,
          <br />
          une fois.
        </>
      ),
      tone: bk.pink,
      terms: [`+ ${euros(OFFER.shipping)} de livraison`, `Boîtier d’impression ${euros(OFFER.omilink)}, une fois, si votre caisse n’imprime pas en cuisine`],
    },
  ];
  return (
    <AbsoluteFill>
      {claims.map((claim, i) => (
        <Sequence key={i} from={at(SLAMS[i])} durationInFrames={(SLAMS[i + 1] ?? SLOGAN) - SLAMS[i]}>
          <Claim terms={claim.terms} tone={claim.tone}>
            {claim.body}
          </Claim>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
