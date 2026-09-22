import { NextResponse } from "next/server";
import { pendingVersion, versionInForce } from "@/lib/legal/documents";
import {
  LegalVersionError,
  acceptanceState,
  assertPublished,
  isPublished,
} from "@/lib/legal/server";
import { SIGNED_DOCS, type LegalDocument } from "@/lib/legal/types";
import { getShopSession } from "@/lib/shop/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/*
 * État du contrat pour l'écran qui va le faire signer : versions en vigueur,
 * version annoncée pour plus tard s'il y en a une, et — pour un signataire
 * connu — s'il a déjà signé ce qui court. Lu à l'affichage plutôt que posé en
 * props : une version peut entrer en vigueur pendant qu'un onglet est ouvert,
 * et la case doit alors redemander l'accord.
 *
 * `published` voyage dans toutes les réponses, y compris celles d'un visiteur
 * sans établissement : c'est lui qui dit à l'écran s'il y a quelque chose à
 * faire signer. Une réponse qui l'omettrait désarmerait le bouton du parcours
 * d'inscription, où l'établissement n'existe pas encore.
 */

export async function GET(request: Request) {
  // Espace déclaré par l'écran ; l'appartenance y est vérifiée plus bas.
  const scope =
    new URL(request.url).searchParams.get("scope") === "shop"
      ? "shop"
      : "etablissement";
  const admin = createAdminClient();

  let versions: Record<string, string> | null = null;
  let pending: LegalDocument | null = null;
  let published = true;
  try {
    versions = Object.fromEntries(
      SIGNED_DOCS.map((doc) => [doc, versionInForce(doc).version])
    );
    // Publiées en base ? Sinon personne ne peut signer, et rien ne doit se
    // verrouiller : c'est une panne côté Ominin, pas une faute du client.
    await assertPublished(admin);
    // Seule une version publiée s'annonce : le préavis court de l'e-mail
    // envoyé à la publication, pas du déploiement du texte.
    for (const doc of SIGNED_DOCS) {
      const next = pendingVersion(doc);
      if (next && (await isPublished(admin, next))) {
        pending = next;
        break;
      }
    }
  } catch (cause) {
    if (!(cause instanceof LegalVersionError)) throw cause;
    console.error("[legal]", cause.message);
    published = false;
  }

  const base = {
    versions,
    published,
    pending: pending && {
      doc: pending.doc,
      version: pending.version,
      effectiveFrom: pending.effectiveFrom,
      summary: pending.summary,
    },
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(base);

  if (scope === "shop") {
    const shop = await getShopSession();
    // Pas de boutique pour cet utilisateur : rien à signer dans cet espace.
    if (!shop) return NextResponse.json({ ...base, canSign: false });
    return NextResponse.json({
      ...base,
      ...(published
        ? await acceptanceState(admin, { kind: "shop", id: shop.shop.id })
        : null),
      canSign: shop.role === "proprietaire",
    });
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("etablissement_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!membership) {
    // Compte créé, établissement pas encore : c'est l'état du parcours
    // d'inscription, et il doit pouvoir signer.
    return NextResponse.json({ ...base, canSign: true });
  }

  // Textes indisponibles : rien n'est signable, donc rien à relire — et
  // surtout rien qui doive faire échouer la réponse.
  if (!published) {
    return NextResponse.json({
      ...base,
      canSign: membership.role === "gerant",
    });
  }

  return NextResponse.json({
    ...base,
    ...(await acceptanceState(admin, {
      kind: "etablissement",
      id: membership.etablissement_id,
    })),
    canSign: membership.role === "gerant",
  });
}
