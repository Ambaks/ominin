/*
 * Jetons de mouvement, miroir des variables --ease-* / --dur-* de globals.css
 * pour les animations pilotées en JS (Motion). Une seule courbe de sortie pour
 * tout ce qui apparaît, une courbe « rideau » pour ce qui se découvre.
 */
export const ease = {
  out: [0.16, 1, 0.3, 1],
  curtain: [0.76, 0, 0.24, 1],
} as const;

export const duration = {
  micro: 0.25,
  reveal: 0.9,
  curtain: 1.2,
} as const;

export const stagger = 0.07;
