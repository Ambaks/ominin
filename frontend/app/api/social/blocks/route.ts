import { NextResponse } from "next/server";
import { BLOCKS, FORMATS, LOOKS, RHYTHMS, SCENE_FRAMES, TRANSITION_FRAMES, TRANSITIONS } from "@/lib/social/script";

/*
 * Catalogue des Reels en scènes, lu par l'agent social (backend) au moment
 * d'écrire : blocs, transitions, et les formats, habillages et rythmes entre
 * lesquels il tourne pour que deux publications ne se ressemblent pas.
 */
export function GET() {
  return NextResponse.json({
    blocks: BLOCKS,
    transitions: TRANSITIONS,
    formats: FORMATS,
    looks: LOOKS,
    rhythms: RHYTHMS,
    sceneFrames: SCENE_FRAMES,
    transitionFrames: TRANSITION_FRAMES,
  });
}
