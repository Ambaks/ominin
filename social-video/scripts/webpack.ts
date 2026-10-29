import { fileURLToPath } from "node:url";
import type { WebpackOverrideFn } from "@remotion/bundler";
import { enableTailwind } from "@remotion/tailwind-v4";

/*
 * Les boucles se montent avec le site lui-même : sa feuille (Tailwind v4,
 * jetons de app/globals.css, kit des landings) et ses données, importées par
 * l'alias @ du frontend.
 */
const FRONTEND = fileURLToPath(new URL("../../frontend", import.meta.url));

type Rule = { use?: unknown; oneOf?: Rule[]; rules?: Rule[] };

/* La feuille du site pointe vers ses images publiques (/big-smash/…) : on
 * laisse ces url() telles quelles, aucune boucle ne s'en sert. */
function keepCssUrls(rules: Rule[] = []): void {
  for (const rule of rules) {
    for (const use of Array.isArray(rule.use) ? rule.use : []) {
      if (typeof use === "object" && String(use.loader).includes("css-loader")) {
        use.options = { ...use.options, url: false };
      }
    }
    keepCssUrls(rule.oneOf);
    keepCssUrls(rule.rules);
  }
}

export const webpackOverride: WebpackOverrideFn = (config) => {
  const withTailwind = enableTailwind(config);
  keepCssUrls(withTailwind.module?.rules as Rule[]);
  return {
    ...withTailwind,
    resolve: {
      ...withTailwind.resolve,
      alias: { ...withTailwind.resolve?.alias, "@": FRONTEND },
    },
  };
};
