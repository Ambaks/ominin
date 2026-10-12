import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { AUDIENCES, Audiences, KitchenTicket, PANEL, springs, T } from "../film";
import { AtFilm, Captions, EndCard, Eyebrow, filmTime, Headline, Hot, Mark, Phone, s, SAFE, Stage } from "../kit";

/*
 * Ominin, la marque : chaque téléphone devient une borne. Le parcours du
 * film en accéléré, puis sa scène « deux métiers » (restaurants, fast-foods)
 * réduite pour tenir dans la zone sûre.
 */
const HOOK_END = s(2.4);
const TICKET = s(6.4);
const AUDIENCE = s(9.4);
const END = s(15);
export const OMININ_BORNE_DURATION = s(18.4);

const film = filmTime([
  [0, T.MENU + 12],
  [HOOK_END, T.MENU + 30],
  [s(3.4), T.TAPS[0] + 4],
  [s(4.1), T.TAPS[1] + 4],
  [s(4.8), T.TAPS[3]],
  [s(5.4), T.PAID + 6],
  [TICKET - 6, T.PRINT - 8],
  [TICKET + 40, T.PRINT + 40],
  [AUDIENCE, T.PROOF - 10],
]);

/** The film's audience scene, sped up 1.6× and starting on its first card. */
const audiences = filmTime([
  [AUDIENCE, AUDIENCES + 6],
  [END, AUDIENCES + 6 + (END - AUDIENCE) * 1.6],
]);
/** Scaled down so its title and last line leave the Reels UI clear. */
const AUDIENCE_SCALE = 0.74;
const TICKET_SCALE = 2.1;

export const OmininBorne = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const away = spring({ frame: frame - (TICKET - 8), fps, config: springs.push });
  return (
    <Stage brand="ominin">
      <Eyebrow label="Ominin" until={AUDIENCE - 6} />
      <Headline lines={["Chaque téléphone", <>devient une <Mark at={6}>borne.</Mark></>]} at={-30} until={HOOK_END} size={124} top={SAFE.top + 110} />
      <Captions
        top={SAFE.top + 110}
        lines={[
          { at: HOOK_END + 2, until: TICKET - 8, text: <>Vos clients commandent et paient <Hot>sur leur téléphone.</Hot></> },
          { at: TICKET - 2, until: AUDIENCE - 6, text: <>La commande part <Hot>aussitôt en cuisine.</Hot></> },
        ]}
      />
      {frame < TICKET + 20 && <Phone map={film} at={-60} place={{ y: 470 + 1300 * away }} />}
      {frame >= TICKET - 10 && frame < AUDIENCE && (
        <div style={{ position: "absolute", top: 640, left: (1080 - PANEL.width * TICKET_SCALE) / 2, width: PANEL.width, scale: String(TICKET_SCALE), transformOrigin: "0 0" }}>
          <AtFilm map={film}>
            <KitchenTicket />
          </AtFilm>
        </div>
      )}
      {frame >= AUDIENCE && frame < END && (
        <div style={{ position: "absolute", inset: 0, scale: String(AUDIENCE_SCALE) }}>
          <AtFilm map={audiences}>
            <Audiences />
          </AtFilm>
        </div>
      )}
      <EndCard at={END} line="Commande en ligne pour restaurants et fast-foods." />
    </Stage>
  );
};
