import { TIME_ZONE } from "@/lib/collect/hours";
import { Constants, type Database } from "@/lib/supabase/database.types";

/** L'habillage de saison du menu QR, que seul l'admin pose (etablissement_settings.saison). */
export type Saison = Database["public"]["Enums"]["saison"];

export const SAISONS: readonly Saison[] = Constants.public.Enums.saison;

/** Un repère de l'affiche, en % de sa largeur et de sa hauteur ; `size` en % de la largeur. */
export interface SaisonSpot {
  x: number;
  y: number;
  size: number;
  delay?: number;
}

/**
 * Ce que l'habillage allume sur l'affiche d'un établissement, mesuré sur
 * l'image. Sans repères, le hero n'a que le décor de cadre (toiles, brume,
 * citrouilles) ; feuilles, araignée, fantômes et chat suivent toute la carte.
 */
export interface SaisonSpots {
  /** Où se lève la lune ; chauves-souris et sorcière en partent. */
  moon: SaisonSpot;
  lamps: SaisonSpot[];
  lanternFaces: SaisonSpot[];
  bulbs: SaisonSpot[];
  candles: SaisonSpot[];
  /** Des yeux qui s'allument dans les massifs. */
  eyes: SaisonSpot[];
}

/**
 * La saison affichée : posée, et sa date de fin (dernier jour de service,
 * inclus) pas encore passée. Le jour de service bascule à `dayEndHour`, comme
 * la journée de caisse : « jusqu'au 31 » tient jusqu'à la fermeture de la nuit.
 */
export function activeSaison(
  saison: Saison | null,
  fin: string | null,
  dayEndHour: number
): Saison | null {
  if (!saison) return null;
  if (!fin) return saison;
  const serviceDay = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(
    new Date(Date.now() - dayEndHour * 3_600_000)
  );
  return serviceDay <= fin ? saison : null;
}
