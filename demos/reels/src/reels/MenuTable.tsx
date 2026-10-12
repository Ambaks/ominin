import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { AtFilm, Captions, EndCard, Eyebrow, filmTime, Headline, Hot, Mark, Phone, s, SAFE, Stage } from "../kit";
import { KitchenTicket, PANEL, springs, T } from "../film";

/*
 * Ominin Menu, à table : le client scanne, commande, paie ; le ticket sort
 * en cuisine. Deux accroches : A reprend le titre de la landing, B l'addition.
 */
const HOOKS = {
  A: ["Vos tables", "prennent les", <Mark at={6}>commandes.</Mark>],
  B: ["Plus personne", "n’attend", <Mark at={6}>l’addition.</Mark>],
};

const HOOK_END = s(2.3);
const PHONE_IN = s(2);
const TICKET = s(8.3);
const END = s(13.6);
/** The kitchen ticket takes the phone's place, at twice the film's panel size. */
const TICKET_SCALE = 2.1;
export const MENU_TABLE_DURATION = s(17);

/* Reel frame → film frame: the scan lands as the first caption shows, the taps a little faster than the film's. */
const film = filmTime([
  [PHONE_IN, T.SCAN - 20],
  [PHONE_IN + 22, T.SCAN],
  [s(3.6), T.MENU + 14],
  [s(4.4), T.TAPS[0] + 4],
  [s(5.4), T.TAPS[1] + 4],
  [s(6.1), T.TAPS[3]],
  [s(6.6), T.PAID + 4],
  [TICKET - 6, T.PRINT - 8],
  [TICKET + 40, T.PRINT + 40],
  [END, T.PROOF - 10],
]);

export const MenuTable = ({ hook }: { hook: keyof typeof HOOKS }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const away = spring({ frame: frame - (TICKET - 8), fps, config: springs.push });
  return (
    <Stage brand="menu">
      <Eyebrow label="Ominin Menu" until={END - 6} />
      <Headline lines={HOOKS[hook]} at={-30} until={HOOK_END} size={158} top={560} />
      <Captions
        top={SAFE.top + 110}
        lines={[
          { at: HOOK_END + 4, until: s(4.2), text: "Le client scanne le QR de sa table." },
          { at: s(4.3), until: s(6.1), text: "Il commande depuis son téléphone." },
          { at: s(6.2), until: TICKET - 8, text: <>Il paie, <Hot>sans attendre l’addition.</Hot></> },
          { at: TICKET - 2, until: s(11), text: <>La commande part <Hot>aussitôt en cuisine.</Hot></> },
          { at: s(11.1), until: END - 6, text: "Sans application. Sans attendre un serveur." },
        ]}
      />
      {frame >= TICKET - 10 && frame < END && (
        <div style={{ position: "absolute", top: 640, left: (1080 - PANEL.width * TICKET_SCALE) / 2, width: PANEL.width, scale: String(TICKET_SCALE), transformOrigin: "0 0" }}>
          <AtFilm map={film}>
            <KitchenTicket />
          </AtFilm>
        </div>
      )}
      {frame < TICKET + 20 && <Phone map={film} at={PHONE_IN} place={{ y: 400 + 1300 * away }} />}
      <EndCard at={END} line="Commande et paiement à table." />
    </Stage>
  );
};
