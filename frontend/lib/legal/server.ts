import { isIP } from "node:net";
import type { Json } from "@/lib/supabase/database.types";
import type { createAdminClient } from "@/lib/supabase/admin";
import { findVersion, signedVersionsInForce } from "./documents";
import { documentHash, shortHash } from "./hash";
import {
  LegalVersionError,
  SIGNED_DOCS,
  type AcceptedTerms,
  type LegalDocument,
  type SignedDoc,
} from "./types";

export { LegalVersionError };

type Admin = ReturnType<typeof createAdminClient>;

/*
 * Écriture et vérification des acceptations. Tout passe par le service_role :
 * une signature que le navigateur pourrait écrire lui-même ne prouverait
 * rien. Les routes de paiement appellent acceptContract() dans la même
 * requête que la création de la session Stripe — il n'existe pas de chemin où
 * l'on paie sans avoir signé.
 */

/**
 * Périmètre engagé par la signature. `label` est recopié dans la ligne : les
 * clés étrangères tombent à null si l'établissement ou la boutique est
 * supprimé, et c'est alors lui seul qui dit ce que la signature engageait.
 */
export type LegalScope =
  | { kind: "etablissement"; id: string; label: string }
  | { kind: "shop"; id: string; label: string };

const scopeColumns = (scope: LegalScope) => ({
  scope: scope.kind,
  scope_label: scope.label,
  etablissement_id: scope.kind === "etablissement" ? scope.id : null,
  shop_id: scope.kind === "shop" ? scope.id : null,
});

/** La colonne est libre, l'en-tête ne l'est pas : un en-tête absurde ne doit
 *  pas gonfler la table de preuves. */
const USER_AGENT_MAX = 512;

/*
 * Adresse IP telle que la voit le serveur. Validée par net.isIP plutôt que
 * par une expression régulière maison : la colonne est de type inet, et une
 * adresse qu'elle refuse ferait échouer l'insertion, donc le paiement. Le
 * validateur de Node écarte aussi les formes que Postgres rejette et qu'un
 * motif écrit à la main laisse passer — « ::: », « ffff: », « 010.1.1.1 ».
 * Une preuve technique manquante vaut mieux qu'un encaissement perdu.
 */
function clientIp(request: Request): string | null {
  const candidate = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return candidate && isIP(candidate) !== 0 ? candidate : null;
}

/** Preuve technique du clic, telle que la voit le serveur. */
function requestFingerprint(request: Request) {
  return {
    ip: clientIp(request),
    user_agent:
      request.headers.get("user-agent")?.slice(0, USER_AGENT_MAX) ?? null,
  };
}

/**
 * Identifiants des versions en vigueur en base. Une version présente dans le
 * dépôt mais absente de legal_versions n'a jamais été publiée : refuser est
 * la seule réponse tenable, une acceptation sans empreinte enregistrée ne
 * prouve rien.
 */
async function versionIds(admin: Admin): Promise<Record<SignedDoc, string>> {
  const wanted = signedVersionsInForce();
  const { data, error } = await admin
    .from("legal_versions")
    .select("id, doc, version, body_sha256");
  if (error) throw new Error(error.message);

  /*
   * Toute version publiée dont le dépôt porte encore le texte doit avoir la
   * même empreinte — y compris celle annoncée en préavis, et y compris les
   * documents qui ne se signent pas. Ne vérifier que la version en vigueur
   * laissait réécrire une version future après l'envoi du préavis : les
   * clients lisaient alors un texte que l'avis reçu ne décrivait pas, et la
   * divergence n'éclatait qu'à la date d'effet, en panne.
   */
  for (const row of data ?? []) {
    const document = findVersion(row.doc, row.version);
    if (!document) continue;
    const expected = documentHash(document);
    if (row.body_sha256 !== expected) {
      throw new LegalVersionError(
        `Le texte de « ${row.doc} » ${row.version} ne correspond plus à sa version publiée ` +
          `(${shortHash(row.body_sha256)} ≠ ${shortHash(expected)}) — publier une nouvelle version.`
      );
    }
  }

  const resolved = {} as Record<SignedDoc, string>;
  for (const doc of SIGNED_DOCS) {
    const row = data?.find(
      (candidate) => candidate.doc === doc && candidate.version === wanted[doc]
    );
    if (!row) {
      throw new LegalVersionError(
        `Version « ${wanted[doc]} » du document « ${doc} » absente de legal_versions — exécuter npm run legal:publish.`
      );
    }
    resolved[doc] = row.id;
  }
  return resolved;
}

/*
 * Une version annoncée est-elle publiée ? Le dépôt peut porter une version
 * future avant que npm run legal:publish ait tourné ; l'annoncer alors — sur
 * la page publique ou dans le bandeau — ferait courir un préavis que l'e-mail
 * de l'article 9 n'a jamais donné. On n'annonce que ce qui est en base, avec
 * la même empreinte.
 */
export async function isPublished(
  admin: Admin,
  document: LegalDocument
): Promise<boolean> {
  const { data, error } = await admin
    .from("legal_versions")
    .select("body_sha256")
    .eq("doc", document.doc)
    .eq("version", document.version)
    .maybeSingle();
  return !error && data?.body_sha256 === documentHash(document);
}

/**
 * Enregistre la signature : une ligne par document signé, même horodatage,
 * même relevé de conditions. Retourne les identifiants créés pour y rattacher
 * ensuite la session Checkout.
 */
export async function acceptContract(
  admin: Admin,
  {
    userId,
    signatoryEmail,
    scope,
    terms,
    request,
    publishedVersions,
  }: {
    userId: string;
    /** Recopié : la preuve doit rester lisible après effacement du compte. */
    signatoryEmail: string;
    scope: LegalScope;
    terms: AcceptedTerms;
    request: Request;
    /** Déjà résolus par assertPublished, le cas échéant. */
    publishedVersions?: Record<SignedDoc, string>;
  }
): Promise<string[]> {
  const ids = publishedVersions ?? (await versionIds(admin));
  const { data, error } = await admin
    .from("legal_acceptances")
    .insert(
      SIGNED_DOCS.map((doc) => ({
        version_id: ids[doc],
        user_id: userId,
        signatory_email: signatoryEmail,
        ...scopeColumns(scope),
        ...requestFingerprint(request),
        terms: terms as unknown as Json,
      }))
    )
    .select("id");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.id);
}

/*
 * Rattache la session Checkout née de cette signature. Le rapprochement est
 * commode, pas essentiel : la signature est déjà écrite et la session déjà
 * ouverte quand on arrive ici. Un incident de base ne doit donc pas faire
 * échouer la requête — le client perdrait l'URL de paiement d'une commande
 * qui, côté Stripe, existe déjà. On journalise et on continue.
 */
export async function linkCheckoutSession(
  admin: Admin,
  acceptanceIds: string[],
  sessionId: string
) {
  if (!acceptanceIds.length) return;
  const { error } = await admin
    .from("legal_acceptances")
    .update({ stripe_checkout_session_id: sessionId })
    .in("id", acceptanceIds);
  if (error) {
    console.error("[legal] session non rattachée à la signature", {
      sessionId,
      acceptanceIds,
      error: error.message,
    });
  }
}

/**
 * État de signature d'un périmètre. `accepted` dit si tout ce qui court est
 * signé ; `everSigned` distingue une première signature d'une réacceptation —
 * annoncer « nos conditions ont évolué » à un client qui n'a jamais rien signé
 * serait faux.
 */
export async function acceptanceState(
  admin: Admin,
  // Une lecture n'a pas besoin du libellé : il ne sert qu'à survivre à la
  // suppression, donc à l'écriture.
  scope: Pick<LegalScope, "kind" | "id">
): Promise<{ accepted: boolean; everSigned: boolean } | null> {
  const { data, error } = await admin
    .from("legal_acceptances")
    .select("legal_versions!inner(doc, version)")
    .eq(
      scope.kind === "etablissement" ? "etablissement_id" : "shop_id",
      scope.id
    );
  if (error) {
    // État inconnu plutôt qu'erreur : l'appelant laisse alors tout ouvert.
    console.error("[legal] état de signature illisible", error.message);
    return null;
  }

  const wanted = signedVersionsInForce();
  const signed = new Set(
    (data ?? []).map((row) => {
      // La jointure !inner rend un objet, typé en tableau par le client.
      const version = row.legal_versions as unknown as {
        doc: string;
        version: string;
      };
      return `${version.doc}@${version.version}`;
    })
  );
  return {
    accepted: SIGNED_DOCS.every((doc) => signed.has(`${doc}@${wanted[doc]}`)),
    everSigned: signed.size > 0,
  };
}

/**
 * Vérifie que le client a bien signé les versions qui courent — et pas une
 * qu'il aurait gardée en cache. Le corps de requête porte les versions vues à
 * l'écran ; un décalage veut dire que le texte a changé sous ses yeux, et la
 * signature ne vaut rien.
 */
export function assertVersionsMatch(claimed: unknown) {
  const wanted = signedVersionsInForce();
  const seen = claimed as Partial<Record<SignedDoc, string>> | undefined;
  const stale = SIGNED_DOCS.filter((doc) => seen?.[doc] !== wanted[doc]);
  if (stale.length) {
    throw new LegalVersionError(
      "Les conditions ont changé depuis l'affichage de cette page. Rechargez pour les relire."
    );
  }
  return wanted;
}

/**
 * Les versions en vigueur sont-elles publiées en base ? Appelé en tête des
 * routes de paiement : la panne d'exploitation (documents non publiés) se dit
 * une fois, clairement, au lieu de surgir au milieu d'un parcours d'achat.
 * Rend les identifiants résolus, à repasser à acceptContract — sans quoi la
 * même requête les rechercherait une seconde fois.
 */
export async function assertPublished(
  admin: Admin
): Promise<Record<SignedDoc, string>> {
  try {
    return await versionIds(admin);
  } catch (cause) {
    // Toute raison de ne pas retrouver les versions revient au même pour
    // l'appelant : on ne peut rien faire signer maintenant. Y compris la
    // table absente — le front peut être déployé avant que la migration soit
    // poussée, et cette fenêtre doit rendre un état, pas une 500.
    throw cause instanceof LegalVersionError
      ? cause
      : new LegalVersionError(
          `Versions du contrat introuvables : ${
            cause instanceof Error ? cause.message : String(cause)
          }`
        );
  }
}
