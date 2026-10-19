import { NextResponse } from "next/server";
import { CLIPS } from "@/lib/social/clips";

/*
 * Catalogue des démos filmées, lu par l'agent social (backend) au moment
 * d'écrire un Reel : il ne peut choisir qu'un id qui existe ici.
 */
export function GET() {
  return NextResponse.json(CLIPS);
}
