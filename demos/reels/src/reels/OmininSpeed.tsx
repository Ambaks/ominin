import { interpolate, useCurrentFrame } from "remotion";
import { Check, clamp, om } from "../film";
import { Captions, Card, DISPLAY, EndCard, Eyebrow, Figure, Headline, Hot, Mark, Rise, s, SAFE, Stage, useAccent } from "../kit";

/*
 * Le rapport public ominin.com/r7k2 : de la commande au ticket cuisine,
 * 18 s en médiane payée en ligne, 4 min 39 payée au comptoir
 * (frontend/lib/report/data.json, speed). A ouvre sur le comptoir, B sur 18 s.
 */
const ONLINE = 18;
const COUNTER = 4 * 60 + 39;

const HOOKS = {
  A: { figure: "4 min 39", size: 196, sub: "pour qu’une commande payée au comptoir arrive en cuisine." },
  B: { figure: "18 s", size: 330, sub: "pour qu’une commande payée depuis la table arrive en cuisine." },
};

const HOOK_END = s(2.6);
const RACE = s(2.8);
/** The race replays the medians fast: the first 18 s over 2 s, the rest of the counter's wait over 4.5 s. */
const clock = (frame: number) => interpolate(frame, [RACE + 12, RACE + 72, RACE + 207], [0, ONLINE, COUNTER], clamp);
const ONLINE_DONE = RACE + 72;
const COUNTER_DONE = RACE + 207;
const END = s(13.8);
export const OMININ_SPEED_DURATION = s(17);

const time = (seconds: number) => {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

const Lane = ({ label, target, value }: { label: string; target: number; value: string }) => {
  const frame = useCurrentFrame();
  const accent = useAccent();
  const elapsed = clock(frame);
  const done = elapsed >= target;
  return (
    <div style={{ marginTop: 44 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 46, fontWeight: 700 }}>
        <span>{label}</span>
        {done && (
          <span style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: DISPLAY, fontWeight: 800, fontSize: 58 }}>
            <Check size={48} color={om.ready} />
            {value}
          </span>
        )}
      </div>
      <div style={{ marginTop: 18, height: 30, borderRadius: 15, background: om.raised, overflow: "hidden" }}>
        <div style={{ width: `${Math.min(1, elapsed / target) * 100}%`, height: "100%", borderRadius: 15, background: done ? accent : om.muted }} />
      </div>
    </div>
  );
};

export const OmininSpeed = ({ hook }: { hook: keyof typeof HOOKS }) => {
  const frame = useCurrentFrame();
  const { figure, size, sub } = HOOKS[hook];
  return (
    <Stage brand="ominin">
      <Eyebrow label="Données réelles · ominin.com/r7k2" until={END - 6} />
      <Headline lines={[<Mark at={6}>{figure}</Mark>]} at={-30} until={HOOK_END} size={size} top={520} />
      <Rise at={-30} until={HOOK_END} style={{ position: "absolute", top: 560 + size * 1.05, left: SAFE.x, right: SAFE.x, fontSize: 72, fontWeight: 700, lineHeight: 1.1, textWrap: "balance" }}>
        {sub}
      </Rise>
      <Captions
        top={SAFE.top + 110}
        lines={[
          { at: RACE, until: ONLINE_DONE + 26, text: <>Payée depuis la table : en cuisine en <Hot>18 s.</Hot></> },
          { at: ONLINE_DONE + 30, until: COUNTER_DONE + 10, text: <>Payée au comptoir : <Hot>4 min 39.</Hot></> },
          { at: COUNTER_DONE + 14, until: END - 6, text: <>L’écart, c’est <Hot>la file pour payer.</Hot></> },
        ]}
      />
      <Rise at={RACE + 4} until={END - 6} style={{ position: "absolute", top: 620, left: SAFE.x, right: SAFE.x }}>
        <Card style={{ padding: "44px 48px 52px" }}>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: om.muted }}>Commande → ticket cuisine</div>
          <Figure size={170} style={{ marginTop: 18, fontVariantNumeric: "tabular-nums" }}>
            {time(clock(frame))}
          </Figure>
          <Lane label="Payée en ligne" target={ONLINE} value="18 s" />
          <Lane label="Payée au comptoir" target={COUNTER} value="4 min 39" />
        </Card>
        <div style={{ marginTop: 28, fontSize: 32, fontWeight: 500, lineHeight: 1.3, color: om.muted }}>
          Médianes d’un bar-restaurant toulousain, 18 sept. – 3 oct. 2026, rejouées en accéléré.
        </div>
      </Rise>
      <EndCard at={END} line="Commande et paiement depuis la table." />
    </Stage>
  );
};
