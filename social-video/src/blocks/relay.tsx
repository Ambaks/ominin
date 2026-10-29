import { useVideoConfig } from "remotion";
import type { RelayProps } from "../../../frontend/lib/social/script.ts";
import { Headline, parts } from "./headline.tsx";
import { MenuRelay } from "./menu-relay.tsx";
import { Eyebrow, SAFE, Stage, type BlockBrand } from "./stage.tsx";

/* Le relais du site (menu-relay.tsx) sous un titre, sa fente au bas de la zone sûre. */

/* Corps maximal du titre, en rem ; avance d'un signe et d'une espace en Geist
 * 800 serrée, en em, comptées large ; marges du pavé (kit-mark), insécable. */
const TITLE_MAX = 3.15;
const CHAR = 0.47;
const SPACE = 0.25;
const MARK_PAD = 0.32;

/** Le plus grand corps, en rem, qui tient le titre sur deux lignes de column px. */
function titleSize(title: string, column: number) {
  const units = parts(title).flatMap((part) =>
    part.marked ? [part.words.join(" ").length * CHAR + MARK_PAD] : part.words.map((word) => word.length * CHAR),
  );
  const line = (from: number, to: number) => units.slice(from, to).reduce((sum, width, i) => sum + width + (i ? SPACE : 0), 0);
  const widest = Math.min(...units.map((_, cut) => Math.max(line(0, cut + 1), line(cut + 1, units.length))));
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  return Math.min(TITLE_MAX, column / widest / rem);
}

export function Relay({ brand, title }: BlockBrand & RelayProps) {
  const { durationInFrames, width } = useVideoConfig();
  return (
    <Stage>
      <Eyebrow brand={brand} text="En cuisine" />
      <div className="mt-[0.4rem]">
        <Headline title={title} start={0} size={titleSize(title, width - SAFE.left - SAFE.right)} />
      </div>
      <div className="mt-auto">
        <MenuRelay loop={durationInFrames} />
      </div>
    </Stage>
  );
}
