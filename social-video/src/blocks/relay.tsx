import { useVideoConfig } from "remotion";
import type { RelayProps } from "../../../frontend/lib/social/script.ts";
import { Headline } from "./headline.tsx";
import { MenuRelay } from "./menu-relay.tsx";
import { Eyebrow, Stage, type BlockBrand } from "./stage.tsx";

/* Le relais du site (menu-relay.tsx) sous un titre, sur toute la zone sûre. */

export function Relay({ brand, title }: BlockBrand & RelayProps) {
  const { durationInFrames } = useVideoConfig();
  return (
    <Stage>
      <Eyebrow brand={brand} text="En cuisine" />
      <div className="mt-[0.4rem]">
        <Headline title={title} start={0} size={2.9} />
      </div>
      <div className="mt-[0.7rem] flex flex-1 flex-col">
        <MenuRelay loop={durationInFrames} />
      </div>
    </Stage>
  );
}
