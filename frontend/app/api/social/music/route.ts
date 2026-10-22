import { NextResponse } from "next/server";
import { MUSIC } from "@/lib/social/music";

/*
 * Catalogue des musiques, lu par l'agent social (backend) : il choisit un
 * morceau par Reel d'après son ambiance.
 */
export function GET() {
  return NextResponse.json(MUSIC.map(({ id, mood }) => ({ id, description: mood })));
}
