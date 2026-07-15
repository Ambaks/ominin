import { NextResponse } from "next/server";
import { clipProvider } from "@/lib/clip/provider";
import { SIGNED_URL_TTL_SECONDS } from "@/lib/clip/provider/config";
import type { CaptionSet, ClipPlatform } from "@/lib/clip/provider/types";
import { providerUnavailable, requireClipUser } from "@/lib/clip/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Relance d'une publication en échec (ou partielle) tant que le fichier est
 * encore dans le bucket. Resoumet toutes les plateformes sélectionnées :
 * après un « partiel », la plateforme déjà servie peut recevoir un doublon —
 * limitation assumée de la v1, affichée à côté du bouton.
 */
export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/clip/posts/[id]/retry">
) {
  const auth = await requireClipUser();
  if (auth instanceof NextResponse) return auth;
  const { user, supabase } = auth;
  const { id } = await ctx.params;

  const { data: post } = await supabase
    .from("clip_posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!post) {
    return NextResponse.json(
      { error: "Publication introuvable." },
      { status: 404 }
    );
  }
  if (
    (post.status !== "echec" && post.status !== "partiel") ||
    !post.storage_path
  ) {
    return NextResponse.json(
      { error: "Cette publication ne peut pas être relancée." },
      { status: 409 }
    );
  }

  const { data: signed, error: signError } = await createAdminClient()
    .storage.from("clips")
    .createSignedUrl(post.storage_path, SIGNED_URL_TTL_SECONDS);
  if (signError || !signed) {
    return NextResponse.json(
      { error: "Le fichier du clip a expiré. Importez-le à nouveau." },
      { status: 410 }
    );
  }

  const attempt = post.attempt + 1;
  try {
    const requestId = await clipProvider.submitPost({
      username: user.id,
      videoUrl: signed.signedUrl,
      title: post.title,
      captions: (post.captions ?? {}) as CaptionSet,
      platforms: post.platforms as ClipPlatform[],
      idempotencyKey: `${post.id}:${attempt}`,
    });
    const { data: updated, error } = await supabase
      .from("clip_posts")
      .update({
        attempt,
        provider_request_id: requestId,
        status: "en_cours",
        results: null,
        published_at: null,
      })
      .eq("id", id)
      .select()
      .single();
    if (error || !updated) {
      return NextResponse.json(
        { error: error?.message ?? "Mise à jour impossible." },
        { status: 500 }
      );
    }
    return NextResponse.json({ post: updated });
  } catch (cause) {
    return providerUnavailable(cause);
  }
}
