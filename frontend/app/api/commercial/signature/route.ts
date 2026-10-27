import { NextResponse, after } from "next/server";
import { sendSignedCopy } from "@/lib/commercial/mail";
import {
  latestCommercialSignature,
  parseIdentity,
  signCommercialContract,
} from "@/lib/legal/commercial";
import { versionInForce } from "@/lib/legal/documents";
import { LegalVersionError } from "@/lib/legal/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/*
 * Signature du contrat de commercial. Le corps porte l'identité saisie et la
 * version lue à l'écran ; l'adresse e-mail, elle, est celle de l'invitation —
 * c'est à elle que l'offre a été faite (article 10.1).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: commercial, error } = await admin
    .from("commerciaux")
    .select("id, email")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!commercial) {
    return NextResponse.json(
      { error: "Cet espace est réservé aux commerciaux invités par Ominin." },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    identity?: unknown;
    version?: unknown;
  } | null;
  const parsed = parseIdentity(body?.identity, commercial.email);
  if ("missing" in parsed) {
    return NextResponse.json(
      { error: `À compléter : ${parsed.missing.join(", ")}.` },
      { status: 400 }
    );
  }

  try {
    if (body?.version !== versionInForce("commercial").version) {
      return NextResponse.json(
        { error: "Le contrat a changé depuis l'affichage de cette page. Rechargez pour le relire." },
        { status: 409 }
      );
    }
    const previous = await latestCommercialSignature(admin, commercial.id);
    if (previous?.document.version === body.version) {
      return NextResponse.json({ error: "Ce contrat est déjà signé." }, { status: 409 });
    }

    const { identity } = parsed;
    const signature = await signCommercialContract(admin, {
      userId: user.id,
      commercialId: commercial.id,
      identity,
      request,
    });
    if (!signature) {
      // Un envoi concurrent a signé entre la vérification et l'écriture.
      return NextResponse.json({ error: "Ce contrat est déjà signé." }, { status: 409 });
    }
    // La fiche suit la signature, jamais l'inverse : seul le relevé fait foi,
    // et une signature refusée ne doit rien laisser derrière elle.
    const { error: updateError } = await admin
      .from("commerciaux")
      .update({
        first_name: identity.firstName,
        last_name: identity.lastName,
        siret: identity.siret,
        address: identity.address,
        phone: identity.phone,
      })
      .eq("id", commercial.id);
    if (updateError) {
      console.error("[commercial] fiche non mise à jour", updateError.message);
    }
    // Après la réponse : Gmail lent ou en panne ne doit pas faire croire à un
    // échec d'une signature déjà enregistrée.
    after(() => sendSignedCopy(signature));
    return NextResponse.json({ signedAt: signature.acceptedAt });
  } catch (cause) {
    if (cause instanceof LegalVersionError) {
      console.error("[commercial]", cause.message);
      return NextResponse.json(
        { error: "Le contrat n'est pas disponible à la signature. Réessayez plus tard." },
        { status: 503 }
      );
    }
    throw cause;
  }
}
