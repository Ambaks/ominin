import { NextResponse } from "next/server";
import { dispatchCallServer } from "@/lib/push/server";

/*
 * Appel serveur depuis le menu QR. Route publique comme /api/push/dispatch :
 * le client n'a pas de session. Inoffensive à rejouer — call_throttle borne
 * l'envoi à un appel par table par fenêtre, et la réponse ne révèle rien.
 */

interface CallBody {
  slug?: unknown;
  tableNumber?: unknown;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as CallBody | null;
  const slug = body?.slug;
  const tableNumber = body?.tableNumber;
  if (
    typeof slug !== "string" ||
    typeof tableNumber !== "number" ||
    !Number.isInteger(tableNumber) ||
    tableNumber <= 0
  ) {
    return NextResponse.json(
      { error: "Champs requis : slug, tableNumber." },
      { status: 400 }
    );
  }

  await dispatchCallServer(slug, tableNumber);
  return NextResponse.json({ ok: true }, { status: 202 });
}
