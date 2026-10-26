import { NextResponse } from "next/server";
import { KIT_DECK_PATH } from "@/lib/commercial/kit";
import { commercialAccount } from "@/lib/commercial/session";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Le deck commercial déposé par l'admin (13.2 n° 4). Servi par cette route,
 * sous l'espace, et non par une URL signée : le worker de l'espace le met en
 * cache tel quel pour le montrer hors ligne (public/commercial-sw.js). Fermé
 * après la fin du contrat, comme la policy « kit read » du stockage.
 */
export async function GET() {
  const account = await commercialAccount();
  if (!account || account.ended) {
    return NextResponse.json({ error: "Réservé aux commerciaux d'Ominin." }, { status: 403 });
  }
  const { data, error } = await createAdminClient().storage.from("commercial-docs").download(KIT_DECK_PATH);
  if (error || !data) {
    return NextResponse.json({ error: "Le deck n'est pas encore déposé." }, { status: 404 });
  }
  return new NextResponse(data, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="Ominin.pdf"',
      "Cache-Control": "private, no-cache",
    },
  });
}
