/*
 * Constantes du contrat. Elles vivent ici et non dans les documents : un
 * délai cité dans le texte et appliqué par le code doit être la même valeur,
 * sinon le contrat promet autre chose que ce que fait le produit.
 */

/**
 * Préavis avant qu'un changement de tarif prenne effet. Une version publiée
 * l'est au moins ce nombre de jours avant sa date d'effet — le script de
 * publication le vérifie. C'est ce délai, assorti de la résiliation sans
 * frais, qui tient la clause de révision : sans lui elle serait un
 * déséquilibre significatif (art. 1171 code civil).
 */
export const PRICE_NOTICE_DAYS = 30;

/**
 * Rétractation offerte sur l'abonnement. Non due en B2B, mais l'art. L221-3
 * du code de la consommation l'étend aux professionnels de cinq salariés au
 * plus pour un contrat hors de leur activité principale — terrain discuté
 * pour un logiciel de restaurant. Accordée volontairement, la question ne se
 * pose plus. Les Cachets imprimés en sont exclus : biens personnalisés
 * (art. L221-28 3°).
 *
 * Le WITHDRAWAL_DAYS de lib/shop/constants.ts porte le même nombre et n'est
 * pas le même droit : là-bas c'est la cliente d'une boutique hébergée qui
 * renvoie un bien physique, ici c'est le professionnel qui renonce à son
 * abonnement Ominin. Deux contrats, deux vendeurs, deux points de départ —
 * les fusionner ferait bouger l'un en corrigeant l'autre.
 */
export const WITHDRAWAL_DAYS = 14;

/** Chemins publics des documents, identiques sur tous les hôtes produits. */
export const LEGAL_PATHS = {
  cgv: "/cgv",
  dpa: "/sous-traitance",
  confidentialite: "/confidentialite",
  mentions: "/mentions-legales",
} as const;

/**
 * Barre de renvois vers les documents, dans l'ordre d'affichage : le texte qui
 * engage, puis ceux qui disent ce qu'on fait des données. Liste unique pour
 * les pieds de page des produits et pour les documents eux-mêmes — un
 * cinquième document s'ajoute ici et apparaît partout, plutôt que d'être
 * oublié dans un pied sur quatre.
 */
export const LEGAL_LINKS = [
  { key: "cgv", href: LEGAL_PATHS.cgv, label: "CGV" },
  {
    key: "confidentialite",
    href: LEGAL_PATHS.confidentialite,
    label: "Confidentialité",
  },
  { key: "mentions", href: LEGAL_PATHS.mentions, label: "Mentions légales" },
  { key: "dpa", href: LEGAL_PATHS.dpa, label: "Sous-traitance (RGPD)" },
] as const satisfies readonly {
  key: keyof typeof LEGAL_PATHS;
  href: string;
  label: string;
}[];

/**
 * Identité de l'éditeur. Micro-entreprise : pas de raison sociale ni de
 * capital, mais la mention « EI » est obligatoire sur tout document
 * commercial depuis le 15 mai 2022 (loi du 14 février 2022). Les valeurs
 * manquantes sont à renseigner avant publication — buildIdentity() dit
 * lesquelles.
 */
export const editor = {
  name: "Marwan Almasri",
  /** Apposée au nom sur le site, les CGV et les factures. */
  entrepreneurMention: "EI",
  status: "Entrepreneur individuel (micro-entreprise)",
  siren: process.env.NEXT_PUBLIC_OMININ_SIREN ?? "",
  rcs: process.env.NEXT_PUBLIC_OMININ_RCS ?? "",
  address: process.env.NEXT_PUBLIC_OMININ_ADDRESS ?? "",
  /** Franchise en base : aucune TVA facturée, la mention est obligatoire. */
  vatMention: "TVA non applicable, art. 293 B du CGI",
} as const;

/** Nom légal complet, mention EI comprise. */
export const editorLegalName = `${editor.name} ${editor.entrepreneurMention}`;

/** Champs d'identité encore vides — bloquent la publication, pas le build. */
export const missingIdentity = (): string[] =>
  (["siren", "rcs", "address"] as const).filter((key) => !editor[key]);

/**
 * Hébergeurs, à citer nommément (LCEN art. 6-III). Le backend FastAPI
 * (Render) sert l'OCR et les prévisions ; il traite donc lui aussi des
 * données clients.
 */
export const hosts = [
  {
    name: "Vercel Inc.",
    role: "Hébergement du site et des applications web",
    address: "340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis",
  },
  {
    name: "Supabase Inc.",
    role: "Base de données, authentification et stockage de fichiers",
    address: "970 Toa Payoh North, Singapour 318992",
  },
  {
    name: "Render Services, Inc.",
    role: "Hébergement du service applicatif (traitements de données)",
    address: "525 Brannan St, San Francisco, CA 94107, États-Unis",
  },
] as const;

/**
 * Sous-traitants ultérieurs (art. 28.2 RGPD). La colonne « entraînement »
 * dit si le prestataire réutilise les données pour entraîner ses propres
 * modèles : c'est la question que pose tout client avant de signer l'article
 * sur les données.
 */
export const subProcessors = [
  {
    name: "Supabase Inc.",
    purpose: "Base de données, authentification, stockage",
    location: "Union européenne (région eu-west)",
    training: false,
  },
  {
    name: "Vercel Inc.",
    purpose: "Hébergement et diffusion du site",
    location: "Union européenne, États-Unis (DPF)",
    training: false,
  },
  {
    name: "Render Services, Inc.",
    purpose: "Service applicatif (OCR de factures, prévisions)",
    location: "Union européenne (région Francfort)",
    training: false,
  },
  {
    name: "Stripe Payments Europe, Ltd.",
    purpose: "Encaissement des abonnements et des paiements en ligne",
    location: "Irlande",
    training: false,
  },
  {
    name: "Anthropic PBC",
    purpose: "Analyse de documents et assistance rédactionnelle (API Claude)",
    location: "États-Unis (DPF), traitement sans conservation prolongée",
    // Anthropic n'entraîne pas ses modèles sur les données transmises par
    // l'API : le client peut donc s'entendre dire, sans réserve, qu'aucun
    // tiers n'entraîne de modèle sur ses données.
    training: false,
  },
  {
    name: "Google Ireland Ltd.",
    purpose: "Acheminement des e-mails de contact (API Gmail)",
    location: "Irlande",
    training: false,
  },
] as const;
