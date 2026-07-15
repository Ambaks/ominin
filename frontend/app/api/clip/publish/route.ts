import { NextResponse } from "next/server";
import { clipProvider } from "@/lib/clip/provider";
import { SIGNED_URL_TTL_SECONDS } from "@/lib/clip/provider/config";
import {
  CLIP_PLATFORMS,
  type CaptionSet,
  type ClipPlatform,
} from "@/lib/clip/provider/types";
import {
  providerUnavailable,
  purgeStaleClips,
  requireClipUser,
} from "@/lib/clip/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

/*
 * Publication d'un clip déjà uploadé dans le bucket : enregistre la ligne
 * clip_posts sous la session utilisateur (RLS vérifie user_id), signe une URL
 * de lecture et la soumet au prestataire en mode asynchrone. Le statut est
 * ensuite suivi par la route status via provider_request_id.
 */
export async function POST(request: Request) {
  const auth = await requireClipUser();
  if (auth instanceof NextResponse) return auth;
  const { user, supabase } = auth;

  const body = (await request.json().catch(() => null)) as {
    path?: string;
    title?: string;
    captions?: CaptionSet;
    platforms?: string[];
  } | null;
  const title = body?.title?.trim();
  const platforms = body?.platforms?.filter(
    (platform): platform is ClipPlatform =>
      (CLIP_PLATFORMS as readonly string[]).includes(platform)
  );
  if (!body?.path || !title || !platforms || platforms.length === 0) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  // Chaque clipper ne publie que depuis son propre dossier du bucket.
  if (!body.path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Chemin invalide." }, { status: 403 });
  }
  const captions = body.captions ?? {};

  const { data: profile } = await supabase
    .from("clip_profiles")
    .select("provider_username")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) {
    return NextResponse.json(
      { error: "Connectez d'abord vos comptes depuis la page Comptes." },
      { status: 409 }
    );
  }

  const { data: post, error: insertError } = await supabase
    .from("clip_posts")
    .insert({
      user_id: user.id,
      title,
      captions: captions as Json,
      platforms,
      storage_path: body.path,
    })
    .select()
    .single();
  if (insertError || !post) {
    return NextResponse.json(
      { error: insertError?.message ?? "Enregistrement impossible." },
      { status: 500 }
    );
  }

  const admin = createAdminClient();
  // Filet 1 Go : purge des vieux objets du clipper, sans bloquer la publication.
  await purgeStaleClips(admin, user.id).catch(() => undefined);

  const { data: signed, error: signError } = await admin.storage
    .from("clips")
    .createSignedUrl(body.path, SIGNED_URL_TTL_SECONDS);
  if (signError || !signed) {
    await supabase.from("clip_posts").update({ status: "echec" }).eq("id", post.id);
    return NextResponse.json(
      { error: "Fichier du clip introuvable. Importez-le à nouveau." },
      { status: 500 }
    );
  }

  try {
    const requestId = await clipProvider.submitPost({
      username: profile.provider_username,
      videoUrl: signed.signedUrl,
      title,
      captions,
      platforms,
      idempotencyKey: `${post.id}:${post.attempt}`,
    });
    const { data: updated } = await supabase
      .from("clip_posts")
      .update({ provider_request_id: requestId })
      .eq("id", post.id)
      .select()
      .single();
    return NextResponse.json({ post: updated ?? post });
  } catch (cause) {
    await supabase.from("clip_posts").update({ status: "echec" }).eq("id", post.id);
    return providerUnavailable(cause);
  }
}
