import { NextResponse } from "next/server";
import { SCREENS } from "@/lib/social/screens";

/*
 * Catalogue des captures, lu par l'agent social (backend) au moment d'écrire :
 * il ne peut choisir qu'un id qui existe ici. Public comme les captures.
 */
export function GET() {
  return NextResponse.json(SCREENS);
}
