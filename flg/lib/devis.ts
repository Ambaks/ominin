export const clientTypes = ["Architecte / maître d'œuvre", "Entreprise du bâtiment", "Collectivité / copropriété", "Industrie", "Particulier"] as const;

export const projectTypes = [
  "Charpente",
  "Plafond / poutres",
  "Auvent / préau",
  "Façade",
  "Industrie",
  "Autre",
] as const;

export const surfaceRanges = ["Moins de 50 m²", "50 à 200 m²", "200 à 500 m²", "Plus de 500 m²"] as const;

export const timings = ["Dès que possible", "Sous 3 mois", "Plus tard / à planifier"] as const;

/** Délai de réponse promis partout sur le site. */
export const responseTime = "24 h";

/** Longueurs maximales acceptées par /api/devis. */
export const maxLength = { field: 200, message: 4000 } as const;

/** Demandes acceptées par adresse IP et par fenêtre, sur une instance. */
export const rateLimit = { max: 5, windowMs: 10 * 60_000 } as const;
