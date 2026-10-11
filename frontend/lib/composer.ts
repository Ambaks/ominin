import { composerPage, installSection, otherTills, starterKit } from "@/lib/landing-data";
import type { ServiceMode } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu-data";
import { quoteQuery } from "@/lib/quote";

/*
 * Composeur Connect : les réponses du restaurateur, les questions qu'elles
 * ouvrent, et l'offre qui en découle. Pur, pour que la page et, plus tard,
 * l'onboarding et le checkout en tirent la même commande.
 */

export type Service = ServiceMode | "both";
export type SupportId = "cachet" | "poster" | "sticker";

export interface Answers {
  hasTill: "yes" | "no" | "soon" | null;
  /** Partenaire en logo, caisse de la liste « Une autre », ou nom tapé. */
  till: string | null;
  tickets: boolean | null;
  hasPrinters: boolean | null;
  tillPrints: "yes" | "no" | "unsure" | null;
  link: "ethernet" | "wifi" | "usb" | "unsure" | null;
  buyPrinter: boolean | null;
  printerCount: number;
  /** Câble pour relier le boîtier Omilink à la box internet. */
  ethernetCable: boolean | null;
  service: Service | null;
  tables: number;
  /** Quantités des supports autres que le Cachet, qui suit les tables. */
  supports: Record<Exclude<SupportId, "cachet">, number>;
}

export const initialAnswers = (tables: number): Answers => ({
  hasTill: null,
  till: null,
  tickets: null,
  hasPrinters: null,
  tillPrints: null,
  link: null,
  buyPrinter: null,
  printerCount: 1,
  ethernetCable: null,
  service: null,
  tables,
  supports: { poster: 0, sticker: 0 },
});

export type StepId =
  | "hasTill"
  | "till"
  | "tickets"
  | "hasPrinters"
  | "tillPrints"
  | "link"
  | "printerOffer"
  | "cable"
  | "service"
  | "tables"
  | "supports";

const hasTill = (a: Answers) => a.hasTill === "yes";
const ownPrinters = (a: Answers) => a.tickets === true && a.hasPrinters === true;
const tillPrints = (a: Answers) => hasTill(a) && ownPrinters(a) && a.tillPrints === "yes";
const asksLink = (a: Answers) =>
  ownPrinters(a) && (!hasTill(a) || (a.tillPrints !== null && a.tillPrints !== "yes"));
const offersPrinter = (a: Answers) =>
  a.tickets === true &&
  (a.hasPrinters === false || (asksLink(a) && a.link === "usb"));

const suppliedPrinters = (a: Answers) =>
  offersPrinter(a) && a.buyPrinter === true ? a.printerCount : 0;
const networkPrinters = (a: Answers) =>
  asksLink(a) && a.link !== null && a.link !== "usb" && !tillPrints(a);
/** Le boîtier relie aux imprimantes celles qu'il trouve sur le réseau. */
const needsOmilink = (a: Answers) => suppliedPrinters(a) > 0 || networkPrinters(a);

const STEPS: { id: StepId; when?: (a: Answers) => boolean; done: (a: Answers) => boolean }[] = [
  { id: "hasTill", done: (a) => a.hasTill !== null },
  {
    id: "till",
    when: hasTill,
    done: (a) => Boolean(a.till?.trim()),
  },
  { id: "tickets", done: (a) => a.tickets !== null },
  { id: "hasPrinters", when: (a) => a.tickets === true, done: (a) => a.hasPrinters !== null },
  {
    id: "tillPrints",
    when: (a) => hasTill(a) && ownPrinters(a),
    done: (a) => a.tillPrints !== null,
  },
  { id: "link", when: asksLink, done: (a) => a.link !== null },
  { id: "printerOffer", when: offersPrinter, done: (a) => a.buyPrinter !== null },
  { id: "cable", when: needsOmilink, done: (a) => a.ethernetCable !== null },
  { id: "service", done: (a) => a.service !== null },
  { id: "tables", done: (a) => a.service === "fast_food" || a.tables > 0 },
  { id: "supports", done: () => true },
];

/** Les questions qu'ouvrent les réponses données, dans l'ordre. */
export const visibleSteps = (a: Answers) =>
  STEPS.filter((step) => !step.when || step.when(a));

export const tillName = (a: Answers) => (hasTill(a) ? a.till?.trim() || null : null);

/** Caisses affichées en logos : toutes couvertes par la connexion caisse. */
export const featuredTills = installSection.integrations.partners.filter(
  (partner) => partner.kind === "caisse"
);

/** Une caisse tapée hors liste est à vérifier, comme celles marquées ainsi. */
export function tillSupport(name: string): "compatible" | "check" {
  if (featuredTills.some((till) => till.name === name)) return "compatible";
  return otherTills.find((till) => till.name === name)?.support ?? "check";
}

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** Recherche dans la liste « Une autre », sans accents ni casse. */
export const searchTills = (query: string) =>
  otherTills.filter((till) => normalize(till.name).includes(normalize(query)));

/** Le nom tapé correspond-il déjà à une caisse de la liste ? */
export const isListedTill = (query: string) =>
  [...featuredTills, ...otherTills].some((till) => normalize(till.name) === normalize(query));

/*
 * Les réponses voyagent du composeur à l'onboarding dans l'URL (paramètre
 * setup), en JSON base64url : le lien survit à la confirmation par e-mail
 * et au retour OAuth, comme le devis. Elles arrivent donc d'un client et se
 * relisent champ par champ, à l'entrée comme à la lecture en base.
 */
export const SETUP_PARAM = "setup";

/** Longueur maximale d'un nom de caisse tapé à la main. */
const TILL_NAME_MAX_LENGTH = 80;

const oneOf = <T extends string>(value: unknown, options: readonly T[]): T | null =>
  options.includes(value as T) ? (value as T) : null;
const flag = (value: unknown) => (typeof value === "boolean" ? value : null);
const count = (value: unknown, min: number, fallback: number) =>
  Number.isInteger(value) && (value as number) >= min ? (value as number) : fallback;

export function parseAnswers(raw: unknown): Answers | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const supports = (r.supports && typeof r.supports === "object" ? r.supports : {}) as Record<string, unknown>;
  const till = typeof r.till === "string" ? r.till.trim().slice(0, TILL_NAME_MAX_LENGTH) : null;
  return {
    hasTill: oneOf(r.hasTill, ["yes", "no", "soon"] as const),
    till: till || null,
    tickets: flag(r.tickets),
    hasPrinters: flag(r.hasPrinters),
    tillPrints: oneOf(r.tillPrints, ["yes", "no", "unsure"] as const),
    link: oneOf(r.link, ["ethernet", "wifi", "usb", "unsure"] as const),
    buyPrinter: flag(r.buyPrinter),
    printerCount: count(r.printerCount, 1, 1),
    ethernetCable: flag(r.ethernetCable),
    service: oneOf(r.service, ["restaurant", "fast_food", "both"] as const),
    tables: count(r.tables, 0, 0),
    supports: {
      poster: count(supports.poster, 0, 0),
      sticker: count(supports.sticker, 0, 0),
    },
  };
}

export function encodeSetup(a: Answers): string {
  const bytes = new TextEncoder().encode(JSON.stringify(a));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function decodeSetup(value: string | string[] | undefined): Answers | null {
  if (typeof value !== "string" || !value) return null;
  try {
    const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
    const json = new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
    return parseAnswers(JSON.parse(json));
  } catch {
    return null;
  }
}

/** Ajoute les réponses à une requête de devis déjà sérialisée. */
export const withSetup = (query: string, a: Answers | null) =>
  a ? `${query}&${SETUP_PARAM}=${encodeSetup(a)}` : query;

/** Supports conseillés à l'arrivée sur la question, selon le service. */
export function defaultSupports(service: Service): Answers["supports"] {
  return service === "restaurant"
    ? { poster: 0, sticker: 0 }
    : { poster: 1, sticker: 0 };
}

export interface ComposerLine {
  /** lookup_key Stripe de l'article (starterKit). */
  id: string;
  label: string;
  detail?: string;
  quantity: number;
  /** Prix × quantité ; null : prix pas encore fixé, ligne non facturée. */
  amount: number | null;
}

export interface ComposerNote {
  tone: "ok" | "check";
  text: string;
}

export interface Composition {
  lines: ComposerLine[];
  total: number;
  hasPendingPrices: boolean;
  notes: ComposerNote[];
  omilink: boolean;
  suppliedPrinters: number;
  /** Suite du funnel : le devis que lisent déjà inscription et onboarding. */
  signupHref: string;
}

export function compose(a: Answers): Composition {
  const { notes: copy } = composerPage;
  const notes: ComposerNote[] = [];
  const lines: ComposerLine[] = [];
  const till = tillName(a);
  const square = a.till === "Square" && hasTill(a);

  const supplied = suppliedPrinters(a);
  const onNetwork = networkPrinters(a);
  const omilink = needsOmilink(a);

  const tables = a.service === "fast_food" ? a.tables : Math.max(a.tables, 1);
  const supportCounts = a.service ? a.supports : { poster: 0, sticker: 0 };

  const line = (
    item: { id: string; name: string; price: number | null },
    quantity: number,
    detail?: string
  ): ComposerLine => ({
    id: item.id,
    label: item.name,
    detail,
    quantity,
    amount: item.price === null ? null : item.price * quantity,
  });

  if (tables > 0) {
    lines.push({
      ...line(starterKit.cachet, tables, `${tables} × ${formatPrice(starterKit.cachet.price)}`),
      label: "Cachets imprimés",
    });
  }
  for (const id of ["poster", "sticker"] as const) {
    const count = supportCounts[id];
    if (count > 0) lines.push(line(starterKit[id], count, `× ${count}`));
  }
  if (supplied > 0) {
    lines.push(line(starterKit.printer, supplied, `${starterKit.printer.model} × ${supplied}`));
  }
  if (omilink) {
    lines.push(line(starterKit.omilink, 1));
    if (a.ethernetCable) lines.push(line(starterKit.ethernetCable, 1, starterKit.ethernetCable.model));
  }
  lines.push(line(starterKit.shipping, 1));

  if (square) notes.push({ tone: "ok", text: copy.square });
  else if (till && tillSupport(till) === "check") notes.push({ tone: "check", text: copy.otherTill(till) });
  else if (till) notes.push({ tone: "ok", text: copy.till(till) });
  if (a.hasTill === "no") notes.push({ tone: "ok", text: copy.noTill });
  if (a.hasTill === "soon") notes.push({ tone: "ok", text: copy.soonTill });

  if (a.tickets === false) notes.push({ tone: "ok", text: copy.screen });
  if (tillPrints(a)) notes.push({ tone: "ok", text: copy.tillPrints });
  if (hasTill(a) && ownPrinters(a) && a.tillPrints === "unsure" && onNetwork) {
    notes.push({ tone: "check", text: copy.tillPrintsUnsure });
  }
  if (onNetwork) notes.push({ tone: "ok", text: copy.omilink });
  if (onNetwork && a.link === "unsure") notes.push({ tone: "check", text: copy.linkUnsure });
  if (supplied > 0) notes.push({ tone: "ok", text: copy.supplied(supplied) });
  if (omilink && a.ethernetCable) notes.push({ tone: "ok", text: copy.cable });
  if (offersPrinter(a) && a.buyPrinter === false) {
    notes.push({ tone: "ok", text: a.link === "usb" ? copy.usbDeclined : copy.screen });
  }

  if (a.service === "fast_food") notes.push({ tone: "ok", text: copy.fastFood });
  if (a.service === "both") notes.push({ tone: "ok", text: copy.both });

  return {
    lines,
    total: lines.reduce((sum, line) => sum + (line.amount ?? 0), 0),
    hasPendingPrices: lines.some((line) => line.amount === null),
    notes,
    omilink,
    suppliedPrinters: supplied,
    signupHref: `/inscription?${withSetup(
      quoteQuery({ plan: "connect", tables: Math.max(tables, 1), omilink, square }),
      a
    )}`,
  };
}

/** Articles du composeur facturés en plus du devis (Cachets, boîtier, livraison). */
const EXTRA_IDS: string[] = [
  starterKit.printer.id,
  starterKit.ethernetCable.id,
  starterKit.poster.id,
  starterKit.sticker.id,
];

/**
 * Lignes du composeur à ajouter à la commande de démarrage : seulement
 * celles qui ont un prix — les autres sont « sur devis », non réglées.
 */
export const starterExtras = (a: Answers) =>
  compose(a).lines.filter(
    (line): line is ComposerLine & { amount: number } =>
      EXTRA_IDS.includes(line.id) && line.amount !== null
  );

/*
 * Les réponses en clair, question par question, pour l'équipe : l'e-mail de
 * commande de démarrage et la fiche client de l'admin. Seules les questions
 * que le parcours a posées figurent.
 */
export function describeAnswers(a: Answers): [label: string, value: string][] {
  const q = composerPage.questions;
  const asked = new Set(visibleSteps(a).map((step) => step.id));
  const rows: [string, string][] = [];
  const till = tillName(a);
  if (a.hasTill === "yes" && till) {
    rows.push(["Caisse", `${till} (${tillSupport(till) === "compatible" ? "compatible" : "à vérifier"})`]);
  } else if (a.hasTill) {
    rows.push(["Caisse", q.hasTill.options[a.hasTill]]);
  }
  if (a.tickets !== null) {
    rows.push(["Tickets", (a.tickets ? q.tickets.options.yes : q.tickets.options.no).label]);
  }
  if (asked.has("hasPrinters") && a.hasPrinters !== null) {
    rows.push(["Imprimantes", a.hasPrinters ? q.hasPrinters.options.yes : q.hasPrinters.options.no]);
  }
  if (asked.has("tillPrints") && a.tillPrints) {
    rows.push(["Caisse qui imprime", q.tillPrints.options[a.tillPrints]]);
  }
  if (asked.has("link") && a.link) rows.push(["Branchement", q.link.options[a.link].label]);
  if (asked.has("printerOffer") && a.buyPrinter !== null) {
    rows.push(["Imprimante fournie", a.buyPrinter ? `Oui × ${a.printerCount}` : "Non"]);
  }
  if (asked.has("cable") && a.ethernetCable !== null) {
    rows.push(["Câble Ethernet", a.ethernetCable ? "À fournir" : "A le sien"]);
  }
  if (a.service) rows.push(["Service", q.service.options[a.service].label]);
  rows.push(["Tables", String(a.tables)]);
  const supports = (["poster", "sticker"] as const)
    .filter((id) => a.supports[id] > 0)
    .map((id) => `${starterKit[id].name} × ${a.supports[id]}`);
  if (supports.length) rows.push(["Supports", supports.join(", ")]);
  return rows;
}
