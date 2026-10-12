import { Config } from "@remotion/cli/config";
import { webpackOverride } from "./webpack.mjs";

Config.setEntryPoint("src/index.ts");
Config.setVideoImageFormat("png");
Config.setColorSpace("bt709");
Config.setOverwriteOutput(true);
Config.setChromiumOpenGlRenderer("angle");
Config.overrideWebpackConfig(webpackOverride);
