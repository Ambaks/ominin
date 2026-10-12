import type { ComponentType } from "react";
import { COLLECT_EMPORTER_DURATION, CollectEmporter } from "./CollectEmporter";
import { FASTFOOD_DURATION, FastFood } from "./FastFood";
import { MENU_TABLE_DURATION, MenuTable } from "./MenuTable";
import { MENU_TARIF_DURATION, MenuTarif } from "./MenuTarif";
import { OMININ_BORNE_DURATION, OmininBorne } from "./OmininBorne";
import { OMININ_SPEED_DURATION, OmininSpeed } from "./OmininSpeed";

/* The six Reels, each with the hook that won its A/B test (README). */
export const REELS: { id: string; component: ComponentType; duration: number }[] = [
  { id: "menu-table", component: MenuTable, duration: MENU_TABLE_DURATION },
  { id: "menu-tarif", component: MenuTarif, duration: MENU_TARIF_DURATION },
  { id: "menu-fastfood", component: FastFood, duration: FASTFOOD_DURATION },
  { id: "collect-emporter", component: CollectEmporter, duration: COLLECT_EMPORTER_DURATION },
  { id: "ominin-18s", component: OmininSpeed, duration: OMININ_SPEED_DURATION },
  { id: "ominin-borne", component: OmininBorne, duration: OMININ_BORNE_DURATION },
];
