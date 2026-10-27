/*
 * Contrat de commercial indépendant, version 2 — PROJET POUR RELECTURE PAR
 * L'AVOCAT, NON PUBLIÉ (cahier des charges docs/espace-commercial.md, 13.3).
 *
 * Il n'est inscrit nulle part : le publier, c'est, après relecture,
 *   1. l'ajouter au tableau `commercial` de documents/index.ts avec sa date
 *      d'effet : `commercialV2("AAAA-MM-JJ")` ;
 *   2. déployer, puis lancer `npm run legal:publish` (fondateurs).
 * Les commerciaux qui ont signé la version 1 la signent alors depuis le
 * bandeau de leur espace ; d'ici là, ils travaillent leurs restaurants mais
 * ne déclarent plus (article 7.2 du cahier).
 *
 * Ce qui change depuis la version 1 :
 *   - commission pendant COMMERCIAL_TERM_MONTHS après l'inscription de chaque
 *     restaurant, et non plus pendant la durée du contrat (décision n° 1) ;
 *   - refus pour plafond de déclarations et délai de carence ;
 *   - doublons confirmés : la première déclaration confirmée l'emporte ;
 *   - passage sans suite sans droit à commission ;
 *   - étape 5 : le restaurant choisit une offre publiée, sans négociation ;
 *   - délais lus des constantes du contrat ;
 *   - assiette alignée sur ce que la base encaisse (abonnements, commissions
 *     sur commandes, frais Shop, frais Club — à trancher —, matériel exclu) ;
 *   - statut RGPD : Ominin responsable de traitement, le commercial y accède
 *     pour exécuter le contrat (à valider : responsable distinct ou
 *     sous-traitant, art. 28 RGPD).
 * Les points marqués [À DÉCIDER] sont des choix des fondateurs.
 */
import {
  COMMERCIAL_COMMISSION_PERCENT,
  COMMERCIAL_CONFIRM_DAYS,
  COMMERCIAL_CONTEST_MONTHS,
  COMMERCIAL_DETAIL_INTERVAL_MONTHS,
  COMMERCIAL_DETAIL_RESPONSE_DAYS,
  COMMERCIAL_FINAL_STATEMENT_DAYS,
  COMMERCIAL_NOTICE_MONTHS,
  COMMERCIAL_PAYMENT_DAYS,
  COMMERCIAL_SIGN_WINDOW_MONTHS,
  COMMERCIAL_STATEMENT_BEFORE_DAY,
  COMMERCIAL_TERM_MONTHS,
  COMMERCIAL_URSSAF_INTERVAL_MONTHS,
  COMMERCIAL_URSSAF_THRESHOLD_EUROS,
} from "../constants";
import { parisEffectiveDate } from "../format";
import type { LegalArticle, LegalDocument } from "../types";
import { commercial } from "./commercial";

const commission = `${COMMERCIAL_COMMISSION_PERCENT} %`;
const term = `${COMMERCIAL_TERM_MONTHS} mois`;
const urssaf = `${COMMERCIAL_URSSAF_THRESHOLD_EUROS.toLocaleString("fr-FR")} € HT`;

/** Articles réécrits ; les autres reprennent la version 1 mot pour mot. */
const REWRITTEN: Record<string, LegalArticle> = {
  "Article 2": {
    heading: "Article 2 — Statut du Commercial",
    body: [
      ...commercial.articles.find((a) => a.heading.startsWith("Article 2 "))!.body.slice(0, 4),
      `2.5 Obligations sociales et fiscales. Le Commercial déclare être régulièrement immatriculé et s'acquitte seul de ses cotisations sociales et de ses impôts. Il remet à Ominin un avis de situation SIRENE à la signature. Dès que les commissions dues au titre du contrat atteignent ${urssaf}, puis tous les ${COMMERCIAL_URSSAF_INTERVAL_MONTHS} mois, il remet aussi une attestation de vigilance URSSAF (art. L.8222-1 et D.8222-5 du Code du travail). Il les dépose dans son espace commercial.`,
    ],
  },
  "Article 4": {
    heading: "Article 4 — Commission",
    body: [
      `4.1 Taux. Pour chaque Client Apporté, le Commercial perçoit une commission de ${commission} du Chiffre d'affaires net encaissé par Ominin auprès de ce client.`,
      `4.2 Période. La commission court à compter de l'inscription du Client Apporté, c'est-à-dire de sa première acceptation des conditions générales d'Ominin postérieure à la déclaration, pendant ${term}. Elle cesse avant ce terme si le Client Apporté met fin à son contrat avec Ominin. Elle reste due après la fin du présent contrat, pour chaque Client Apporté inscrit avant cette fin, jusqu'au terme de sa propre période. [À DÉCIDER : confirmer que la commission survit à la fin du contrat du Commercial.]`,
      "4.3 Client Apporté. Un restaurant devient Client Apporté lorsque les trois conditions suivantes sont réunies :",
      [
        "le Commercial l'a déclaré à Ominin depuis son espace commercial, ou par e-mail, avant toute inscription, avec le nom de l'établissement, son adresse et un interlocuteur (au moins sa fonction) ;",
        `Ominin a confirmé l'enregistrement par e-mail dans les ${COMMERCIAL_CONFIRM_DAYS} jours ; à défaut de réponse dans ce délai, l'enregistrement est réputé confirmé. Une fois confirmé, il ne peut plus être refusé ;`,
        `le restaurant s'inscrit chez Ominin dans les ${COMMERCIAL_SIGN_WINDOW_MONTHS} mois suivant la confirmation.`,
      ],
      "4.3 bis Refus. Ominin refuse l'enregistrement, par e-mail motivé, si le restaurant est déjà client d'Ominin, déjà déclaré par un autre commercial, en discussion avec Ominin, s'il s'est opposé à toute prospection, si le Commercial a atteint le nombre de déclarations en cours fixé par Ominin et affiché dans son espace, ou s'il redéclare un restaurant qu'il a abandonné ou laissé expirer avant la fin du délai de carence affiché dans son espace. Ces deux valeurs ne s'appliquent qu'aux déclarations faites après leur affichage.",
      "4.3 ter Doublons. Si un même restaurant a été enregistré pour deux commerciaux sous deux fiches distinctes, la première déclaration confirmée l'emporte ; l'autre commercial en est informé par e-mail et sa déclaration est close sans indemnité.",
      "4.3 quater Passage sans suite. Le Commercial peut noter dans son espace un passage chez un restaurant qu'il ne déclare pas. Un passage sans suite ne réserve pas le restaurant et n'ouvre aucun droit à commission.",
      "4.4 Nouveaux établissements. Un nouvel établissement ouvert ou rattaché par l'exploitant d'un Client Apporté (même numéro SIREN) qui s'inscrit chez Ominin pendant la période de commission de ce Client Apporté est aussi un Client Apporté, pour sa propre période.",
      "4.5 Chiffre d'affaires net encaissé. Il s'agit des sommes hors taxes effectivement encaissées par Ominin auprès du Client Apporté au titre de son contrat :",
      [
        "les commissions prélevées sur les commandes payées en ligne (menu à table et click & collect) ;",
        "les frais d'application prélevés sur les ventes des boutiques en ligne ;",
        "les abonnements et commissions facturés par Ominin ;",
        "les frais de réservation payés par les clients d'un établissement de nuit. [À DÉCIDER : inclure ou exclure ces frais, payés par les clients du club et non par le Client Apporté.]",
      ],
      "en sont déduits les remboursements qui rendent ces sommes, les avoirs, les impayés et les contestations de paiement, ainsi que le matériel revendu (Cachets, boîtiers, imprimantes, supports QR), sa livraison et les frais de tiers refacturés à l'identique, notamment ceux des prestataires de paiement. [À DÉCIDER : la livraison de la commande de démarrage est-elle un frais de tiers refacturé ? Le prix de mise en place d'une boutique est-il de la commission facturée ?]",
      "4.6 Régularisation. Si une somme ayant donné lieu à commission est ensuite remboursée ou impayée, la commission correspondante est déduite du relevé du mois où l'événement a lieu.",
      "4.7 Liberté commerciale d'Ominin. Ominin fixe librement ses offres et ses prix, et reste libre d'accepter ou de refuser un Prospect. Un Prospect refusé ne donne lieu à aucune commission ni indemnité.",
    ],
  },
  "Article 5": {
    heading: "Article 5 — Relevé et paiement",
    body: [
      `5.1 Relevé mensuel. Avant le ${COMMERCIAL_STATEMENT_BEFORE_DAY} de chaque mois, Ominin adresse au Commercial, par e-mail et dans son espace, un relevé du mois précédent indiquant, pour chaque Client Apporté, le Chiffre d'affaires net encaissé et la commission due, ainsi que les régularisations.`,
      "5.2 Facture. Sur la base de ce relevé, le Commercial émet une facture conforme à la réglementation et la dépose dans son espace. Si la commission est soumise à TVA, celle-ci s'ajoute au montant hors taxes ; s'il bénéficie de la franchise, il porte la mention « TVA non applicable, art. 293 B du CGI ».",
      `5.3 Délai. Ominin règle la facture par virement dans les ${COMMERCIAL_PAYMENT_DAYS} jours suivant sa réception.`,
      `5.4 Contrôle. Le Commercial peut demander, une fois tous les ${COMMERCIAL_DETAIL_INTERVAL_MONTHS} mois, le détail des encaissements de ses Clients Apportés. Ominin le transmet dans les ${COMMERCIAL_DETAIL_RESPONSE_DAYS} jours. Une contestation du relevé doit être faite par écrit dans les ${COMMERCIAL_CONTEST_MONTHS} mois de sa réception.`,
    ],
  },
  "Article 6": {
    heading: "Article 6 — Engagements des Parties",
    body: [
      ...commercial.articles.find((a) => a.heading.startsWith("Article 6 "))!.body.slice(0, 4),
      "6.5 Données personnelles. Ominin est responsable du traitement de sa base de prospection ; le Commercial y accède, depuis son espace, pour exécuter le présent contrat et pour ce seul usage. Il n'y enregistre que les coordonnées professionnelles et les informations utiles à la mise en relation, informe les personnes rencontrées par la mention d'information fournie dans son espace, et enregistre aussitôt toute opposition qu'on lui exprime. À la fin du contrat, son accès est fermé et les données conservées sur son appareil sont effacées. Ominin traite les données du Commercial pour gérer le contrat et payer les commissions ; elle les conserve pendant le contrat, puis dix (10) ans pour ses obligations comptables. [À DÉCIDER avec l'avocat : responsable de traitement distinct ou sous-traitant au sens de l'article 28 du RGPD.]",
      ...commercial.articles.find((a) => a.heading.startsWith("Article 6 "))!.body.slice(5),
    ],
  },
  "Article 7": {
    heading: "Article 7 — Résiliation anticipée",
    body: commercial.articles
      .find((a) => a.heading.startsWith("Article 7 "))!
      .body.map((block) =>
        typeof block === "string" && block.startsWith("7.2 ")
          ? `7.2 Résiliation par le Commercial. Le Commercial peut mettre fin au contrat à tout moment, depuis son espace, par e-mail ou par lettre recommandée, avec un préavis de ${COMMERCIAL_NOTICE_MONTHS} mois.`
          : block
      ),
  },
  "Article 8": {
    heading: "Article 8 — Effets de la fin du contrat",
    body: [
      `8.1 Les commissions restent dues selon l'article 4.2. Ominin adresse un relevé final dans les ${COMMERCIAL_FINAL_STATEMENT_DAYS} jours suivant la fin du contrat, puis les relevés des mois suivants tant qu'une période de commission court ; ils sont payés selon l'article 5.`,
      "8.2 Les déclarations en cours à la fin du contrat sont closes : un restaurant qui s'inscrit après cette date n'est pas un Client Apporté. Les Clients Apportés restent clients d'Ominin.",
      ...commercial.articles.find((a) => a.heading.startsWith("Article 8 "))!.body.slice(2),
    ],
  },
};

/** La version 2, à la date d'effet choisie à la publication (« AAAA-MM-JJ »). */
export function commercialV2(effectiveDay: string): LegalDocument {
  return {
    ...commercial,
    version: effectiveDay,
    effectiveFrom: parisEffectiveDate(effectiveDay),
    summary:
      "Commission pendant 24 mois après l'inscription de chaque restaurant ; refus pour plafond et carence ; doublons ; passage sans suite ; assiette précisée ; données personnelles.",
    essentials: [
      `${commission} du chiffre d'affaires net encaissé hors taxes par Ominin sur chaque restaurant que vous apportez, pendant ${term} à compter de son inscription ; elle cesse si le client quitte Ominin (article 4). Relevé avant le ${COMMERCIAL_STATEMENT_BEFORE_DAY} de chaque mois, paiement dans les ${COMMERCIAL_PAYMENT_DAYS} jours suivant votre facture (article 5).`,
      `Un restaurant n'est « apporté » que si vous le déclarez avant son inscription, qu'Ominin confirme (ou ne répond pas sous ${COMMERCIAL_CONFIRM_DAYS} jours) et qu'il s'inscrit dans les ${COMMERCIAL_SIGN_WINDOW_MONTHS} mois (article 4.3).`,
      "Ominin peut refuser une déclaration pour les motifs de l'article 4.3 bis, dont le plafond de déclarations en cours et le délai de carence affichés dans votre espace.",
      ...commercial.essentials!.slice(2),
    ],
    articles: commercial.articles.map((article) => REWRITTEN[article.heading.split(" — ")[0]] ?? article),
  };
}
