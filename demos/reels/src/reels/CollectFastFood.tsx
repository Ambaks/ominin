import { useCurrentFrame } from "remotion";
import { T } from "../film";
import { Captions, EndCard, Eyebrow, filmTime, Headline, Hot, Mark, Phone, s, SAFE, Stage } from "../kit";

/*
 * Fast food : commandé et payé depuis la file, un numéro du jour, l'heure
 * annoncée, « C'est prêt ! » sur le téléphone. A : la question que le
 * comptoir n'entend plus ; B : la fin de l'histoire d'abord.
 */
const HOOKS = {
  A: { lines: ["« C’est prêt", "quand ? »", <Mark at={8}>Fini.</Mark>], size: 170 },
  B: { lines: ["N° 42,", <Mark at={6}>c’est prêt !</Mark>], size: 190 },
};

const HOOK_END = s(2.4);
const ORDER = s(2.2);
const NUMBER = s(6.2);
const ESTIMATE = s(8.6);
const WAIT = s(11.2);
const READY = s(13.4);
const END = s(16.6);
export const COLLECT_FASTFOOD_DURATION = s(20);

const film = filmTime([
  [ORDER, T.SCAN - 4],
  [ORDER + 14, T.SCAN + 2],
  [s(3.6), T.MENU + 16],
  [s(4.3), T.TAPS[0] + 4],
  [s(5), T.TAPS[1] + 4],
  [s(5.6), T.TAPS[3]],
  [NUMBER, T.PAID + 8],
  [ESTIMATE - 10, T.PRINT + 20],
  [ESTIMATE - 9, T.ESTIMATE - 6],
  [WAIT, T.LAPSE[0] - 4],
  [READY - 2, T.LAPSE[6] + 10],
  [READY, T.READY],
  [END, T.READY + 60],
]);

/* Hook B shows the payoff first: the phone already at « C'est prêt ! ». */
const payoff = () => T.READY + 20;

export const CollectFastFood = ({ hook }: { hook: keyof typeof HOOKS }) => {
  const frame = useCurrentFrame();
  const buzz = frame >= READY && frame < READY + 18 ? Math.sin(frame * 2.4) * 10 * (1 - (frame - READY) / 18) : 0;
  const { lines, size } = HOOKS[hook];
  return (
    <Stage brand="collect">
      <Eyebrow label="Ominin Collect · Fast food" until={END - 6} />
      <Headline lines={lines} at={-30} until={HOOK_END} size={size} top={hook === "B" ? 400 : 560} />
      {hook === "B" && frame < HOOK_END + 8 && (
        <Phone map={payoff} at={-60} size={980} place={{ y: 560 + Math.max(0, frame - HOOK_END) * 90, x: Math.sin(frame * 2.4) * 6 }} />
      )}
      <Captions
        top={SAFE.top + 110}
        lines={[
          { at: HOOK_END + 4, until: NUMBER - 4, text: <>Votre client commande et paie <Hot>depuis la file.</Hot></> },
          { at: NUMBER, until: ESTIMATE - 6, text: <>Il reçoit son numéro du jour : <Hot>N° 42.</Hot></> },
          { at: ESTIMATE, until: WAIT - 6, text: <>Son téléphone lui annonce <Hot>l’heure où c’est prêt.</Hot></> },
          { at: WAIT, until: READY - 4, text: "Il attend où il veut. Le comptoir respire." },
          { at: READY, until: END - 6, text: <><Hot>« C’est prêt ! »</Hot> Il vient chercher sa commande.</> },
        ]}
      />
      {frame >= ORDER && frame < END && <Phone map={film} at={hook === "B" ? HOOK_END : ORDER} place={{ y: 400, x: buzz, rotateZ: buzz * 0.15 }} />}
      <EndCard at={END} line="Votre client sait quand c’est prêt." />
    </Stage>
  );
};
