import { NextResponse } from "next/server";
import { BLOCKS, SCENE_FRAMES, TRANSITION_FRAMES, TRANSITIONS } from "@/lib/social/script";

/*
 * Catalogue des blocs et des transitions des Reels en scènes, lu par l'agent
 * social (backend) au moment d'écrire : il ne peut choisir qu'un bloc, une
 * transition et une durée que le montage (social-video) sait rendre.
 */
export function GET() {
  return NextResponse.json({ blocks: BLOCKS, transitions: TRANSITIONS, sceneFrames: SCENE_FRAMES, transitionFrames: TRANSITION_FRAMES });
}
