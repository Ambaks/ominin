/*
 * Les teintes du velours (panis-backdrop.tsx), par établissement. Chaque
 * couleur du satin a sa valeur au bureau puis au téléphone, où il ne se voit
 * qu'entre les fiches et s'éclaircit un peu ; flat est le satin à plat, sans
 * WebGL. Composantes RVB entre 0 et 1, au format des littéraux GLSL.
 */

export type VeloursPalette = {
  deep: [string, string];
  mid: [string, string];
  sheen: string;
  flat: string;
};

// Vert bouteille, reflet sauge.
const panisVelours: VeloursPalette = {
  deep: [".035,.15,.08", ".05,.22,.115"],
  mid: [".08,.33,.17", ".1,.4,.21"],
  sheen: ".6,.74,.58",
  flat: "#0a2a17",
};

// Aubergine, reflet rosé.
const bohoVelours: VeloursPalette = {
  deep: [".058,.031,.069", ".078,.042,.093"],
  mid: [".199,.101,.219", ".239,.121,.263"],
  sheen: ".902,.675,.618",
  flat: "#0f0812",
};

// Feutre noir, reflet d'or ancien.
const noveltyVelours: VeloursPalette = {
  deep: [".02,.018,.014", ".045,.034,.022"],
  mid: [".1,.075,.038", ".18,.13,.06"],
  sheen: ".82,.66,.32",
  flat: "#080808",
};

// Noir rouge de la devanture, reflet de laiton.
const victoriaVelours: VeloursPalette = {
  deep: [".055,.016,.02", ".09,.024,.03"],
  mid: [".24,.055,.065", ".36,.08,.09"],
  sheen: ".68,.52,.3",
  flat: "#171513",
};

// Noir, reflet magenta tenu.
const artsVelours: VeloursPalette = {
  deep: [".028,.004,.016", ".055,.01,.032"],
  mid: [".16,.02,.09", ".26,.035,.14"],
  sheen: ".75,.16,.45",
  flat: "#000000",
};

// Noir chaud, reflet champagne (plus clair que l'or du Novelty).
const laissacVelours: VeloursPalette = {
  deep: [".03,.026,.02", ".05,.04,.028"],
  mid: [".15,.11,.06", ".22,.165,.09"],
  sheen: ".96,.84,.6",
  flat: "#0b0a09",
};

/** Les quatre aperçus de l'Écusson. Leur satin n'est monté que sur /menu/demo : la carte publiée et le click & collect partagent la classe de thème. */
export const ecussonVelours = new Set([
  "le-novelty",
  "le-victoria",
  "cafe-des-arts",
  "brasserie-laissac",
]);

export const veloursPalettes: Record<string, VeloursPalette> = {
  "caffe-panis": panisVelours,
  // Le clone de démonstration de Caffè Panis, branché sur HubRise.
  "caffe-panis-demo": panisVelours,
  boho: bohoVelours,
  // La démonstration des bulles du Boho (lib/bulles/demo).
  "boho-demo": bohoVelours,
  "le-novelty": noveltyVelours,
  "le-victoria": victoriaVelours,
  "cafe-des-arts": artsVelours,
  "brasserie-laissac": laissacVelours,
};
