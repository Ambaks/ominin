import { NextResponse } from "next/server";
import {
  LegalVersionError,
  acceptContract,
  assertVersionsMatch,
} from "@/lib/legal/server";
import type { AcceptedTerms } from "@/lib/legal/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { getShopSession } from "@/lib/shop/server";
import { createClient } from "@/lib/supabase/server";

/*
 * Signature hors paiement : création d'établissement, et réacceptation quand
 * une nouvelle version entre en vigueur. Les signatures qui accompagnent un
 * paiement sont écrites par la route de checkout elle-même, dans la même
 * requête que la session Stripe — pas ici.
 *
 * Le corps porte les versions affichées à l'écran : si elles ne sont plus
 * celles en vigueur, le client a lu un autre texte que celui qu'il signerait,
 * et la route refuse.
 */

/** Textes non publiés : panne d'exploitation, dite une fois et lisiblement. */
function unavailable(cause: unknown) {
  if (cause instanceof LegalVersionError) {
    console.error("[legal]", cause.message);
    return NextResponse.json(
      { error: "Les conditions ne sont pas disponibles. Réessayez plus tard." },
      { status: 503 }
    );
  }
  throw cause;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentification requise." },
      { status: 401 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    versions?: Record<string, string>;
    context?: AcceptedTerms["context"];
    scope?: string;
    trainingOptOut?: boolean;
  };

  let versions;
  try {
    versions = assertVersionsMatch(body.versions);
  } catch (cause) {
    if (cause instanceof LegalVersionError) {
      return NextResponse.json({ error: cause.message }, { status: 409 });
    }
    throw cause;
  }

  const admin = createAdminClient();
  /*
   * Absent du corps ⇒ l'écran ne proposait pas le réglage, et il ne doit pas
   * être touché. Le réduire à `false` écrasait l'opposition d'un gérant qui
   * n'avait rien demandé — et la réacceptation en gravait le contraire dans
   * un relevé immuable.
   */
  const trainingOptOut =
    typeof body.trainingOptOut === "boolean" ? body.trainingOptOut : undefined;
  const context =
    body.context === "reacceptation" ? "reacceptation" : "onboarding";

  /*
   * Espace déclaré par l'écran, puis vérifié : la boutique exige d'en être la
   * propriétaire, l'établissement d'en être le gérant. Chacun ne signe que
   * pour l'espace qu'il a demandé — jamais pour celui qu'une recherche dans
   * les appartenances aurait trouvé en premier.
   */
  if (body.scope === "shop") {
    const shop = await getShopSession();
    if (!shop || shop.role !== "proprietaire") {
      return NextResponse.json(
        { error: "Seule la propriétaire peut accepter les conditions." },
        { status: 403 }
      );
    }
    try {
      await acceptContract(admin, {
        userId: shop.userId,
        signatoryEmail: shop.email || shop.shop.contact_email || shop.userId,
        scope: { kind: "shop", id: shop.shop.id, label: shop.shop.slug },
        terms: { context, versions },
        request,
      });
    } catch (cause) {
      return unavailable(cause);
    }
    return NextResponse.json({ accepted: true });
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("etablissement_id, role, etablissements(slug)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!membership || membership.role !== "gerant") {
    // Signer engage l'établissement : seul le gérant le peut.
    return NextResponse.json(
      { error: "Seul le gérant peut accepter les conditions." },
      { status: 403 }
    );
  }

  try {
    await acceptContract(admin, {
      userId: user.id,
      signatoryEmail: user.email || user.id,
      scope: {
        kind: "etablissement",
        id: membership.etablissement_id,
        label: membership.etablissements?.slug ?? membership.etablissement_id,
      },
      terms: {
        context,
        versions,
        ...(trainingOptOut !== undefined && { trainingOptOut }),
      },
      request,
    });
  } catch (cause) {
    return unavailable(cause);
  }

  // Le choix de licence suit la signature quand l'écran l'a proposé ; sinon
  // on ne touche pas à ce que le gérant avait déjà réglé.
  if (trainingOptOut !== undefined) {
    const { error } = await admin
      .from("etablissement_data_licence")
      .upsert(
        {
          etablissement_id: membership.etablissement_id,
          training_opt_out: trainingOptOut,
        },
        { onConflict: "etablissement_id" }
      );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ accepted: true });
}
