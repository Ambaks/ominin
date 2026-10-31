/*
 * Le seul point où une erreur devient une phrase (UX-SIMPLICITE § 3.9).
 * Trois familles : réseau (on réessaie), droit (on demande au gérant),
 * donnée (on corrige le champ, ou on recharge). Les erreurs arrivent sous
 * toutes les formes : Error, PostgrestError { code, message, details, hint },
 * Response, chaîne — et souvent déjà réduites à leur message par l'API.
 */

export type ErrorFamily = "reseau" | "droit" | "donnee";

export interface ErrorDescription {
  family: ErrorFamily;
  title: string;
  text: string;
  /** Réessayer a un sens : la cause est passagère. */
  retry: boolean;
  /** Titre et texte en une phrase, pour un toast. */
  message: string;
}

interface ErrorShape {
  message: string;
  code: string;
  status: number | null;
  details: string;
  hint: string;
  typeError: boolean;
}

const RESEAU = /fetch|network|réseau|reseau|timeout|timed out|time out|délai|offline|hors connexion|load failed|econn|socket|connexion/i;
const RESEAU_CODES = new Set(["PGRST000", "PGRST001", "PGRST003", "57014", "08000", "08003", "08006"]);
const RESEAU_STATUS = new Set([0, 408, 502, 503, 504]);
const SESSION = /jwt|token|session|expired|expiré|not authenticated|non connecté|invalid claim/i;
const DROIT = /permission|policy|row-level security|rls|42501|réservé|reserve|unauthori[sz]ed|forbidden|non autorisé|insufficient_privilege|\b401\b|\b403\b/i;
const DROIT_CODES = new Set(["42501", "PGRST301", "PGRST302"]);
const DROIT_STATUS = new Set([401, 403]);
const UNIQUE = /duplicate key|unique constraint|already exists|existe déjà/i;
const NOT_NULL = /not-null|null value in column|ne peut pas être vide/i;
const CHECK = /check constraint|violates check/i;
const FOREIGN = /foreign key|still referenced|encore utilisé/i;
const SYNTAX = /invalid input syntax|value too long|out of range|numeric field overflow|malformed/i;
const NOT_FOUND = /introuvable|not found|no rows|0 rows/i;
/* Une phrase française lisible, écrite pour l'écran par un métier (RPC,
   HubRise, Popina) : commence par une majuscule, contient un espace, finit
   par une ponctuation ou dépasse READABLE_MIN_LENGTH ; sans jargon SQL,
   identifiant ni jeton de code. Elle devient le titre, telle quelle. */
const SENTENCE_START = /^[A-ZÀ-Ý«]/;
const SENTENCE_END = /[.!?»]$/;
const CODE_LIKE = /[_{}<>[\]`=\\]|\w\.\w/;
const TECHNICAL = /violates|constraint|syntax|column|relation|null value|duplicate key|pgrst|jwt|\bsql\b|exception|undefined|null$|\[object/i;
/** Sans ponctuation finale, une phrase se reconnaît à sa longueur ; au-delà du plafond, c'est un journal, pas un titre. */
const READABLE_MIN_LENGTH = 25;
const READABLE_MAX_LENGTH = 180;

function readable(text: string): boolean {
  if (text.length > READABLE_MAX_LENGTH || !SENTENCE_START.test(text) || !/\s/.test(text)) return false;
  if (TECHNICAL.test(text) || CODE_LIKE.test(text)) return false;
  return SENTENCE_END.test(text) || text.length > READABLE_MIN_LENGTH;
}

/** Colonnes qu'un détail Postgres nomme (« Key (name)=(x) »), dans les mots du gérant. */
const COLUMN_LABELS: Record<string, string> = {
  name: "le nom",
  nom: "le nom",
  title: "le titre",
  email: "l'adresse e-mail",
  phone: "le téléphone",
  slug: "l'adresse de la page",
  code: "le code",
  price: "le prix",
  price_cents: "le prix",
  quantity: "la quantité",
  date: "la date",
  day: "le jour",
  start_at: "l'heure de début",
  end_at: "l'heure de fin",
  table_number: "le numéro de table",
  display_name: "le prénom",
};

function fieldOf(shape: ErrorShape): string | null {
  const key = `${shape.details} ${shape.message}`.match(/\(([a-z_]+)\)=|column "([a-z_]+)"|colonne « ([a-z_]+) »/i);
  const column = key?.[1] ?? key?.[2] ?? key?.[3];
  return column ? (COLUMN_LABELS[column.toLowerCase()] ?? null) : null;
}

function shapeOf(error: unknown): ErrorShape {
  const shape: ErrorShape = { message: "", code: "", status: null, details: "", hint: "", typeError: error instanceof TypeError };
  if (typeof error === "string") {
    shape.message = error;
    return shape;
  }
  if (error instanceof Response) {
    shape.status = error.status;
    shape.message = error.statusText;
    return shape;
  }
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    // Une erreur enveloppée ({ error }) ou chaînée (cause) : on lit la plus profonde.
    const inner = record.error ?? record.cause;
    if (inner && typeof inner === "object") return shapeOf(inner);
    if (typeof record.message === "string") shape.message = record.message;
    if (typeof record.code === "string") shape.code = record.code;
    if (typeof record.details === "string") shape.details = record.details;
    if (typeof record.hint === "string") shape.hint = record.hint;
    const status = record.status ?? record.statusCode;
    if (typeof status === "number") shape.status = status;
    if (error instanceof Error && error.name === "AbortError") shape.message ||= "timeout";
  }
  return shape;
}

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const describe = (family: ErrorFamily, title: string, text: string, retry: boolean): ErrorDescription => ({
  family,
  title,
  text,
  retry,
  message: text ? `${title}${SENTENCE_END.test(title) ? " " : ". "}${text}` : title,
});

export function describeError(error: unknown): ErrorDescription {
  const shape = shapeOf(error);
  const { message, code, status } = shape;
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;

  if (offline) return describe("reseau", "Hors connexion", "Vérifiez le réseau, puis réessayez.", true);
  if (shape.typeError || RESEAU_CODES.has(code) || (status !== null && RESEAU_STATUS.has(status)) || RESEAU.test(message)) {
    return describe("reseau", "Connexion perdue", "Vérifiez le réseau, puis réessayez.", true);
  }

  if (status === 401 || code === "PGRST301" || SESSION.test(message)) {
    return describe("droit", "Session expirée", "Reconnectez-vous, puis reprenez où vous en étiez.", false);
  }
  if (DROIT_CODES.has(code) || (status !== null && DROIT_STATUS.has(status)) || DROIT.test(message)) {
    return describe("droit", "Réservé au gérant", "Demandez-lui de faire ce geste, ou de vous ouvrir ce droit dans Équipe.", false);
  }

  const field = fieldOf(shape);
  if (code === "23505" || status === 409 || UNIQUE.test(message)) {
    return describe("donnee", field ? `${capital(field)} existe déjà` : "Ce nom existe déjà", "Choisissez-en un autre.", false);
  }
  if (code === "23502" || NOT_NULL.test(message)) {
    return describe("donnee", "Un champ est vide", field ? `Indiquez ${field} pour enregistrer.` : "Remplissez tous les champs, puis enregistrez.", false);
  }
  if (code === "23503" || FOREIGN.test(message)) {
    return describe("donnee", "Encore utilisé ailleurs", "Retirez-le d'abord de ce qui s'en sert, puis réessayez.", false);
  }
  if (code === "23514" || code.startsWith("22") || CHECK.test(message) || SYNTAX.test(message)) {
    return describe("donnee", "Valeur refusée", field ? `Vérifiez ${field}, puis enregistrez.` : "Vérifiez les valeurs saisies, puis enregistrez.", false);
  }
  if (code === "PGRST116" || status === 404 || NOT_FOUND.test(message)) {
    return describe("donnee", "Introuvable", "Il a peut-être été supprimé entre-temps : rechargez la page.", true);
  }
  // Le message métier (RPC, HubRise, Popina), quand il est écrit pour l'écran : c'est le titre, sans préfixe.
  const sentence = message.trim();
  if (readable(sentence)) {
    const hint = shape.hint.trim();
    return describe("donnee", sentence.replace(/\.$/, ""), readable(hint) ? hint : "", false);
  }
  return describe("donnee", "Impossible d'enregistrer", "Rechargez la page et réessayez.", true);
}
