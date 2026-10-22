import { NextResponse } from "next/server";
import { STOCK } from "@/lib/social/stock";

/*
 * Catalogue des vidéos de personnes, lu par l'agent social (backend) au
 * moment d'écrire un Reel : il ne peut choisir qu'un id qui existe ici.
 */
export function GET() {
  return NextResponse.json(STOCK.map(({ id, description, brands }) => ({ id, description, brands })));
}
