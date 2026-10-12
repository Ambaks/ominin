import { useCurrentFrame } from "remotion";
import { om, T } from "../film";
import { Captions, Card, EndCard, Eyebrow, filmTime, Headline, Hot, Mark, Phone, Pop, Rise, s, SAFE, Stage, useAccent, usePhoneY } from "../kit";

/*
 * Ominin Collect, l'emporter : la page de commande à votre nom, le créneau
 * de retrait, payé avant d'arriver ; 0 € par mois, 5 % des commandes à
 * emporter payées en ligne (frontend/lib/landing-data.ts, collectOffer).
 */
const HOOK_END = s(2.4);
const SLOT = s(4.8);
const PAY = s(7.6);
const KITCHEN = s(9.9);
const END = s(12);
export const COLLECT_EMPORTER_DURATION = s(16);

/* The order sheet only opens once the slot is chosen: the film holds on the menu until then. */
const film = filmTime([
  [0, T.MENU + 10],
  [HOOK_END, T.MENU + 20],
  [s(3.4), T.TAPS[0] + 4],
  [s(4.2), T.TAPS[1] + 10],
  [PAY - 4, T.TAPS[1] + 12],
  [PAY + 4, T.TAPS[2] + 4],
  [PAY + 30, T.TAPS[3]],
  [KITCHEN - 6, T.PAID + 4],
  [END, T.PRINT + 30],
]);

/* Later than the phone's clock (12:44), in the landing's 15-minute slots. */
const SLOTS = ["13:00", "13:15", "13:30", "13:45"];
const PICKED = 0;

const SlotPicker = () => {
  const frame = useCurrentFrame();
  const accent = useAccent();
  const picked = frame >= SLOT + 22;
  return (
    <Card style={{ padding: "44px 48px", boxShadow: "0 30px 80px rgb(0 0 0 / 0.6)" }}>
      <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: om.muted }}>Retrait aujourd’hui</div>
      <div style={{ marginTop: 30, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
        {SLOTS.map((slot, i) => {
          const on = picked && i === PICKED;
          return (
            <div
              key={slot}
              style={{
                padding: "28px 0",
                borderRadius: 26,
                textAlign: "center",
                fontSize: 68,
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
  const y = usePhoneY(HOOK_END - 6);
  return (
    <Stage brand="collect">
      <Eyebrow label="Ominin Collect · À emporter" until={END - 6} />
      <Headline lines={["Zéro", "commande", <Mark at={6}>fantôme.</Mark>]} at={-30} until={HOOK_END} size={150} top={SAFE.top + 110} />
      <Rise at={-30} until={HOOK_END} style={{ position: "absolute", top: SAFE.top + 580, left: SAFE.x, right: SAFE.x, fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>
        Vos clients <Hot>paient avant d’arriver.</Hot>
      </Rise>
      <Captions
        top={SAFE.top + 110}
        lines={[
          { at: HOOK_END + 2, until: SLOT - 6, text: <>Ils commandent sur <Hot>votre page, à votre nom.</Hot></> },
          { at: SLOT, until: PAY - 6, text: <>Ils choisissent <Hot>l’heure de retrait.</Hot></> },
          { at: PAY, until: KITCHEN - 6, text: <>Ils paient en ligne, <Hot>avant de venir.</Hot></> },
          { at: KITCHEN, until: END - 6, text: "La cuisine ne lance que ce qui est payé." },
        ]}
      />
      {frame < END && <Phone map={film} at={-60} place={{ y }} />}
      <Pop at={SLOT + 4} until={PAY - 6} style={{ position: "absolute", top: 600, left: SAFE.x, right: SAFE.x }}>
        <SlotPicker />
      </Pop>
      <EndCard at={END} line="Fini les commandes jamais récupérées." sub="0 €/mois · 5 % des commandes à emporter payées en ligne, + frais de carte · sans engagement" />
    </Stage>
  );
};
