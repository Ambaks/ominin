/*
 * La forme d'un pitch au siège d'une enseigne : ce que la présentation
 * (components/pitch/slides) et la page privée (components/pitch/page-sections)
 * lisent. Chaque enseigne a son module (lib/pitch/<slug>.ts), le même récit
 * à ses chiffres, sa carte et ses mots ; S nomme ses sources.
 */

export interface Source {
  short: string;
  full: string;
  url?: string;
}

/** Un titre dont la fin est mise en valeur (aplat ou couleur d'accent). */
interface Accented {
  text: string;
  accent: string;
}

export interface Point {
  title: string;
  text: string;
}

/** Les captures des démos, public/pitch/<slug>/. */
type ScreenId =
  | "menu"
  | "composer"
  | "commande"
  | "suivi"
  | "prete"
  | "comptoir"
  | "reseau"
  | "poster"
  | "posterVertical";

export interface Demo {
  id: "carte" | "comptoir" | "reseau";
  label: string;
  title: string;
  description: string;
  href: string;
}

/** Un couloir de la course : sa durée en secondes règle la longueur de la barre. */
interface RaceLane {
  label: string;
  value: string;
  seconds: number;
}

interface Fact {
  value: string;
  label: string;
}

export interface Pitch<S extends string = string> {
  /** Chemin de la page privée ; la présentation web est à `${path}/presentation`. */
  path: string;
  /** Le nom de l'enseigne tel que le ticket l'imprime. */
  brandName: string;
  /** Le numéro du ticket en couverture : celui de la commande que suivent les captures et le film. */
  ticketNumber: number;
  /** Clé localStorage posée quand le film d'ouverture a été vu ou passé. */
  filmSeenKey: string;
  /** null ⇒ la page montre l'affiche seule, sans film d'ouverture. */
  filmSrc: string | null;
  filmVerticalSrc: string;
  /** null ⇒ lien vers la version web de la présentation. */
  deckPdfHref: string | null;
  deckFooter: string;
  pitchDate: string;
  /** Les trois démos, dans l'ordre du parcours d'une commande : carte, comptoir, réseau. */
  demos: readonly [Demo, Demo, Demo];
  demoDisplayUrl: string;
  contact: { email: string; mailto: string };
  screens: Record<ScreenId, { src: string; alt: string }>;
  sources: Record<S, Source>;
  sourcesNote: string;
  cover: {
    eyebrow: string;
    title: { first: string; second: Accented };
    lead: string;
  };
  promise: {
    eyebrow: string;
    slogan: readonly [string, string];
    sloganSource: string;
    rating: { value: string; label: string };
    speed: { value: string; label: string; detail: string };
    closing: string;
    sources: S[];
  };
  walkAway: {
    eyebrow: string;
    quote: readonly [string, string];
    /** Qui parle : le signataire, ou la source citée mot pour mot. */
    attribution: string;
    followUp: string;
    /** D'où viennent les cas cités par followUp, quand ce ne sont pas les sources des chiffres. */
    followUpSources?: S[];
    facts: { value: string; text: string; source: S }[];
  };
  solution: {
    eyebrow: string;
    title: Accented;
    steps: { title: string; text: string; screen: ScreenId }[];
    note: string;
  };
  etaNotice: { tag: string; text: string };
  /** L'estimateur IA de l'heure de retrait, en diapositive et section à part. */
  estimator?: {
    eyebrow: string;
    title: Accented;
    lead: string;
    announced: Fact;
    ready: Fact;
    verdict: string;
    points: Point[];
    screen: ScreenId;
  };
  /** Les chiffres mesurés chez un client Ominin : la course commande → ticket cuisine, et ce qui l'entoure. */
  fieldProof?: {
    eyebrow: string;
    title: Accented;
    context: string;
    raceLabel: string;
    race: readonly [RaceLane, RaceLane];
    facts: Fact[];
    takeaway: string;
    sources: S[];
  };
  forCustomers: {
    eyebrow: string;
    title: readonly [string, string];
    points: { title: string; text?: string; fact: string; eta?: boolean }[];
    /** sources : celles de la réponse, quand elle cite d'autres études que les points. */
    scan: { question: string; answer: string; pilot: string; sources?: S[] };
    sources: S[];
  };
  forTeams: {
    eyebrow: string;
    title: Accented;
    points: Point[];
    simple: string;
    caption: string;
    sources: S[];
  };
  forRevenue: {
    eyebrow: string;
    title: string;
    mechanism: string;
    illustrationLabel: string;
    rateNote: string;
    sum: { value: string; unit: string; text: string }[];
    beyond: string;
    sources: S[];
  };
  forHeadOffice: {
    eyebrow: string;
    title: string;
    lead: string;
    badge: string;
    rushKey: string;
    /** L'hypothèse de la capture (la part de commandes QR simulée), dite sous elle. */
    hypothesis?: string;
    /** Sous la capture du deck, qui n'a pas la légende des pastilles : ce que valent les délais affichés. */
    delayKey?: string;
    /** Les trois colonnes de la vue réseau ; x : leur bord gauche dans la capture, large de 1 600 px. */
    areas: { label: string; x: number }[];
    /** Le haut des panneaux dans la même capture : les recadrages de la diapositive et de la page partent de là. */
    panelsTop: number;
  };
  deployment: {
    eyebrow: string;
    title: Accented;
    lead: string;
    sources?: S[];
    points: (Point & { label: string })[];
  };
  pricing: {
    eyebrow: string;
    headline: { subscription: string; commission: string; basis: string };
    lead: string;
    example: {
      label: string;
      rateNote: string;
      lines: { label: string; value: string }[];
      totalLabel: string;
      total: string;
      share: string;
      counter: { label: string; value: string };
      extra: { label: string; value: string };
      compare: string;
    };
    comparisonTitle: string;
    comparison: { name: string; model: string }[];
    noOnline: string;
    /** Ce que chaque restaurant règle une fois, à l'installation, à côté de « rien sans commande ». */
    setup?: string;
    vat: string;
    cardFees: string;
    sources: S[];
  };
  proposal: {
    eyebrow: string;
    title: string;
    pilot: { title: string; lead: string; points: string[] };
    network: { title: string; lead: string; points: string[] };
    /** vendor : la comparaison avec le QR de leur éditeur, sous les mesures, en évidence. */
    measures: { title: string; lead: string; points: string[]; sources: S[]; vendor?: string };
  };
  closing: {
    eyebrow: string;
    title: readonly [string, string];
    steps: string[];
    mail: string;
    interlocutor: string;
    company: string;
    reference: string;
    scanTitle: string;
    scanPage: string;
    flourish: string;
    signature: string;
  };
  page: {
    heroEyebrow: string;
    heroLead: string;
    heroFacts: Fact[];
    demoTitle: string;
    demoLead: string;
    openerLabel: string;
    footer: string;
  };
}
