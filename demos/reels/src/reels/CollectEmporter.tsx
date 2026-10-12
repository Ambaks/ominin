import { useCurrentFrame } from "remotion";
import { om, T } from "../film";
import { Captions, Card, EndCard, Eyebrow, Figure, filmTime, Headline, Hot, Mark, Phone, Pop, s, SAFE, Stage, useAccent } from "../kit";

/*
 * Ominin Collect, l'emporter : la page de commande à votre nom, le créneau
 * de retrait, payé avant d'arriver ; 0 € par mois, 5 % des commandes à
 * emporter payées en ligne (frontend/lib/landing-data.ts, collectOffer).
 */
const HOOK_END = s(2.4);
const PHONE_IN = s(2.1);
const SLOT = s(5.4);
const PAY = s(8.4);
const PRICE = s(11.4);
const END = s(14.6);
export const COLLECT_EMPORTER_DURATION = s(18);

const film = filmTime([
  [PHONE_IN, T.MENU + 10],
  [s(3.8), T.TAPS[0] + 4],
  [SLOT - 10, T.TAPS[1] + 10],
  [PAY, T.TAPS[2] + 6],
  [PAY + 30, T.TAPS[3]],
  [PAY + 48, T.PAID + 6],
  [PRICE, T.PAID + 40],
]);

const SLOTS = ["12:15", "12:30", "12:45", "13:00"];
const PICKED = 1;

const SlotPicker = () => {
  const frame = useCurrentFrame();
  const accent = useAccent();
  const picked = frame >= SLOT + 22;
  return (
    <Card style={{ padding: "44px 48px" }}>
      <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: om.muted }}>Retrait aujourd’hui</div>
      <div style={{ marginTop: 30, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
        {SLOTS.map((slot, i) => {
          const on = picked && i === PICKED;
          return (
            <div
              key={slot}
              style={{
                padding: "26px 0",
                borderRadius: 26,
                textAlign: "center",
                fontSize: 64,
                fontWeight: 700,
                background: on ? accent : om.raised,
                color: on ? om.ink : om.cream,
                border: `2px solid ${on ? "transparent" : om.line}`,
                transform: on ? `scale(${1 + 0.05 * Math.max(0, 1 - (frame - SLOT - 22) / 8)})` : undefined,
              }}
            >
              {slot}
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export const CollectEmporter = () => {
  const frame = useCurrentFrame();
  return (
    <Stage brand="collect">
      <Eyebrow label="Ominin Collect · À emporter" until={END - 6} />
      <Headline lines={["À emporter.", <><Mark at={6}>Payé</Mark> avant</>, "d’arriver."]} at={-30} until={HOOK_END} size={160} top={560} />
      <Captions
        top={SAFE.top + 110}
        lines={[
          { at: HOOK_END + 2, until: SLOT - 6, text: <>Vos clients commandent sur <Hot>votre page, à votre nom.</Hot></> },
          { at: SLOT, until: PAY - 6, text: <>Ils choisissent <Hot>l’heure de retrait.</Hot></> },
          { at: PAY, until: PRICE - 6, text: <>Ils paient en ligne. <Hot>La cuisine ne lance que ce qui est payé.</Hot></> },
          { at: PRICE, until: END - 6, text: "Pas d’abonnement. Une commission, c’est tout." },
        ]}
      />
      {frame < PRICE && <Phone map={film} at={PHONE_IN} place={{ y: 420 }} />}
      <Pop at={SLOT + 4} until={PAY - 6} style={{ position: "absolute", top: 640, left: SAFE.x, right: SAFE.x }}>
        <SlotPicker />
      </Pop>
      <Pop at={PRICE + 4} until={END - 6} style={{ position: "absolute", top: 600, left: SAFE.x, right: SAFE.x }}>
        <Card style={{ padding: "56px 56px 60px" }}>
          <Figure size={300}>
            <Hot>5&#8239;%</Hot>
          </Figure>
          <div style={{ marginTop: 24, fontSize: 60, fontWeight: 700, lineHeight: 1.1 }}>des commandes à emporter payées en ligne</div>
          <div style={{ marginTop: 36, fontSize: 52, fontWeight: 600, color: om.muted }}>+ frais de carte. 0 € par mois, sans engagement.</div>
        </Card>
      </Pop>
      <EndCard at={END} line="Le click & collect à votre nom." />
    </Stage>
  );
};
