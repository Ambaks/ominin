import { continueRender, delayRender, staticFile } from "remotion";

/* Polices du site, copiées dans public/fonts par le script de rendu. */
const handle = delayRender("Polices des boucles");
Promise.all(
  (
    [
      ["Geist", "400", "geist-latin-400-normal.woff"],
      ["Geist", "800", "geist-latin-800-normal.woff"],
      ["Instrument Sans", "400", "instrument-sans-latin-400-normal.woff"],
      ["Instrument Sans", "600", "instrument-sans-latin-600-normal.woff"],
    ] as const
  ).map(async ([family, weight, file]) => {
    const face = new FontFace(family, `url(${staticFile(`fonts/${file}`)})`, { weight });
    document.fonts.add(await face.load());
  }),
).then(() => continueRender(handle));
