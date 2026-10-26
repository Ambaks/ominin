import type { OpeningHours } from "@/lib/collect/hours";
import type { CategoryLayout, MenuCategory, OptionGroup, RuleHours } from "@/lib/menu-data";
import type { VisiteId } from "./visites";

export type Offre = "digital" | "smart" | "connect";
export type Role = "gerant" | "cuisinier" | "serveur";
/**
 * Sur place : en_attente (à encaisser) → payee (à servir, partie en cuisine)
 * → servie (close) ; en fast food, payee → prete → servie (remise au
 * comptoir). Collect : en_attente → en_preparation → prete → retiree.
 */
export type OrderStatus =
  | "en_attente"
  | "en_preparation"
  | "prete"
  | "servie"
  | "payee"
  | "annulee"
  | "retiree";
export type OrderType = "sur_place" | "collect";
export type PaymentMode = "especes" | "carte" | "en_ligne" | "mixte";
/** D'où vient une ligne suggérée par l'accord du chef (order_items.accord). */
export type AccordSource = "panier" | "fiche" | "formule";
/** Modes qu'un serveur choisit au comptoir ; l'en ligne, lui, est subi. */
export type EncaissementMode = Extract<
  PaymentMode,
  "especes" | "carte" | "mixte"
>;
/** Mode d'une jambe de règlement : « mixte », c'est deux jambes, jamais une. */
export type PaymentLeg = Exclude<PaymentMode, "mixte">;
/** Fournisseur du paiement à table, au choix du gérant. */
export type PaymentProvider = "stripe" | "sumup" | "square" | "demo";
/**
 * Restaurant : le client commande depuis sa table, la salle la lui apporte.
 * Fast food : il retire au comptoir et reçoit un numéro du jour ; la table
 * du QR, s'il en scanne une, reste notée.
 */
export type ServiceMode = "restaurant" | "fast_food";

/**
 * Ce qu'un restaurant a sous la main : les vues de son espace et ce qu'elles
 * contiennent. L'offre souscrite en ouvre le lot habituel, les réglages
 * d'Ominin l'ajustent restaurant par restaurant. Le menu et les formules ne
 * s'y trouvent pas : sans carte, aucun produit ne sert à rien.
 */
export type Feature =
  | "qr"
  | "apercu"
  | "commandes"
  | "retraits"
  | "paiements"
  | "tables"
  | "badgeage"
  | "terminaux"
  | "options"
  | "roles"
  | "prise_commande"
  | "appel_serveur"
  | "apercu_serveur"
  | "assignation"
  | "groupes_tables"
  | "pourboires"
  | "equipe_sans_comptes"
  | "produits"
  | "lien_heures"
  | "fidelite"
  | "soirees";

/**
 * Étapes de l'onglet Commandes. Lesquelles s'affichent, et dans quel ordre,
 * se règle par restaurant : c'est là que se lit si l'on encaisse au début ou
 * à la fin du repas.
 */
export type OrderTab = "a_encaisser" | "a_servir" | "historique";

/** Produits actifs sur l'établissement : ils déterminent les capacités. */
export interface ActiveProducts {
  /** Offre menu & salle souscrite, ou null pour un click & collect seul. */
  offre: Offre | null;
  collect: boolean;
}

/** Actions soumises au rôle de l'utilisateur. */
export type Action =
  | `orders.setStatus:${Exclude<OrderStatus, "en_attente">}`
  | "menu.edit"
  | "menu.availability"
  | "formules.edit"
  | "categories.edit"
  | "etablissement.edit"
  | "fermetures.basculer"
  | "soirees.edit";

export interface Etablissement {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  address: string;
  phone: string;
  hours: string;
  /** Horaires structurés (créneaux du click & collect) ; null tant qu'ils ne sont pas saisis. */
  openingHours: OpeningHours | null;
  /** Null quand l'établissement n'a que le click & collect. */
  offre: Offre | null;
  serviceMode: ServiceMode;
  /** Fast food : la table du QR s'affiche à l'équipe à côté du numéro. */
  showTableNumber: boolean;
  /** Fast food : prête, le client montre un code que l'équipe scanne pour la lui remettre. */
  barPickup: boolean;
  /** Catégories du menu QR : barre en haut ou rail d'icônes à gauche. */
  categoryLayout: CategoryLayout;
  siret?: string;
  /** Le menu QR propose le règlement par carte (compte de paiement relié). */
  onlinePayment: boolean;
  /** Null tant que le gérant n'a pas choisi ⇒ comportement Stripe historique. */
  paymentProvider: PaymentProvider | null;
  /** Relié à une caisse par HubRise : l'espace lui envoie ses encaissements et ses remises. */
  hubriseConnected: boolean;
  /** Commandes collect max par créneau de retrait (défaut 5). */
  collectSlotCapacity: number;
  /** Durée d'un créneau de retrait, en minutes (posée par Ominin). */
  collectSlotMinutes: number;
  /**
   * Sous ce total, le client règle au comptoir (le click & collect refuse la
   * commande) ; null ⇒ aucun minimum.
   */
  onlineMinOrder: number | null;
  /**
   * Un code d'accès est posé : l'espace démarre alors en vue salle sur chaque
   * appareil, et les écrans du gérant se déverrouillent au code. Sans code,
   * rien ne change.
   */
  adminPinSet: boolean;
  /** Un code distinct de quatre chiffres protège chaque encaissement. */
  paymentPinSet: boolean;
  /** Lien « laisser un avis » de la fiche Google Business, proposé en bas du menu QR. */
  googleReviewUrl?: string;
}

export interface OrderItemOption {
  groupName: string;
  choiceName: string;
  supplement: number;
}

export interface OrderItem {
  id: string;
  itemId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  options?: OrderItemOption[];
  /** Mode de règlement de la ligne ; absent tant qu'elle n'est pas encaissée. */
  paidMode?: PaymentMode;
  /** ISO — absent tant que la ligne n'est pas arrivée à table. */
  servedAt?: string;
  /** Points payés par unité : la ligne est offerte par la fidélité. */
  loyaltyPoints?: number;
  /** Ajoutée sur une suggestion de l'accord du chef ; absente, commandée depuis la carte. */
  accord?: AccordSource;
}

/**
 * Détail d'un règlement qui touche les espèces : ce que le client a tendu, la
 * monnaie qu'on lui a rendue, et sa part en espèces quand il partage son
 * addition entre le liquide et la carte.
 */
export interface CashDetails {
  cashGiven: number;
  cashChange: number;
  /** Part réglée en espèces d'un règlement mixte, pourboire compris. */
  cashAmount?: number;
}

/**
 * Une jambe de règlement : ce qu'un mode a encaissé sur la commande. Un
 * paiement mixte en pose deux, un mode unique une seule. Les montants sont
 * hors pourboire — celui-là vit sur tipAmount, d'où le partage par serveur
 * le relève.
 */
export interface OrderPayment {
  mode: PaymentLeg;
  amount: number;
  /** Espèces seules : ce que le client a tendu et ce qu'on lui a rendu. */
  cashGiven?: number;
  cashChange?: number;
  paidAt: string;
}

export interface Order {
  id: string;
  type: OrderType;
  tableId: string | null;
  /** Numéro du jour d'une commande fast food ; la table du QR peut s'y ajouter (tableId). */
  orderNumber?: number;
  status: OrderStatus;
  createdAt: string;
  items: OrderItem[];
  paymentMode?: PaymentMode;
  paidOnline?: boolean;
  /** ISO — le client a choisi de régler en ligne ; absent au comptoir ou après abandon. */
  onlinePaymentStartedAt?: string;
  customerName?: string;
  customerPhone?: string;
  /** Le mot du client (inscription sur le gâteau, allergie…), click & collect. */
  customerNote?: string;
  pickupAt?: string;
  /** Prête vers (ISO) — posée à l'acceptation d'une commande collect « dès que possible ». */
  estimatedReadyAt?: string;
  /** ISO — remise au client (commande numérotée), par le scan de son code ou au comptoir. */
  handedOverAt?: string;
  cashGiven?: number;
  cashChange?: number;
  tipAmount?: number;
  /** Jambes de règlement, source des totaux par mode. */
  payments: OrderPayment[];
  /** Serveur qui a encaissé : c'est à lui que revient le pourboire. */
  staffId?: string | null;
}

export interface Table {
  id: string;
  number: number;
  /** Serveur qui tient la table, quand l'affectation est ouverte. */
  staffId: string | null;
  /** Tables réunies sous une même addition : identifiant du groupe. */
  groupId: string | null;
}

export interface Member {
  userId: string;
  email: string;
  role: Role;
  displayName: string | null;
}

/**
 * Quelqu'un qui travaille ici, avec ou sans compte. C'est la fiche que le
 * planning et les badgeages désignent : en salle, un serveur n'a pas besoin
 * d'adresse e-mail pour figurer au planning ni pour pointer.
 */
export interface Staff {
  id: string;
  name: string;
  role: Role;
  /** Compte associé, s'il en a un. */
  userId: string | null;
  /** Jeton de son lien de planning, à lui transmettre une fois. */
  planningToken: string;
  /** Un code de badgeage est posé : la badgeuse le demande avant la signature. */
  codeSet: boolean;
  /** Masquée : hors badgeuse, planning et affectation, sans être supprimée. */
  hidden: boolean;
}

export interface Article {
  id: string;
  name: string;
  detail?: string;
  supplement: number;
  itemId?: string;
  options?: OptionGroup[];
}

export interface Etape {
  id: string;
  name: string;
  obligatoire: boolean;
  /**
   * Toute une catégorie de la carte : ses articles du moment sont des choix,
   * ceux qu'on y ajoutera plus tard compris. `articles` s'y ajoute.
   */
  categoryId?: string;
  /** Articles de la catégorie retirés de l'étape. */
  exclus?: string[];
  /** Supplément d'un article de la catégorie, par son id ; absent ⇒ 0. */
  supplements?: Record<string, number>;
  articles: Article[];
}

export interface Formule {
  id: string;
  name: string;
  description?: string;
  price: number;
  disponible: boolean;
  /** Jours de service où elle est proposée (1 = lundi … 7) ; absent = tous. */
  days?: number[];
  /** Ses heures (« 09:00:00 » → « 10:30:00 ») ; absent = toute la journée. */
  hours?: RuleHours;
  etapes: Etape[];
  /** Son emplacement sur une affiche des offres (rang 1 = à gauche) ; absent ⇒ tuile. */
  affiche?: { id: string; rang: number };
}

/** Un visuel téléversé qui présente `offres` formules côte à côte. */
export interface Affiche {
  id: string;
  image: string;
  offres: number;
}

/** Mois offerts de l'offre : leur ouverture, et le verdict rendu à leur terme. */
export interface OffreTrial {
  startedAt: string;
  /** true ⇒ abonnement à 0 € acquis ; false ⇒ dû ; null ⇒ pas encore tranché. */
  feeExempt: boolean | null;
  /** Abonnement Stripe souscrit : les mensualités, si dues, sont payées. */
  subscribed: boolean;
}

export interface GestionState {
  etablissement: Etablissement;
  /** Statut Stripe de l'abonnement offre ("active", "past_due"…) ; null ⇒ jamais souscrit. */
  subscriptionStatus: string | null;
  /** Null ⇒ offre sans mois offerts (Digital, click & collect seul). */
  offreTrial: OffreTrial | null;
  /** Statut Stripe de l'abonnement click & collect. */
  collectSubscriptionStatus: string | null;
  userId: string;
  role: Role;
  /** Visites guidées déjà vues ; null ⇒ compte jamais inscrit aux visites. */
  visitesVues: VisiteId[] | null;
  /** Capacités résolues : l'offre, ajustée par les réglages d'Ominin. */
  features: Record<Feature, boolean>;
  /** Étapes de l'onglet Commandes, dans l'ordre voulu par le restaurant. */
  orderTabs: OrderTab[];
  /** Heure locale où bascule la journée de service (0 = minuit) : un bar
   *  qui ferme à 3h compte sa soirée entière sur un seul jour. */
  dayEndHour: number;
  /** Heure (Paris) où les numéros fast food repartent de 1 ; inconnue sans réglages. */
  orderNumberResetHour: number | null;
  members: Member[];
  /** Équipe au sens du service : comptes et serveurs sans compte confondus. */
  staff: Staff[];
  categories: MenuCategory[];
  formules: Formule[];
  /** Affiches des offres, de la plus ancienne à la plus récente. */
  affiches: Affiche[];
  /** Tarifs planifiés du restaurant, du plus récent au plus ancien. */
  priceRules: PriceRule[];
  /** Fermetures, de la plus ancienne à la plus récente. */
  closures: Closure[];
  tables: Table[];
  orders: Order[];
}

/** Sens de l'écart : le prix monte ou il descend. */
export type PriceRuleDirection = "majoration" | "remise";
/** L'écart s'exprime en euros ou en pourcentage du prix de base. */
export type PriceRuleUnit = "montant" | "pourcentage";

/**
 * Ce qu'un tarif planifié ou une fermeture vise. Une catégorie entière, ou un
 * article nommé — jamais les deux à la fois. Viser la catégorie fait hériter
 * les articles qu'on y ajoutera plus tard ; viser l'article permet, pour un
 * tarif, de l'excepter de la règle de sa catégorie (le plus précis l'emporte).
 */
export type MenuTarget =
  | { kind: "category"; id: string }
  /** `choiceId` : un seul format de l'article (tarifs seulement), le verre et pas la bouteille. */
  | { kind: "item"; id: string; choiceId?: string };

/**
 * Un tarif planifié : un écart de prix qui revient chaque semaine, les jours
 * dits, sur les articles visés. Le prix de la carte ne bouge pas — l'écart se
 * calcule à la lecture, et cesse dès que la règle s'arrête.
 */
export interface PriceRule {
  id: string;
  name: string;
  direction: PriceRuleDirection;
  unit: PriceRuleUnit;
  value: number;
  /** Jours ISO : 1 = lundi … 7 = dimanche. */
  days: number[];
  /** "19:00" — null avec endsAt pour « toute la journée ». */
  startsAt: string | null;
  /** Antérieur à startsAt ⇒ le créneau passe minuit et tient de la veille. */
  endsAt: string | null;
  actif: boolean;
  targets: MenuTarget[];
}

/** Une plage d'horaire de fermeture, les jours où elle revient. */
export interface ClosureWindow {
  /** Jours ISO : 1 = lundi … 7 = dimanche. */
  days: number[];
  /** "22:00". */
  startsAt: string;
  /** null ⇒ jusqu'à la fin de la journée de service. */
  endsAt: string | null;
}

/**
 * Une fermeture : une partie de la carte que le client ne commande plus, à
 * heure fixe ou d'un geste pendant le service. Tout se lit en heure de
 * service (lib/gestion/fermetures.ts) : la journée repart ouverte à la
 * bascule, et le forçage à la main cède au prochain changement de
 * l'horaire.
 */
export interface Closure {
  id: string;
  /** « Cuisine », « Bar » : ce que l'équipe lit sur son bouton. */
  name: string;
  /** Vide ⇒ fermeture à la main seulement. */
  windows: ClosureWindow[];
  /** Les plages disent quand c'est servi (coupé en dehors), sinon quand c'est coupé. */
  openWindows: boolean;
  /** Fermée (true) ou rouverte (false) à la main jusqu'à overrideUntil. */
  overrideClosed: boolean | null;
  /** Heure de service où le forçage cède à l'horaire, "2026-10-13T19:00:00". */
  overrideUntil: string | null;
  targets: MenuTarget[];
}
