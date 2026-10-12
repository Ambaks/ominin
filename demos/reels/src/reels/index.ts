import type { ComponentType } from "react";
import { COLLECT_EMPORTER_DURATION, CollectEmporter } from "./CollectEmporter";
import { COLLECT_FASTFOOD_DURATION, CollectFastFood } from "./CollectFastFood";
import { MENU_TABLE_DURATION, MenuTable } from "./MenuTable";
import { MENU_TARIF_DURATION, MenuTarif } from "./MenuTarif";
import { OMININ_BORNE_DURATION, OmininBorne } from "./OmininBorne";
import { OMININ_SPEED_DURATION, OmininSpeed } from "./OmininSpeed";

type Reel = { id: string; component: ComponentType<any>; duration: number; props: Record<string, unknown> };

/* Every Reel rendered, the A/B hooks as separate compositions. */
export const REELS: Reel[] = [
  { id: "menu-table-A", component: MenuTable, duration: MENU_TABLE_DURATION, props: { hook: "A" } },
  { id: "menu-table-B", component: MenuTable, duration: MENU_TABLE_DURATION, props: { hook: "B" } },
  { id: "menu-tarif", component: MenuTarif, duration: MENU_TARIF_DURATION, props: {} },
  { id: "collect-fastfood-A", component: CollectFastFood, duration: COLLECT_FASTFOOD_DURATION, props: { hook: "A" } },
  { id: "collect-fastfood-B", component: CollectFastFood, duration: COLLECT_FASTFOOD_DURATION, props: { hook: "B" } },
  { id: "collect-emporter", component: CollectEmporter, duration: COLLECT_EMPORTER_DURATION, props: {} },
  { id: "ominin-18s-A", component: OmininSpeed, duration: OMININ_SPEED_DURATION, props: { hook: "A" } },
  { id: "ominin-18s-B", component: OmininSpeed, duration: OMININ_SPEED_DURATION, props: { hook: "B" } },
  { id: "ominin-borne", component: OmininBorne, duration: OMININ_BORNE_DURATION, props: {} },
];
