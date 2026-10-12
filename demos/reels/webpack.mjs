import path from "node:path";

/**
 * The Reels reuse the scenes of the Ominin film (marketing/linkedin-film),
 * whose own node_modules are not installed: its imports resolve here.
 * @type {import("@remotion/bundler").WebpackOverrideFn}
 */
export const webpackOverride = (config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    modules: [path.join(import.meta.dirname, "node_modules"), "node_modules"],
  },
});
