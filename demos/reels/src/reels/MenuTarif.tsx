import { useCurrentFrame } from "remotion";
import { om, T } from "../film";
import { Cachet, Captions, Card, EndCard, Eyebrow, Figure, filmTime, Headline, Hot, Mark, Phone, Pop, Rise, s, SAFE, Stage, usePhoneY } from "../kit";

/*
 * Ominin Menu, le tarif : Connect à 0 € par mois, 3 % des commandes payées
 * en ligne (+ frais de carte), le Cachet à votre logo à 1,50 € par table,
 * une fois (frontend/lib/landing-data.ts).
 */
const HOOK_END = s(2.4);
const RATE = s(4.3);
const CACHET = s(7.3);
const END = s(10.2);
export const MENU_TARIF_DURATION = s(14.2);

const film = filmTime([
  [0, T.MENU + 10],
  [HOOK_END, T.MENU + 20],
  [s(3), T.TAPS[0] + 4],
  [s(3.5), T.TAPS[1] + 4],
  [RATE, T.TAPS[1] + 20],
]);

const block = { position: "absolute", top: 620, left: SAFE.x, right: SAFE.x } as const;
const lead = { marginTop: 24, fontSize: 64, fontWeight: 700, lineHeight: 1.1 } as const;
const note = { marginTop: 30, fontSize: 52, fontWeight: 600, lineHeight: 1.2, color: om.cream, opacity: 0.75 } as const;

export const MenuTarif = () => {
  const frame = useCurrentFrame();
  const y = usePhoneY(HOOK_END - 6);
  return (
    <Stage brand="menu">
      <Eyebrow label="Ominin Menu · Tarif" until={END - 6} />
      <Headline lines={["Le menu QR", <Mark at={6}>0 € par mois.</Mark>]} at={-30} until={HOOK_END} size={150} top={SAFE.top + 110} />
      <Rise at={-30} until={HOOK_END} style={{ position: "absolute", top: SAFE.top + 440, left: SAFE.x, right: SAFE.x, fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>
        3 % seulement sur ce qui est <Hot>payé en ligne.</Hot>
      </Rise>
      <Captions
        top={SAFE.top + 110}
        lines={[
          { at: HOOK_END + 2, until: RATE - 6, text: <>Vos clients commandent et <Hot>paient depuis la table.</Hot></> },
          { at: RATE, until: CACHET - 6, text: "Pas d’abonnement : une commission sur les paiements en ligne." },
          { at: CACHET, until: END - 6, text: <>Le QR de table, <Hot>à votre logo.</Hot></> },
        ]}
      />
      {frame < RATE + 20 && <Phone map={film} at={-60} place={{ y: frame < RATE - 4 ? y : y + (frame - RATE + 4) * 70 }} />}
      <Pop at={RATE + 4} until={CACHET - 6} style={block}>
        <Card style={{ padding: "56px 56px 60px" }}>
          <Figure size={300}>
            <Hot>3 %</Hot>
          </Figure>
          <div style={lead}>des commandes payées en ligne</div>
          <div style={note}>+ frais de carte · 0 € d’abonnement</div>
        </Card>
      </Pop>
      <Pop at={CACHET + 4} until={END - 6} style={block}>
        <Card style={{ padding: "52px 52px 56px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
            <Cachet />
            <div>
              <Figure size={140}>
                <Hot>1,50 €</Hot>
              </Figure>
              <div style={lead}>par table, une fois.</div>
            </div>
          </div>
        </Card>
      </Pop>
      <EndCard at={END} line="0 € par mois. 3 % en ligne." sub="+ frais de carte · QR à votre logo : 1,50 € par table, une fois" />
    </Stage>
  );
};
