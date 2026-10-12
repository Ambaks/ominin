import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { KitchenTicket, PANEL, springs, T } from "../film";
import { AtFilm, Captions, EndCard, Eyebrow, filmTime, Headline, Hot, Mark, Phone, s, SAFE, Stage, usePhoneY } from "../kit";

/*
 * Ominin Menu, à table : le client scanne, commande, paie ; le ticket sort
 * en cuisine en 18 s (médiane du rapport r7k2). Accroche retenue au test
 * A/B : l'addition qu'on n'attend plus.
 */
const HOOK_END = s(2.2);
const SCAN = s(2.7);
const TICKET = s(7);
const END = s(9.9);
export const MENU_TABLE_DURATION = s(13.9);
/** The kitchen ticket takes the phone's place, at twice the film's panel size. */
const TICKET_SCALE = 2.1;

/* Reel frame → film frame: the camera waits on the table's QR under the hook, then the order runs a little faster than in the film. */
const film = filmTime([
  [0, T.SCAN - 24],
  [HOOK_END, T.SCAN - 20],
  [SCAN, T.SCAN],
  [s(3.6), T.MENU + 16],
  [s(4), T.TAPS[0] + 4],
  [s(4.7), T.TAPS[1] + 4],
  [s(5.3), T.TAPS[3]],
  [s(6.1), T.PAID + 6],
  [TICKET - 10, T.PRINT - 2],
  [END, T.PRINT + 60],
]);

export const MenuTable = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const away = spring({ frame: frame - (TICKET - 8), fps, config: springs.push });
  const y = usePhoneY(HOOK_END - 6);
  return (
    <Stage brand="menu">
      <Eyebrow label="Ominin Menu" until={END - 6} />
      <Headline lines={["Plus personne", "n’attend", <Mark at={6}>l’addition.</Mark>]} at={-30} until={HOOK_END} size={140} top={SAFE.top + 110} />
      <Captions
        top={SAFE.top + 110}
        lines={[
          { at: HOOK_END + 4, until: s(3.7), text: "Le client scanne le QR de sa table." },
          { at: s(3.8), until: s(5.2), text: "Il commande depuis son téléphone." },
          { at: s(5.3), until: TICKET - 8, text: <>Il paie quand il veut, <Hot>sans attendre personne.</Hot></> },
          { at: TICKET - 2, until: END - 6, text: <>En cuisine en <Hot>18 s</Hot> (médiane mesurée).</> },
        ]}
      />
      {frame >= TICKET - 10 && frame < END && (
        <div style={{ position: "absolute", top: 640, left: (1080 - PANEL.width * TICKET_SCALE) / 2, width: PANEL.width, scale: String(TICKET_SCALE), transformOrigin: "0 0" }}>
          <AtFilm map={film}>
            <KitchenTicket />
          </AtFilm>
        </div>
      )}
      {frame < TICKET + 20 && <Phone map={film} at={-60} place={{ y: y + 1300 * away }} />}
      <EndCard at={END} line="Vos clients commandent et paient seuls." sub="0 €/mois · 3 % des paiements en ligne + frais de carte" />
    </Stage>
  );
};
