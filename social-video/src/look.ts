import { createContext } from "react";
import type { LookId } from "../../frontend/lib/social/script.ts";

/* L'habillage de la publication (frontend/lib/social/script.ts, LOOKS), posé
 * par Post sur toutes ses scènes : Stage en tire ses couleurs et son fond. */
export const LookContext = createContext<LookId>("braise");
