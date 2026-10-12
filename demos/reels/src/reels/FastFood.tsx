import { useCurrentFrame } from "remotion";
import { T } from "../film";
import { Captions, EndCard, Eyebrow, filmTime, Headline, Hot, Mark, Phone, s, SAFE, Stage, usePhoneY } from "../kit";

/*
 * Fast food : commandé et payé avant d'arriver, un numéro du jour, l'heure
 * annoncée, « C'est prêt ! » sur le téléphone. C'est le mode fast food de
 * Connect : le Reel finit sur menu.ominin.com. Accroche retenue au test
 * A/B : la question que le comptoir n'entend plus.
 */
const HOOK_END = s(2.2);
const NUMBER = s(4.3);
const ESTIMATE = s(6.1);
const WAIT = s(8.4);
const READY = s(10);
const END = s(12.2);
export const FASTFOOD_DURATION = s(16.2);

const film = filmTime([
  [0, T.MENU + 12],
  [HOOK_END, T.MENU + 20],
  [s(2.6), T.TAPS[0] + 4],
  [s(3.1), T.TAPS[1] + 4],
  [s(3.6), T.TAPS[3]],
  [NUMBER - 6, T.PAID + 4],
  [ESTIMATE - 8, T.PRINT + 20],
  [ESTIMATE - 7, T.ESTIMATE - 6],
  [WAIT, T.ESTIMATE + 40],
  [READY - 2, T.LAPSE[6] + 10],
  [READY, T.READY],
  [END, T.READY + 50],
]);

export const FastFood = () => {
  const frame = useCurrentFrame();
  const y = usePhoneY(HOOK_END - 6);
  const buzz = frame >= READY && frame < READY + 18 ? Math.sin(frame * 2.4) * 10 * (1 - (frame - READY) / 18) : 0;
  return (
    <Stage brand="menu">
      <Eyebrow label="Ominin Menu · Fast food" until={END - 6} />
      <Headline lines={["« C’est prêt", "quand ? »", <Mark at={8}>Fini.</Mark>]} at={-30} until={HOOK_END} size={150} top={SAFE.top + 110} />
      <Captions
        top={SAFE.top + 110}
        lines={[
          { at: HOOK_END + 4, until: NUMBER - 6, text: <>Il commande depuis <Hot>la rue ou le bureau.</Hot></> },
          { at: NUMBER - 2, until: ESTIMATE - 6, text: <>Il reçoit son numéro du jour : <Hot>N° 42.</Hot></> },
          { at: ESTIMATE, until: WAIT - 4, text: <>Son téléphone annonce <Hot>l’heure où c’est prêt.</Hot></> },
          { at: WAIT, until: READY - 4, text: "Il attend où il veut, pas devant le comptoir." },
          { at: READY, until: END - 6, text: <><Hot>« C’est prêt ! »</Hot> Il passe et repart.</> },
        ]}
      />
      {frame < END && <Phone map={film} at={-60} place={{ y, x: buzz, rotateZ: buzz * 0.15 }} />}
      <EndCard at={END} line="Le comptoir respire." sub="Mode fast food inclus · 0 €/mois · 3 % des paiements en ligne + frais de carte" />
    </Stage>
  );
};
