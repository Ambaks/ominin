import { NextResponse } from "next/server";
import { clipProvider } from "@/lib/clip/provider";
import { providerUnavailable, requireClipUser } from "@/lib/clip/server";

/*
 * Métriques d'une publication : lecture en direct chez le prestataire via
 * provider_request_id, sans snapshot local — même politique que la route
 * analytics de profil. Une ligne jamais soumise renvoie un tableau vide.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/clip/posts/[id]/analytics">
) {
  const auth = await requireClipUser();
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;
  const { id } = await ctx.params;

  // La RLS restreint la lecture aux lignes du clipper courant.
  const { data: post } = await supabase
    .from("clip_posts")
    .select("provider_request_id")
    .eq("id", id)
    .maybeSingle();
  if (!post) {
    return NextResponse.json(
      { error: "Publication introuvable." },
      { status: 404 }
    );
  }
  if (!post.provider_request_id) {
    return NextResponse.json({ analytics: [] });
  }

  try {
    const analytics = await clipProvider.getPostAnalytics(
      post.provider_request_id
    );
    return NextResponse.json({ analytics });
  } catch (cause) {
    return providerUnavailable(cause);
  }
}
