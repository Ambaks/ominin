/* Adresses des photos libres (Unsplash, Pexels) aux dimensions des fiches. */

export const unsplash = (id: string, w = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=75`;

export const pexels = (path: string, w = 1200) =>
  `https://images.pexels.com/photos/${path}?auto=compress&cs=tinysrgb&w=${w}`;

/**
 * Même photo, recadrée par le serveur d'images plutôt que par le navigateur.
 * Utile quand le sujet n'est pas au centre du cliché : `object-fit: cover`
 * rogne alors la pizza et garde le décor. `crop=entropy` recentre sur la zone
 * la plus dense de l'image. h vaut les 9/16 de w, le format des vignettes.
 */
export const pexelsRecadre = (path: string, w = 1200) =>
  `${pexels(path, w)}&h=${Math.round((w * 9) / 16)}&fit=crop&crop=entropy`;
