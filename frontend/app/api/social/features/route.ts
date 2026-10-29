import { NextResponse } from "next/server";
import { FEATURES } from "@/lib/social/features";

/*
 * Catalogue des fonctionnalités, lu par l'agent social (backend) au moment
 * d'écrire : chaque publication en présente une, en tournant sur tout le
 * catalogue. Public comme les landings qui les décrivent.
 */
export function GET() {
  return NextResponse.json(FEATURES);
}
