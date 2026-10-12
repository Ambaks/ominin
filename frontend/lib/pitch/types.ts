/*
 * La forme d'un pitch, au siège d'une enseigne ou à un restaurant seul : ce
 * que la présentation (components/pitch/slides) et la page privée
 * (components/pitch/page-sections) lisent. Chaque client a son module
 * (lib/pitch/<slug>.ts), le même récit à ses chiffres, sa carte et ses mots ;
 * S nomme ses sources.
 */

export interface Source {
  short: string;
  full: string;
  url?: string;
  /** Le lien tel que l'imprime la diapositive des sources, quand le domaine seul ne mène pas à la page. */
  display?: string;
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

/** Les captures des démos, public/pitch/<slug>/ ; « comptoir » est l'écran du personnel, comptoir ou salle. */
type ScreenId = "menu" | "composer" | "commande" | "suivi" | "comptoir" | "poster" | "posterVertical";

/**
 * Les écrans d'un parcours seulement : « C'est prêt ! » du fast food, la vue
 * réseau d'une enseigne, la carte ouverte sur un plat à partager.
 */
type OptionalScreenId = "prete" | "reseau" | "partage";

interface Shot {
  src: string;
  alt: string;
}

/** Une zone d'une capture, en px CSS de la capture. */
export interface Crop {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Ce que le ticket de la couverture dit autour du numéro : à table, la table et son service. */
export interface TicketWording {
  label: string;
  prefix: string;
  foot: string;
}

export interface Demo {
  id: "carte" | "comptoir" | "salle" | "emporter" | "reseau";
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
  /**
   * Une règle pour les titres : le mot d'accent de chacun en aplat (.mark),
   * à toutes les sections — pour vos clients, l'équipe, chez vous, la
   * proposition, la conclusion — ; les citations gardent leur seconde ligne
   * en couleur.
   */
  titleMarks?: boolean;
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
  /** Le nom du PDF une fois téléchargé ; absent ⇒ le lien l'ouvre dans le navigateur. */
  deckPdfName?: string;
  deckFooter: string;
  /**
   * Le PDF se lira au téléphone : dans la présentation, les sources passent
   * à 24 px, sur deux diapositives.
   */
  deckLargeText?: boolean;
  pitchDate: string;
  /**
   * Les démos, dans l'ordre du parcours d'une commande : la carte, l'écran
   * du personnel (comptoir ou salle), puis les autres (la vente à emporter,
   * la vue réseau d'une enseigne). La vue du siège retrouve la sienne par
   * son id, « reseau ».
   */
  demos: readonly [Demo, Demo, ...Demo[]];
  demoDisplayUrl: string;
  contact: { email: string; mailto: string };
  screens: Record<ScreenId, Shot> & Partial<Record<OptionalScreenId, Shot>>;
  /** Le ticket de la couverture ; absent ⇒ « Votre numéro », à retirer au comptoir. */
  ticket?: TicketWording;
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
    /** eyebrow : le libellé au-dessus du chiffre, quand il ne relève plus du titre de la section. */
    speed: { eyebrow?: string; value: string; label: string; detail: string };
    closing: string;
    /** Des photos de l'enseigne, sous le slogan. */
    photos?: Shot[];
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
    /** Des avis cités mot pour mot, avec leur note : à côté de la citation. */
    voices?: { text: string; stars: 1 | 2 | 3 | 4 | 5 }[];
    facts: { value: string; text: string; source: S }[];
  };
  solution: {
    eyebrow: string;
    title: Accented;
    /** crop : la zone de la capture que la présentation montre, plus grande, au lieu du téléphone entier. */
    steps: { title: string; text: string; screen: ScreenId | OptionalScreenId; crop?: Crop }[];
    note: string;
  };
  /** Le bandeau de l'estimateur sous un point « pour vos clients » marqué eta. */
  etaNotice?: { tag: string; text: string };
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
    /** Les unités des durées (« s », « min ») dans la police du texte : celle des chiffres n'a que des capitales. */
    unitsInText?: boolean;
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
    /** La question du scan sous les points de la diapositive, et non sous la proposition. */
    scanOnSlide?: boolean;
    /** Au téléphone, la page montre ce recadrage de l'écran (un plat lisible) au lieu du téléphone entier. */
    mobileCrop?: Crop;
    /** L'écran du téléphone à côté ; absent ⇒ le plat composé. */
    screen?: ScreenId | OptionalScreenId;
    sources: S[];
  };
  forTeams: {
    eyebrow: string;
    title: Accented;
    points: Point[];
    simple: string;
    caption: string;
    /**
     * Ce que la page montre de l'écran du personnel (capture de 1 180 × 820) :
     * en bureau, au téléphone. Absent ⇒ la première rangée du comptoir, et
     * au téléphone sa commande prête. deck : ce qu'en garde la présentation,
     * absent ⇒ l'écran entier.
     */
    crops?: { desktop: Crop; mobile: Crop; deck?: Crop };
    sources: S[];
  };
  /** Le calcul de la vente à emporter ; absent ⇒ ni diapositive ni section. */
  forRevenue?: {
    eyebrow: string;
    title: string;
    mechanism: string;
    illustrationLabel: string;
    rateNote: string;
    sum: { value: string; unit: string; text: string }[];
    beyond: string;
    sources: S[];
  };
  /** La vue du siège : pour une enseigne, pas pour un restaurant seul. */
  forHeadOffice?: {
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
  /** Le prix, son exemple et la comparaison ; absent ⇒ ni diapositive ni section. */
  pricing?: {
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
    /** La fin du titre, en aplat (titleMarks). */
    titleAccent?: string;
    pilot: { title: string; lead: string; points: string[] };
    network: { title: string; lead: string; points: string[] };
    /** vendor : la comparaison avec le QR de leur éditeur, sous les mesures, en évidence. */
    measures: { title: string; lead: string; points: string[]; sources: S[]; vendor?: string };
    /** Ce que coûte l'essai, sous les trois colonnes. */
    trial?: string;
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
    /** Sous le bureau, le ticket du héros sous le texte (téléphone) ou dans le texte (tablette), et les chiffres serrés contre leur libellé. */
    compactHero?: boolean;
    /** La conclusion ouvre aussi la démo d'un bouton, son adresse dessous : seul au téléphone, sous le QR sur grand écran. */
    closingDemoButton?: boolean;
    /** La troisième carte de la proposition (les mesures) pleine comme les deux autres, comme dans la présentation. */
    measuresFilled?: boolean;
    /** Les liens « Ouvrir la démo » en boutons à contour, des cibles qui se voient au téléphone ; l'adresse en texte à côté du bouton « Écrire ». */
    linkButtons?: boolean;
  };
}
