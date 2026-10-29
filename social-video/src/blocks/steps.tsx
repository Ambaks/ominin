import { useVideoConfig } from "remotion";
import type { StepsProps } from "../../../frontend/lib/social/script.ts";
import { parts } from "./headline.tsx";
import { Eyebrow, SAFE, Stage, type BlockBrand } from "./stage.tsx";
import { StepsPath } from "./steps-path.tsx";
import { StepsPhone } from "./steps-phone.tsx";
import { StepsTitle } from "./steps-title.tsx";

/*
 * Comment ça marche : l'étiquette, le titre au pavé braise, puis le parcours
 * en trois stations sur un rail (steps-path.tsx), qui s'allument dans l'ordre ;
 * au pied de la toile, le téléphone de l'offre change d'écran avec elles
 * (steps-phone.tsx).
 */

const KICKER = "Mode d'emploi";
/* Corps maximal du titre, en rem ; avance d'un signe en Geist 800 serrée, en em,
 * comptée large, et marges du pavé (kit-mark) : le passage tient sur une ligne. */
const TITLE_MAX = 3.1;
const CHAR = 0.47;
const MARK_PAD = 0.32;

/** Le corps du titre, en rem, pour que son plus long morceau insécable tienne dans column px. */
function titleSize(title: string, column: number) {
  const widest = Math.max(
    ...parts(title).flatMap((part) => (part.marked ? [part.words.join(" ").length * CHAR + MARK_PAD] : part.words.map((word) => word.length * CHAR))),
  );
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  return Math.min(TITLE_MAX, column / widest / rem);
}

export function Steps({ brand, title, steps }: BlockBrand & StepsProps) {
  const { width } = useVideoConfig();
  return (
    <Stage>
      <Eyebrow brand={brand} text={KICKER} />
      <div className="mt-[22px]">
        <StepsTitle title={title} size={titleSize(title, width - SAFE.left - SAFE.right)} />
      </div>
      <div className="mt-[56px]">
        <StepsPath steps={steps} />
      </div>
      <div className="mt-[44px] flex justify-end">
        <StepsPhone brand={brand} />
      </div>
    </Stage>
  );
}
