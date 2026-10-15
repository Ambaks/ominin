import { formatPrice } from "@/lib/menu-data";
import { ANALYTICS_PERIOD_DAYS, ORDER_TAB_HINTS } from "./constants";
import { dayEndLabel } from "./fermetures";
import { isPickupShop, orderTabLabel, orderTabsShown } from "./selectors";
import type { GestionState, OrderTab } from "./types";
import { VISITES_METADATA_KEY } from "./visites-inscription";

/*
 * Visites guidées de l'espace de gestion : à son premier passage sur une
 * page, le gérant voit l'écran s'assombrir autour de ce qui compte, une
 * étape à la fois. Une visite terminée ou passée ne revient plus d'elle-même ;
 * le bouton « ? » de l'en-tête la relance. Sur la première carte de
 * l'accueil, « Passer les visites » les coupe toutes, la croix la remet
 * à la prochaine ouverture de l'espace.
 *
 * Seuls les gérants arrivés par l'inscription ou le lien gérant y sont
 * inscrits (clé posée à ce moment-là, visites-inscription.ts) : les comptes
 * d'avant ne voient rien s'ouvrir sur leur tablette.
 *
 * Une étape éclaire l'élément marqué data-visite="<cible>". Absente de
 * l'écran (capacité fermée, compte Stripe déjà relié, liste vide…) ou hors
 * de l'offre (`when`), elle est sautée ; sans cible, la carte se pose au
 * centre.
 */

export type VisiteId =
  | "bienvenue"
  | "commandes"
  | "tables"
  | "paiements"
  | "menu"
  | "menu-vide"
  | "equipe"
  | "terminaux"
  | "etablissement"
  | "produits"
  | "fidelite"
  | "notifications";

type Texte = string | ((state: GestionState) => string);

export interface VisiteStep {
  target?: string;
  title: Texte;
  body: Texte;
  /** Étape propre à certaines offres ou à certains états. */
  when?: (state: GestionState) => boolean;
  /** À côté de la cible plutôt que dessous : la barre latérale. */
  side?: boolean;
  /** Le geste montré, faisable depuis la carte : clique l'élément marqué. */
  action?: { label: string; target: string };
}

export interface Visite {
  id: VisiteId;
  steps: VisiteStep[];
}

export function texte(value: Texte, state: GestionState): string {
  return typeof value === "function" ? value(state) : value;
}

/** Visites vues d'après les métadonnées du compte, null hors inscription. */
export function parseVisitesVues(
  metadata: Record<string, unknown> | null | undefined
): VisiteId[] | null {
  const value = metadata?.[VISITES_METADATA_KEY];
  return Array.isArray(value)
    ? value.filter(
        (id): id is VisiteId =>
          typeof id === "string" && Object.hasOwn(BY_ID, id)
      )
    : null;
}

const avecCommandes = (state: GestionState) => state.features.commandes;

/**
 * Les onglets de Commandes en fast food : le client commande sans table et
 * repart avec un numéro, la commande se remet au comptoir.
 */
const COMPTOIR: Record<OrderTab, string> = {
  a_encaisser: "les commandes à régler au comptoir, article par article.",
  a_servir:
    "les commandes payées, par numéro, de la préparation à la remise au comptoir.",
  historique: "les commandes remises, retirées ou annulées.",
};

/**
 * Les onglets de Commandes d'une boutique à emporter seule : les commandes
 * du site arrivent payées, celles du comptoir s'encaissent depuis Retraits.
 */
const EMPORTER: Record<OrderTab, string> = {
  ...ORDER_TAB_HINTS,
  a_servir: "les commandes du jour payées en ligne, de la préparation au retrait.",
  historique: "les commandes retirées ou annulées.",
};

const VISITES: Record<string, Visite> = {
  "/gestion": {
    id: "bienvenue",
    steps: [
      {
        title: (state) => `Bienvenue, ${state.etablissement.name}`,
        body: "Voici votre espace de gestion. En quelques étapes, on vous montre où tout se trouve. Vous pouvez passer la visite à tout moment.",
      },
      {
        target: "stripe",
        title: "Encaisser en ligne",
        body: "Une fois Stripe relié, vos clients pourront payer par carte depuis leur téléphone. Stripe vous demande notamment une pièce d’identité et votre IBAN, puis vous ramène dans votre espace.",
        action: { label: "Relier Stripe", target: "stripe-relier" },
      },
      {
        target: "apercu-jour",
        title: "Votre journée en direct",
        body: `Les commandes en cours et le chiffre d’affaires encaissé du jour se mettent à jour en direct. Plus bas, la section Analytique détaille vos ventes sur ${ANALYTICS_PERIOD_DAYS.join(" ou ")} jours.`,
      },
      {
        target: "nav",
        side: true,
        title: "Vos onglets",
        body: "Vos pages sont ici. Après la visite, ouvrez Menu pour créer ou vérifier votre carte : chaque page a sa courte visite la première fois que vous l’ouvrez.",
      },
      {
        target: "voir-menu",
        title: (state) =>
          isPickupShop(state) ? "Votre boutique, côté client" : "Votre menu, côté client",
        body: (state) =>
          isPickupShop(state)
            ? "C’est la page où vos clients commandent à emporter. Ouvrez‑la pour la voir comme eux : un changement y apparaît dans la minute."
            : "C’est la page qu’ouvrent vos QR codes. Ouvrez‑la pour voir votre carte comme vos clients la voient : un changement y apparaît dans la minute.",
      },
      {
        target: "etablissement",
        title: "Vos réglages",
        body: (state) =>
          avecCommandes(state)
            ? "Nom, horaires, type de service, fermeture de la cuisine, paiement en ligne, commande minimum et code de la tablette : tout se règle ici, dans Établissement."
            : "Nom, slogan, adresse, horaires et lien d’avis Google : tout se règle ici, dans Établissement.",
      },
      {
        target: "aide",
        when: (state) => state.categories.length > 0,
        title: "Besoin d’un rappel ?",
        body: "Ce bouton relance la visite de la page où vous êtes. Bon service !",
      },
      {
        target: "aide",
        when: (state) => state.categories.length === 0,
        title: "Besoin d’un rappel ?",
        body: "Ce bouton relance la visite de la page où vous êtes. Prochaine étape : votre carte, dans Menu.",
        action: { label: "Créer mon menu", target: "nav-menu" },
      },
    ],
  },
  "/gestion/menu": {
    id: "menu",
    steps: [
      {
        target: "menu-vues",
        title: "Votre carte et vos formules",
        body: "Les plats d’un côté, les formules de l’autre (entrée + plat, menu du midi…). Les formules s’affichent en tête du menu client.",
      },
      {
        target: "menu-categories",
        title: "Les catégories",
        body: "Entrées, plats, desserts, boissons… Créez‑les, renommez‑les et rangez‑les dans l’ordre où vos clients les liront.",
      },
      {
        target: "menu-ajouter",
        title: "Ajouter un article",
        body: (state) =>
          state.features.options
            ? "Un plat ou une boisson : nom, prix, photo, description et options (cuisson, taille…). Il rejoint votre menu client dans la minute qui suit l’enregistrement."
            : "Un plat ou une boisson : nom, prix, photo et description. Il rejoint votre menu client dans la minute qui suit l’enregistrement.",
      },
      {
        target: "menu-article",
        title: "Chaque plat, d’un geste",
        body: (state) =>
          state.features.commandes
            ? "Un plat en rupture ? Désactivez « En vente » : il reste sur votre menu, marqué « Indisponible », et ne peut plus être commandé. Réactivez‑le dès qu’il revient. Sur la fiche : le stock, les flèches pour le déplacer, le crayon pour le modifier."
            : "Sur la fiche de chaque plat : les flèches pour le déplacer, le crayon pour le modifier.",
      },
    ],
  },
  "/gestion/commandes": {
    id: "commandes",
    steps: [
      {
        target: "commandes-fermetures",
        title: "Fermer d’un geste",
        body: (state) =>
          `Quand la cuisine s’arrête, fermez ici ce qu’elle ne sert plus : vos clients le voient « Plus servi ». Une table arrive tard ? Rouvrez ; sinon tout rouvre seul à ${dayEndLabel(state.dayEndHour)}.`,
      },
      {
        target: "commandes-etapes",
        title: "Le service, étape par étape",
        body: (state) => {
          const hints =
            state.etablissement.serviceMode === "fast_food"
              ? COMPTOIR
              : isPickupShop(state)
                ? EMPORTER
                : ORDER_TAB_HINTS;
          return orderTabsShown(state, false)
            .map(
              (tab) =>
                `« ${orderTabLabel(state, tab)} » : ${hints[tab].charAt(0).toLowerCase()}${hints[tab].slice(1)}`
            )
            .join("\n");
        },
      },
      {
        target: "commandes-direct",
        title: "En direct",
        body: "Les commandes passées depuis le menu arrivent ici d’elles-mêmes. Gardez l’espace de gestion ouvert pendant le service : chaque nouvelle commande sonne.",
      },
      {
        target: "notifications-push",
        title: "Prévenu même en veille",
        body: "Le réglage le plus utile : sans lui, une commande qui arrive pendant que l’écran est en veille passe inaperçue.",
        action: { label: "Activer", target: "notifications-activer" },
      },
      {
        target: "prise-commande",
        title: "Saisir une commande",
        body: "Un client commande sans scanner le QR code ? Appuyez sur + pour saisir sa commande : elle part en cuisine comme les autres. Un plat fermé y reste ajoutable, marqué « Fermé ».",
      },
    ],
  },
  "/gestion/tables": {
    id: "tables",
    steps: [
      {
        target: "tables-salle",
        title: "Vos tables",
        body: "Une table s’ouvre à sa première commande et apparaît ici : appuyez dessus pour voir son addition, encaisser et marquer les plats servis.",
      },
      {
        target: "tables-reunir",
        title: "Une grande tablée",
        body: "Plusieurs tables pour un même groupe ? Réunissez‑les sous une seule addition.",
      },
      {
        target: "prise-commande",
        title: "Ouvrir une table à la main",
        body: "Un client qui ne scanne pas ? Appuyez sur + pour ouvrir sa table et saisir sa commande.",
      },
    ],
  },
  "/gestion/paiements": {
    id: "paiements",
    steps: [
      {
        target: "paiements-jour",
        title: "Ce que vous avez encaissé",
        body: "Le total encaissé aujourd’hui, mis à jour à chaque encaissement. Juste après, le détail : espèces, carte et en ligne.",
      },
      {
        target: "paiements-modes",
        title: "Filtrer et corriger",
        body: "Chaque encaissement s’affiche ici, jour par jour. Filtrez par mode de paiement ; une erreur au comptoir se corrige avec le crayon de sa ligne.",
      },
      {
        target: "stripe-espace",
        title: "Votre espace Stripe",
        body: "Votre solde, vos virements vers la banque et le détail de chaque paiement en ligne.",
      },
    ],
  },
  "/gestion/equipe": {
    id: "equipe",
    steps: [
      {
        target: "equipe-volets",
        title: "Votre équipe",
        body: "Les membres, le planning de la semaine et les heures badgées, chacun dans son onglet.",
      },
      {
        target: "equipe-inviter",
        title: (state) =>
          isPickupShop(state)
            ? "Inviter un employé"
            : "Inviter un serveur ou un cuisinier",
        body: (state) =>
          isPickupShop(state)
            ? "Son email et son rôle suffisent. Au comptoir comme en préparation, chacun ne voit ensuite que ce dont il a besoin ; un gérant voit tout."
            : "Son email et son rôle suffisent. Un serveur ou un cuisinier ne voit ensuite que ce dont il a besoin ; un gérant voit tout.",
      },
    ],
  },
  "/gestion/terminaux": {
    id: "terminaux",
    steps: [
      {
        target: "terminaux-omilink",
        title: "Le boîtier Omilink",
        body: "Si votre caisse n’imprime pas déjà les tickets de cuisine, ce boîtier relie vos imprimantes à Ominin. Son état s’affiche ici en direct.",
      },
      {
        target: "terminaux-imprimantes",
        title: "Vos imprimantes",
        body: "Une fois le boîtier relié, ajoutez et testez vos imprimantes ici. Dans Menu, choisissez ensuite sur quelle imprimante part chaque plat.",
      },
    ],
  },
  "/gestion/etablissement": {
    id: "etablissement",
    steps: [
      {
        target: "etablissement-fiche",
        title: "Votre fiche",
        body: "Le nom et le slogan s’affichent en tête de votre menu. Plus bas : adresse, téléphone, horaires et lien d’avis Google. Pensez à enregistrer.",
      },
      {
        target: "etablissement-service",
        title: "Restaurant ou fast food",
        body: "C’est ici que vous choisissez entre service à table et commande au comptoir. Vous pourrez changer à tout moment.",
      },
      {
        target: "etablissement-fermetures",
        when: avecCommandes,
        title: "Fermer la cuisine",
        body: "Choisissez ce qui n’est plus servi — les plats, le bar — à partir de quelle heure et quels jours. Pendant le service, Commandes a un bouton pour fermer ou rouvrir d’un geste ; tout rouvre seul à la fin de la journée.",
      },
      {
        target: "etablissement-paiement",
        when: avecCommandes,
        title: "Le paiement en ligne",
        body: (state) =>
          state.etablissement.onlinePayment
            ? "Votre compte est relié et « Paiement en ligne » est allumé : vos clients paient par carte depuis le menu. Éteignez‑le pour les faire régler au comptoir."
            : "C’est ici que vous reliez votre compte de paiement : Stripe, ou Square si vous l’utilisez déjà. Une fois le compte validé, vérifiez que « Paiement en ligne » est allumé.",
      },
      {
        target: "etablissement-minimum",
        when: avecCommandes,
        title: "Une commande minimum",
        body: (state) =>
          state.etablissement.onlineMinOrder !== null
            ? `Sous ${formatPrice(state.etablissement.onlineMinOrder)}, les frais de carte pèsent trop : le client règle au comptoir ; en click & collect, il doit compléter son panier. Videz le champ pour n’en fixer aucun.`
            : "Sous un petit montant, les frais de carte pèsent trop. Fixez un minimum : en dessous, le client règle au comptoir.",
      },
      {
        target: "etablissement-tablette",
        when: avecCommandes,
        title: "La tablette de salle",
        body: "Posez un code : chaque appareil s’ouvre en vue salle, sans vos chiffres ni vos réglages. Le bouton Admin et votre code vous rendent tout.",
      },
    ],
  },
  "/gestion/produits": {
    id: "produits",
    steps: [
      {
        target: "produits-offre",
        title: "Votre offre",
        body: "L’offre active sur votre établissement, et ce qu’elle vous coûte.",
      },
      {
        target: "produits-collect",
        title: "Le click & collect",
        body: "Vos clients commandent à emporter depuis le même menu. Pour l’activer, après la visite : cochez les conditions sous cette offre, puis « Activer le click & collect ».",
      },
      {
        target: "produits-autres",
        title: "Les autres produits Ominin",
        body: "Pour changer d’offre, « Passer à… » ouvre un email prêt à nous envoyer.",
      },
    ],
  },
  "/gestion/fidelite": {
    id: "fidelite",
    steps: [
      {
        target: "fidelite-programme",
        title: "Le programme de fidélité",
        body: "Activez‑le : le client laisse son numéro ou son email en commandant, et gagne des points à chaque euro dépensé. Réglez ici combien de points rapporte chaque euro.",
      },
      {
        target: "fidelite-paliers",
        title: "Les récompenses",
        body: "Un palier, c’est un nombre de points et les articles qu’il offre. Sans article, il n’apparaît pas sur le menu.",
      },
    ],
  },
  "/gestion/notifications": {
    id: "notifications",
    steps: [
      {
        target: "notifications-appareil",
        title: "Cet appareil",
        body: "C’est ici que cet appareil s’abonne aux notifications : vous êtes prévenu de chaque commande, même écran en veille.",
        action: { label: "Activer", target: "notifications-activer-appareil" },
      },
      {
        target: "notifications-choix",
        title: "Ce que vous recevez",
        body: "Cochez seulement les alertes qui vous servent pendant le service.",
      },
      {
        target: "notifications-carillon",
        title: "Le carillon",
        body: "Le navigateur ne joue de son qu’après un premier geste : en début de service, touchez l’écran ou cliquez n’importe où. « Écouter » vérifie le volume.",
      },
    ],
  },
};

/**
 * Carte encore vide : sa visite montre le premier geste. Celle du menu
 * rempli, qui suppose des catégories, viendra à la visite suivante.
 */
const MENU_VIDE: Visite = {
  id: "menu-vide",
  steps: [
    {
      target: "menu-premiere-categorie",
      title: "Commencez par une catégorie",
      action: {
        label: "Créer une catégorie",
        target: "menu-premiere-categorie",
      },
      body: "Entrées, pizzas, boissons… Créez‑en une : le bouton « + Ajouter un article » apparaît alors pour y mettre vos plats.",
    },
  ],
};

const BY_ID = Object.fromEntries(
  [...Object.values(VISITES), MENU_VIDE].map((visite) => [visite.id, visite])
) as Record<VisiteId, Visite>;

export const VISITE_IDS = Object.keys(BY_ID) as VisiteId[];

/** Visite de la page affichée, s'il y en a une. */
export function visiteFor(
  pathname: string,
  state: GestionState
): Visite | undefined {
  const visite = VISITES[pathname.replace(/\/$/, "")];
  // Sans aperçu, l'accueil renvoie vers une autre page : c'est la sienne.
  if (visite?.id === "bienvenue" && !state.features.apercu) return undefined;
  return visite?.id === "menu" && state.categories.length === 0
    ? MENU_VIDE
    : visite;
}
