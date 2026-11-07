/** « 5,6 % », « 0,83 % » : deux décimales sous 1 %, où l'arrondi à une seule mentirait. */
export function percent(chance: number): string {
  return `${(chance * 100).toLocaleString("fr-FR", { maximumFractionDigits: chance < 0.01 ? 2 : 1 })} %`;
}

/** « 1 tour sur 18 ». */
export function oneIn(chance: number): string {
  return `1 tour sur ${Math.round(1 / chance).toLocaleString("fr-FR")}`;
}

export function chanceText(chance: number): string {
  return `${percent(chance)} · ${oneIn(chance)}`;
}

/** Un nombre moyen, à une décimale : « 5,6 ». */
export function average(value: number): string {
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}
