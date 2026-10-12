import { interpolate, useCurrentFrame } from "remotion";
import { Check, clamp, om } from "../film";
import { Captions, Card, DISPLAY, EndCard, Eyebrow, Figure, Headline, Hot, Mark, Rise, s, SAFE, Stage, useAccent } from "../kit";

/*
 * Le rapport public ominin.com/r7k2 : de la commande au ticket cuisine,
 * 18 s en médiane payée en ligne, 4 min 39 payée au comptoir
 * (frontend/lib/report/data.json, speed). Accroche issue du test A/B : les
 * deux chiffres ensemble.
 */
const ONLINE = 18;
const COUNTER = 4 * 60 + 39;

const HOOK_END = s(2.3);
/** The race replays the medians fast: the first 18 s over 2 s, the rest of the counter's wait over 4 s. */
const ONLINE_DONE = HOOK_END + s(2);
const COUNTER_DONE = ONLINE_DONE + s(4);
const clock = (frame: number) => interpolate(frame, [HOOK_END, ONLINE_DONE, COUNTER_DONE], [0, ONLINE, COUNTER], clamp);
const END = COUNTER_DONE + s(2.4);
export const OMININ_SPEED_DURATION = END + s(4);

const time = (seconds: number) => {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

/** One payment's lane, on the counter's scale: 18 s fills 6 % of it. */
const Lane = ({ label, target, value }: { label: string; target: number; value: string }) => {
  const frame = useCurrentFrame();
  const accent = useAccent();
  const elapsed = Math.min(clock(frame), target);
  const done = clock(frame) >= target;
  return (
    <div style={{ marginTop: 48 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 50, fontWeight: 700 }}>
        <span>{label}</span>
        {done && (
          <span style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: DISPLAY, fontWeight: 800, fontSize: 64 }}>
            <Check size={52} color={om.ready} />
            {value}
          </span>
        )}
      </div>
      <div style={{ marginTop: 18, height: 36, borderRadius: 18, background: om.raised, overflow: "hidden" }}>
        <div style={{ width: `${(elapsed / COUNTER) * 100}%`, minWidth: elapsed > 0 ? 36 : 0, height: "100%", borderRadius: 18, background: done ? accent : om.muted }} />
      </div>
    </div>
  );
};

export const OmininSpeed = () => {
  const frame = useCurrentFrame();
  return (
    <Stage brand="ominin">
      <Eyebrow label="Données réelles" until={END - 6} />
      <Headline lines={[<><Mark at={6}>18 s</Mark> au lieu</>, "de 4 min 39."]} at={-30} until={HOOK_END} size={124} top={SAFE.top + 110} />
      <Captions
        top={SAFE.top + 110}
        lines={[
          { at: HOOK_END + 4, until: ONLINE_DONE + 20, text: <>Payée depuis la table : en cuisine en <Hot>18 s.</Hot></> },
          { at: ONLINE_DONE + 24, until: COUNTER_DONE + 6, text: <>Payée au comptoir : <Hot>4 min 39.</Hot></> },
          { at: COUNTER_DONE + 10, until: END - 6, text: <>L’écart : <Hot>se déplacer, faire la queue, payer.</Hot></> },
        ]}
      />
      <Rise at={-30} until={END - 6} style={{ position: "absolute", top: 660, left: SAFE.x, right: SAFE.x }}>
        <Card style={{ padding: "44px 48px 56px" }}>
          <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: om.muted }}>Commande → ticket cuisine</div>
          <Figure size={200} style={{ marginTop: 18, fontVariantNumeric: "tabular-nums" }}>
            {time(clock(frame))}
          </Figure>
          <Lane label="Payée en ligne" target={ONLINE} value="18 s" />
          <Lane label="Payée au comptoir" target={COUNTER} value="4 min 39" />
        </Card>
        <div style={{ marginTop: 26, fontSize: 38, fontWeight: 600, lineHeight: 1.25, color: om.cream, opacity: 0.8 }}>
          Médianes d’un bar-restaurant toulousain, rejouées en accéléré. Source : ominin.com/r7k2
        </div>
      </Rise>
      <EndCard at={END} line="Vos clients paient depuis la table." sub="Ominin Menu · 0 €/mois · 3 % des paiements en ligne + frais de carte" />
    </Stage>
  );
};
