import { NextResponse } from "next/server";
import { clipProvider } from "@/lib/clip/provider";
import { providerUnavailable, requireClipUser } from "@/lib/clip/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

/*
 * Réconciliation du statut d'une publication : interroge le prestataire tant
 * que la ligne est en_cours, fige le résultat par plateforme à l'arrivée et
 * supprime le fichier du bucket une fois tout publié (le retry n'a alors
 * plus besoin de la vidéo).
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/clip/posts/[id]/status">
) {
  const auth = await requireClipUser();
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;
  const { id } = await ctx.params;

  // La RLS restreint la lecture aux lignes du clipper courant.
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
  if (post.status !== "en_cours" || !post.provider_request_id) {
    return NextResponse.json({ post });
  }

  try {
    const status = await clipProvider.getPostStatus(post.provider_request_id);
    if (status.state === "en_cours") {
      return NextResponse.json({ post });
    }

    let storagePath = post.storage_path;
    if (status.state === "publie" && storagePath) {
      await createAdminClient().storage.from("clips").remove([storagePath]);
      storagePath = null;
    }

    const { data: updated, error } = await supabase
      .from("clip_posts")
      .update({
        status: status.state,
        results: status.results as unknown as Json,
        published_at:
          status.state === "echec" ? null : new Date().toISOString(),
        storage_path: storagePath,
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
