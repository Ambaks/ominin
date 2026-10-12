import { useCurrentFrame } from "remotion";
import { om, Qr, T } from "../film";
import { Captions, Card, EndCard, Eyebrow, Figure, filmTime, Headline, Hot, Mark, Phone, Pop, s, SAFE, Stage } from "../kit";

/*
 * Ominin Menu, le tarif : Connect à 0 € par mois, 3 % des commandes payées
 * en ligne (+ frais de carte), le Cachet à 1,50 € par table, une fois
 * (frontend/lib/landing-data.ts).
 */
const HOOK_END = s(2.4);
const PHONE_IN = s(2.1);
const PHONE_OUT = s(6.4);
const RATE = s(6.6);
const CACHET = s(10);
const END = s(13.4);
export const MENU_TARIF_DURATION = s(16.5);

const film = filmTime([
  [PHONE_IN, T.MENU + 10],
  [s(3.6), T.TAPS[0] + 4],
  [s(4.4), T.TAPS[1] + 4],
  [s(5.2), T.TAPS[3]],
  [PHONE_OUT, T.PAID + 20],
]);

const figureBlock = { position: "absolute", top: 620, left: SAFE.x, right: SAFE.x } as const;
const note = { marginTop: 36, fontSize: 52, fontWeight: 600, lineHeight: 1.2, color: om.muted, textWrap: "balance" } as const;

export const MenuTarif = () => {
  const frame = useCurrentFrame();
  return (
    <Stage brand="menu">
      <Eyebrow label="Ominin Menu · Tarif" until={END - 6} />
      <Headline lines={["Le menu QR", "qui encaisse :", <Mark at={6}>0 € par mois.</Mark>]} at={-30} until={HOOK_END} size={140} top={560} />
      <Captions
        top={SAFE.top + 110}
        lines={[
          { at: HOOK_END + 2, until: PHONE_OUT - 4, text: <>Vos clients commandent et <Hot>paient depuis la table.</Hot></> },
          { at: RATE, until: CACHET - 6, text: "Ominin se rémunère sur ce qui est payé en ligne." },
          { at: CACHET, until: END - 6, text: "Le QR code à votre logo, collé sur chaque table." },
        ]}
      />
      {frame < PHONE_OUT + 20 && <Phone map={film} at={PHONE_IN} place={{ y: frame < PHONE_OUT ? 400 : 400 + (frame - PHONE_OUT) * 70 }} />}
      <Pop at={RATE + 4} until={CACHET - 6} style={figureBlock}>
        <Card style={{ padding: "56px 56px 60px" }}>
          <Figure size={300}>
            <Hot>3&#8239;%</Hot>
          </Figure>
          <div style={{ marginTop: 24, fontSize: 60, fontWeight: 700, lineHeight: 1.1 }}>des commandes payées en ligne</div>
          <div style={note}>+ frais de carte. 0 € d’abonnement.</div>
        </Card>
      </Pop>
      <Pop at={CACHET + 4} until={END - 6} style={figureBlock}>
        <Card style={{ padding: "56px 56px 60px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
            <div style={{ padding: 18, borderRadius: 28, background: "#fff", color: "#1A1512", textAlign: "center", fontWeight: 700, fontSize: 26 }}>
              <Qr size={170} />
              <div style={{ marginTop: 10 }}>Table 12</div>
            </div>
            <Figure size={160}>
              <Hot>1,50&#8239;€</Hot>
            </Figure>
          </div>
          <div style={{ marginTop: 40, fontSize: 60, fontWeight: 700, lineHeight: 1.1 }}>par table, une fois.</div>
          <div style={note}>Le Cachet : il ouvre votre carte, sans application.</div>
        </Card>
      </Pop>
      <EndCard at={END} line="0 € par mois. 3 % en ligne." />
    </Stage>
  );
};
