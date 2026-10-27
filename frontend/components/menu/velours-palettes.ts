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

// Aubergine, reflet rosé.
const bohoVelours: VeloursPalette = {
  deep: [".058,.031,.069", ".078,.042,.093"],
  mid: [".199,.101,.219", ".239,.121,.263"],
  sheen: ".902,.675,.618",
  flat: "#0f0812",
};

export const veloursPalettes: Record<string, VeloursPalette> = {
  // Vert bouteille, reflet sauge.
  "caffe-panis": {
    deep: [".035,.15,.08", ".05,.22,.115"],
    mid: [".08,.33,.17", ".1,.4,.21"],
    sheen: ".6,.74,.58",
    flat: "#0a2a17",
  },
  boho: bohoVelours,
  // La démonstration des bulles du Boho (lib/bulles/demo).
  "boho-demo": bohoVelours,
};
