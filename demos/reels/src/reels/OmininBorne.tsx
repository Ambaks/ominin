import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { KitchenTicket, PANEL, springs, T } from "../film";
import { AtFilm, Cachet, Captions, EndCard, Eyebrow, filmTime, Headline, Hot, Mark, Phone, PHONE, Pop, s, SAFE, Stage, usePhoneY } from "../kit";

/*
 * Ominin, la marque : chaque téléphone devient une borne. Le parcours du
 * film en accéléré, puis les deux métiers un écran chacun (la table, le
 * comptoir), et « sans changer de caisse » qui lève l'objection.
 */
const HOOK_END = s(2.4);
const TICKET = s(5.6);
const TABLE = s(8.2);
const COUNTER = s(10.4);
const TILL = s(12.6);
const END = s(15.4);
export const OMININ_BORNE_DURATION = s(19.4);
const TICKET_SCALE = 2.1;

const film = filmTime([
  [0, T.MENU + 12],
  [HOOK_END, T.MENU + 20],
  [s(3), T.TAPS[0] + 4],
  [s(3.6), T.TAPS[1] + 4],
  [s(4.2), T.TAPS[3]],
  [s(4.9), T.PAID + 6],
  [TICKET - 10, T.PRINT - 2],
  [TABLE, T.PRINT + 50],
]);
/** The counter's payoff: the same order, ready. */
const ready = () => T.READY + 20;

export const OmininBorne = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const away = spring({ frame: frame - (TICKET - 8), fps, config: springs.push });
  const y = usePhoneY(HOOK_END - 6);
  return (
    <Stage brand="ominin">
      <Eyebrow label="Ominin" until={TILL - 6} />
      <Headline lines={["Chaque téléphone", <>devient une <Mark at={6}>borne.</Mark></>]} at={-30} until={HOOK_END} size={124} top={SAFE.top + 110} />
      <Captions
        top={SAFE.top + 110}
        lines={[
          { at: HOOK_END + 2, until: TICKET - 8, text: <>Vos clients commandent et paient <Hot>sur leur téléphone.</Hot></> },
          { at: TICKET - 2, until: TABLE - 6, text: <>La commande part <Hot>aussitôt en cuisine.</Hot></> },
          { at: TABLE, until: COUNTER - 6, text: <>Au restaurant : <Hot>un QR sur chaque table.</Hot></> },
          { at: COUNTER, until: TILL - 6, text: <>Au fast-food : <Hot>« C’est prêt ! »</Hot> sur le téléphone.</> },
        ]}
      />
      {frame < TICKET + 20 && <Phone map={film} at={-60} place={{ y: y + 1300 * away }} />}
      {frame >= TICKET - 10 && frame < TABLE && (
        <div style={{ position: "absolute", top: 640, left: (1080 - PANEL.width * TICKET_SCALE) / 2, width: PANEL.width, scale: String(TICKET_SCALE), transformOrigin: "0 0" }}>
          <AtFilm map={film}>
            <KitchenTicket />
          </AtFilm>
        </div>
      )}
      <Pop at={TABLE + 2} until={COUNTER - 6} style={{ position: "absolute", top: 640, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Cachet scale={1.9} />
      </Pop>
      {frame >= COUNTER && frame < TILL && <Phone map={ready} at={COUNTER} place={{ y: PHONE.rest }} />}
      <Headline lines={["Sans changer", <Mark at={TILL + 8}>de caisse.</Mark>]} at={TILL} until={END - 6} size={170} top={720} />
      <EndCard at={END} line="Chaque téléphone devient une borne." sub="Restaurants et fast-foods · 0 €/mois · 3 % des paiements en ligne + frais de carte" />
    </Stage>
  );
};

