import { Config } from "@remotion/cli/config";

Config.setEntryPoint("src/index.ts");
// Lossless intermediate frames: JPEG chroma subsampling smears the brand
// yellow against black before the encoder even sees it.
Config.setVideoImageFormat("png");
// Tags the output as BT.709 so #F7EE21 plays back as #F7EE21.
Config.setColorSpace("bt709");
// Fine enough for the UI's small type.
Config.setCrf(12);
Config.setOverwriteOutput(true);
// The GPU through ANGLE: the phone's 3D layers and the blurs render ~40 %
// faster than on the software default.
Config.setChromiumOpenGlRenderer("angle");
