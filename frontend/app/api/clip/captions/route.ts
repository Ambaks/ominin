import { NextResponse } from "next/server";
import { CAPTION_CONTEXT_MAX_CHARS, generateCaptions } from "@/lib/clip/captions";
import { CLIP_PLATFORMS, type ClipPlatform } from "@/lib/clip/provider/types";
import { requireClipUser } from "@/lib/clip/server";
import { rateLimit } from "@/lib/rate-limit/server";

/** Titres/descriptions générés par Claude à partir de la description du clip. */
export async function POST(request: Request) {
  const auth = await requireClipUser();
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json().catch(() => null)) as {
    context?: string;
    platforms?: string[];
  } | null;
  const context = body?.context?.trim();
  const platforms = body?.platforms?.filter((platform): platform is ClipPlatform =>
    (CLIP_PLATFORMS as readonly string[]).includes(platform)
  );
  if (!context || !platforms || platforms.length === 0) {
    return NextResponse.json(
      { error: "Décrivez votre clip et choisissez au moins une plateforme." },
      { status: 400 }
    );
  }
  if (context.length > CAPTION_CONTEXT_MAX_CHARS) {
    return NextResponse.json(
      { error: "Description trop longue (2 000 caractères maximum)." },
      { status: 400 }
    );
  }
  const limited = await rateLimit("clipCaptions", auth.user.id);
  if (limited) return limited;

  try {
    const captions = await generateCaptions(context, platforms);
    return NextResponse.json({ captions });
  } catch (cause) {
    console.error("Génération des titres impossible :", cause);
    return NextResponse.json(
      { error: "La génération des titres a échoué. Réessayez." },
      { status: 502 }
    );
  }
}
