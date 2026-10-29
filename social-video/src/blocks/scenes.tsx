import type { PostScene } from "../../../frontend/lib/social/script.ts";
import { Cta } from "./cta.tsx";
import { Hook } from "./hook.tsx";
import { Phone } from "./phone.tsx";
import { Points } from "./points.tsx";
import { Relay } from "./relay.tsx";
import type { BlockBrand } from "./stage.tsx";

/*
 * Les blocs d'une publication, un par scène (frontend/lib/social/script.ts),
 * chacun dans son fichier : chacun remplit toute la toile et rentre de
 * lui-même ; la sortie est celle de la transition qui suit.
 */

export function SceneView({ brand, scene }: BlockBrand & { scene: PostScene }) {
  switch (scene.block) {
    case "hook":
      return <Hook brand={brand} {...scene.props} />;
    case "phone":
      return <Phone brand={brand} {...scene.props} />;
    case "relay":
      return <Relay brand={brand} {...scene.props} />;
    case "points":
      return <Points brand={brand} {...scene.props} />;
    case "cta":
      return <Cta brand={brand} {...scene.props} />;
  }
}
