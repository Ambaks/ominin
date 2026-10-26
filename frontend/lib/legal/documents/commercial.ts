/*
 * Contrat de commercial indépendant — un apport d'affaires, pas un mandat
 * d'agent commercial : sans pouvoir de négocier ni de signer pour Ominin, le
 * commercial n'a droit à aucune indemnité de fin de contrat (art. L134-12 du
 * code de commerce ne s'applique pas).
 *
 * Le texte ne nomme pas le commercial : son identité est saisie à la
 * signature et recopiée dans legal_acceptances.terms — l'empreinte désigne le
 * modèle, la ligne d'acceptation désigne la personne. Celle d'Ominin y est
 * écrite en clair (SIREN, adresse), comme dans le projet du contrat : ces deux
 * valeurs viennent de l'environnement, qui doit donc être le même pour
 * `npm run legal:publish` et pour le site, sans quoi l'empreinte publiée ne
 * correspond plus et le contrat refuse la signature.
 */
import { contactEmail } from "@/lib/landing-data";
import {
  COMMERCIAL_COMMISSION_PERCENT,
  COMMERCIAL_OPTION_YEARS,
  COMMERCIAL_TERM_MONTHS,
  COMMERCIAL_TOTAL_YEARS,
  editor,
  editorLegalName,
} from "../constants";
import { parisEffectiveDate } from "../format";
import type { LegalDocument } from "../types";

const term = `${COMMERCIAL_TERM_MONTHS} mois`;
const option = `${COMMERCIAL_OPTION_YEARS} ans`;
const total = `${COMMERCIAL_TOTAL_YEARS} ans`;
const commission = `${COMMERCIAL_COMMISSION_PERCENT}\u00a0%`;

export const commercial: LegalDocument = {
  doc: "commercial",
  version: "2026-10-25",
  effectiveFrom: parisEffectiveDate("2026-10-25"),
  title: "Contrat de commercial indépendant",
  lead: "Contrat d'apport d'affaires entre Ominin et les commerciaux indépendants qui lui présentent des restaurants. Il se signe en ligne, depuis l'espace commercial.",
  summary: "Première version.",
  essentials: [
    `${commission} du chiffre d'affaires net encaissé hors taxes par Ominin sur chaque restaurant que vous apportez, dès qu'il signe avec Ominin et tant que le présent contrat court ; elle cesse si le client quitte Ominin (articles 4 et 8). Relevé avant le 10 de chaque mois, paiement dans les 30 jours suivant la réception de votre facture (article 5).`,
    "Un restaurant n'est « apporté » que si vous le déclarez à Ominin avant sa signature, qu'Ominin confirme l'enregistrement (ou ne répond pas sous 7 jours) et que le restaurant signe dans les 6 mois (article 4.3).",
    `${term} sans reconduction tacite ; Ominin peut prolonger de ${option}, à sa seule initiative (article 3).`,
    "Vous pouvez résilier à tout moment avec 3 mois de préavis (article 7.2).",
    "Vous gardez votre indépendance : ni objectif imposé, ni pouvoir de signer ou de négocier au nom d'Ominin (article 2).",
    "Pendant le contrat, pas de solution concurrente de menu QR, de commande en ligne ou de click & collect auprès des Prospects (article 2.4) ; pendant 12 mois après sa fin, vous n'incitez pas les clients que vous avez apportés ou rencontrés à quitter Ominin (article 6.6).",
  ],
  articles: [
    {
      heading: "Entre les soussignés",
      body: [
        `${editorLegalName}, ${editor.status.toLowerCase()} exerçant sous le nom commercial Ominin, SIREN ${editor.siren}, dispensé d'immatriculation au RCS et au répertoire des métiers, domicilié ${editor.address}, ci-après « Ominin »,`,
        "et",
        "l'entrepreneur individuel (EI) dont le nom, le prénom, le numéro SIRET, l'adresse de domicile, l'adresse e-mail et le numéro de téléphone sont renseignés lors de la signature et reproduits au relevé de signature, ci-après « le Commercial »,",
        "ensemble « les Parties ».",
        "Préambule. Ominin édite des solutions numériques pour la restauration (menu QR et commande à table, click & collect, outils de gestion). Le Commercial souhaite lui présenter des restaurants susceptibles de devenir clients. Les Parties ont donc convenu de ce qui suit.",
      ],
    },
    {
      heading: "Article 1 — Objet",
      body: [
        "Le Commercial identifie des restaurants, bars et commerces de bouche (les « Prospects »), les met en relation avec Ominin et facilite la conclusion d'un contrat entre eux et Ominin. En contrepartie, il perçoit la commission prévue à l'article 4.",
      ],
    },
    {
      heading: "Article 2 — Statut du Commercial",
      body: [
        "2.1 Apporteur d'affaires. Le Commercial intervient en qualité d'apporteur d'affaires indépendant. Sa mission se limite à identifier des Prospects et à les mettre en relation avec Ominin : il n'est pas chargé, de façon permanente, de négocier ou de conclure des contrats au nom et pour le compte d'Ominin. Malgré l'intitulé « commercial », il n'est donc ni agent commercial au sens de l'article L.134-1 du Code de commerce, ni VRP, ni salarié d'Ominin, et aucune indemnité de fin de contrat ou de clientèle ne lui est due.",
        "2.2 Aucun pouvoir de représentation. Le Commercial présente les offres publiées par Ominin et lui transmet les demandes des Prospects. Il ne négocie pas et ne signe aucun contrat au nom d'Ominin. Il ne peut ni engager Ominin, ni encaisser de somme pour son compte, ni promettre un prix, une remise, un délai ou une fonctionnalité absents de ces offres. Le contrat avec le restaurant est conclu directement entre Ominin et le restaurant, aux conditions générales d'Ominin.",
        "2.3 Indépendance. Le Commercial organise librement son activité : horaires, secteurs, méthodes et moyens. Il n'est soumis à aucun objectif imposé, à aucune directive sur l'organisation de son travail ni à aucun pouvoir disciplinaire d'Ominin. Il supporte seul ses frais (déplacements, téléphone, matériel), sauf accord écrit préalable d'Ominin.",
        "2.4 Non-exclusivité. Le présent contrat n'est exclusif pour aucune des Parties. Ominin peut travailler avec d'autres commerciaux et prospecter elle-même. Le Commercial peut exercer d'autres activités, à condition de ne pas proposer aux Prospects, pendant la durée du contrat, une solution concurrente de menu QR, de commande en ligne ou de click & collect destinée à la restauration.",
        "2.5 Obligations sociales et fiscales. Le Commercial déclare être régulièrement immatriculé et s'acquitte seul de ses cotisations sociales et de ses impôts. Il remet à Ominin un avis de situation SIRENE à la signature. Dès que les commissions dues au titre du contrat atteignent 5 000 € HT, puis tous les six mois, il remet aussi une attestation de vigilance URSSAF (art. L.8222-1 et D.8222-5 du Code du travail).",
      ],
    },
    {
      heading: "Article 3 — Durée et option de prolongation",
      body: [
        `3.1 Durée initiale. Le contrat prend effet à la date de sa signature par le Commercial (article 10) pour une durée de ${term}. Il n'est pas reconduit tacitement.`,
        `3.2 Option d'Ominin. Le Commercial consent à Ominin une promesse unilatérale de prolongation (art. 1124 du Code civil) : Ominin peut, si elle le souhaite, prolonger le contrat de ${option}, soit une durée totale de ${total}. Le Commercial ne peut pas retirer cette promesse pendant la durée initiale.`,
        "3.3 Levée de l'option. Ominin lève l'option par e-mail ou lettre recommandée adressé au Commercial au plus tard un (1) mois avant la fin de la durée initiale. La prolongation s'applique aux mêmes conditions, commission comprise.",
        "3.4 Absence de levée. Si Ominin ne lève pas l'option dans ce délai, le contrat prend fin de plein droit au terme de la durée initiale, sans indemnité pour l'une ou l'autre Partie.",
        `3.5 Fin de la prolongation. En cas de prolongation, le contrat prend fin de plein droit au terme des ${total}. Toute collaboration au-delà nécessite un nouveau contrat écrit.`,
        "3.6 Droit de résiliation préservé. La promesse ne prive pas le Commercial du droit de résiliation prévu à l'article 7.2.",
      ],
    },
    {
      heading: "Article 4 — Commission",
      body: [
        `4.1 Taux. Pour chaque Client Apporté, le Commercial perçoit une commission de ${commission} du Chiffre d'affaires net encaissé par Ominin auprès de ce client.`,
        `4.2 Période. La commission est due dès la signature du contrat entre le Client Apporté et Ominin, sur toutes les sommes encaissées auprès de ce client à partir de cette date, tant que le présent contrat est en vigueur : ${term}, ou ${total} si Ominin lève l'option de l'article 3. Les sommes encaissées après la fin du contrat ne donnent lieu à aucune commission. Si le Client Apporté met fin à son contrat avec Ominin, la commission cesse pour ce client.`,
        "4.3 Client Apporté. Un restaurant devient Client Apporté lorsque les trois conditions suivantes sont réunies :",
        [
          "le Commercial l'a déclaré à Ominin par e-mail ou depuis son espace commercial (nom de l'établissement, adresse, interlocuteur) avant toute signature ;",
          "Ominin a confirmé l'enregistrement par e-mail dans les sept (7) jours ; à défaut de réponse dans ce délai, l'enregistrement est réputé confirmé. Ominin peut refuser l'enregistrement, en le motivant, si le restaurant est déjà client, en discussion avec Ominin ou déjà déclaré par un autre commercial ;",
          "le restaurant signe un contrat avec Ominin dans les six (6) mois suivant la confirmation.",
        ],
        "4.4 Nouveaux établissements. Un nouvel établissement ouvert ou rattaché par l'exploitant d'un Client Apporté, et qui signe avec Ominin pendant la durée du contrat, est aussi un Client Apporté.",
        "4.5 Chiffre d'affaires net encaissé. Il s'agit des sommes hors taxes effectivement encaissées par Ominin auprès du Client Apporté au titre de son contrat (abonnement, commission sur les commandes, frais de mise en service), déduction faite :",
        [
          "des remboursements, avoirs, impayés et contestations de paiement ;",
          "du matériel revendu (imprimantes, boîtiers, supports QR) et des frais de tiers refacturés à l'identique, notamment les frais des prestataires de paiement.",
        ],
        "4.6 Régularisation. Si une somme ayant donné lieu à commission est ensuite remboursée ou impayée, la commission correspondante est déduite du relevé suivant.",
        "4.7 Liberté commerciale d'Ominin. Ominin fixe librement ses offres et ses prix, et reste libre d'accepter ou de refuser un Prospect. Un Prospect refusé ne donne lieu à aucune commission ni indemnité.",
      ],
    },
    {
      heading: "Article 5 — Relevé et paiement",
      body: [
        "5.1 Relevé mensuel. Avant le 10 de chaque mois, Ominin adresse au Commercial un relevé du mois précédent indiquant, pour chaque Client Apporté, le Chiffre d'affaires net encaissé et la commission due.",
        "5.2 Facture. Sur la base de ce relevé, le Commercial émet une facture conforme à la réglementation. Si la commission est soumise à TVA, celle-ci s'ajoute au montant hors taxes ; s'il bénéficie de la franchise, il porte la mention « TVA non applicable, art. 293 B du CGI ».",
        "5.3 Délai. Ominin règle la facture par virement dans les trente (30) jours suivant sa réception.",
        "5.4 Contrôle. Le Commercial peut demander, une fois par trimestre, le détail des encaissements de ses Clients Apportés. Ominin le transmet dans les quinze (15) jours. Une contestation du relevé doit être faite par écrit dans les trois (3) mois de sa réception.",
      ],
    },
    {
      heading: "Article 6 — Engagements des Parties",
      body: [
        "6.1 Engagements du Commercial. Le Commercial présente Ominin de manière loyale et exacte, à partir des supports et des offres fournis par Ominin. Il s'interdit toute affirmation trompeuse sur les prix, les fonctionnalités ou les résultats, ainsi que tout dénigrement d'un concurrent. Il respecte les règles applicables à la prospection commerciale, notamment le droit d'opposition des personnes démarchées.",
        "6.2 Engagements d'Ominin. Ominin fournit au Commercial ses supports de présentation, ses grilles tarifaires à jour et un accès de démonstration. Elle l'informe de toute signature d'un Client Apporté et applique de bonne foi les règles d'attribution de l'article 4.",
        "6.3 Marque. Le Commercial peut utiliser le nom et le logo Ominin pour la seule exécution du contrat, sans les modifier. Il ne crée aucun site, compte de réseau social, adresse e-mail ou nom de domaine au nom d'Ominin sans son accord écrit. Ce droit cesse à la fin du contrat.",
        "6.4 Confidentialité. Chaque Partie garde confidentielles les informations non publiques reçues de l'autre : tarifs négociés, données des clients et des Prospects, chiffres d'affaires, produits en développement. Cette obligation dure pendant le contrat et deux (2) ans après sa fin.",
        `6.5 Données personnelles. Chaque Partie respecte le Règlement général sur la protection des données (RGPD) pour les traitements qu'elle réalise. Le Commercial ne transmet à Ominin que les coordonnées professionnelles nécessaires à la mise en relation et supprime les données des Prospects reçues d'Ominin à la fin du contrat. Ominin traite les données du Commercial pour gérer le contrat et payer les commissions ; elle les conserve pendant le contrat, puis dix (10) ans pour ses obligations comptables. Le Commercial exerce ses droits en écrivant à ${contactEmail}.`,
        "6.6 Non-détournement. Pendant le contrat et douze (12) mois après sa fin, le Commercial s'interdit d'inciter un client d'Ominin qu'il a apporté ou rencontré dans le cadre du contrat à quitter Ominin pour une solution concurrente.",
      ],
    },
    {
      heading: "Article 7 — Résiliation anticipée",
      body: [
        "7.1 Accord commun. Les Parties peuvent mettre fin au contrat à tout moment d'un commun accord écrit.",
        "7.2 Résiliation par le Commercial. Le Commercial peut mettre fin au contrat à tout moment, par e-mail ou lettre recommandée, avec un préavis de trois (3) mois.",
        "7.3 Manquement. En cas de manquement grave de l'une des Parties, l'autre peut résilier le contrat si une mise en demeure par e-mail ou lettre recommandée reste sans effet pendant quinze (15) jours.",
        "7.4 Résiliation immédiate. Ominin peut résilier le contrat sans préavis en cas de fraude, de fausse déclaration d'un Client Apporté, d'engagement pris au nom d'Ominin sans son accord, de dénigrement d'Ominin, ou de radiation de l'immatriculation du Commercial.",
      ],
    },
    {
      heading: "Article 8 — Effets de la fin du contrat",
      body: [
        "8.1 Les commissions restent dues sur le Chiffre d'affaires net encaissé jusqu'à la date de fin du contrat. Ominin adresse un relevé final dans les trente (30) jours ; il est payé selon l'article 5.",
        "8.2 Aucune commission ni indemnité, de quelque nature que ce soit, n'est due au titre des sommes encaissées après la fin du contrat. Les Clients Apportés restent clients d'Ominin.",
        "8.3 Le Commercial cesse d'utiliser la marque Ominin et restitue ou détruit les supports et données reçus.",
        "8.4 Les articles 6.4 (confidentialité) et 6.6 (non-détournement) continuent de s'appliquer pour leur durée propre.",
      ],
    },
    {
      heading: "Article 9 — Dispositions générales",
      body: [
        "9.1 Intuitu personae. Le contrat est conclu en considération de la personne du Commercial. Il ne peut être cédé ni sous-traité sans l'accord écrit d'Ominin.",
        "9.2 Intégralité. Le contrat constitue l'accord entier des Parties sur son objet. Toute modification fait l'objet d'un avenant écrit et signé.",
        "9.3 Nullité partielle. Si une clause est déclarée nulle, les autres clauses restent applicables.",
        "9.4 Droit applicable et litiges. Le contrat est soumis au droit français. En cas de litige, les Parties recherchent une solution amiable pendant trente (30) jours à compter de la réclamation écrite de l'une d'elles. À défaut, le litige est porté devant la juridiction compétente selon les règles de droit commun.",
        "9.5 Signature. Le contrat peut être signé à la main ou par voie électronique. La signature électronique a la même valeur qu'une signature manuscrite (art. 1366 et 1367 du Code civil). Chaque Partie reçoit un exemplaire signé, papier ou PDF.",
      ],
    },
    {
      heading: "Article 10 — Conclusion et signature électronique",
      body: [
        "10.1 Offre. Ominin adresse le présent contrat au Commercial par une invitation nominative envoyée à son adresse e-mail. Cette invitation vaut offre de contracter aux conditions de la présente version.",
        "10.2 Signature électronique. Le Commercial signe depuis son espace commercial, après s'y être authentifié par un lien reçu à son adresse e-mail, avoir renseigné son identité et coché la case par laquelle il déclare avoir lu le contrat et l'accepter. Le contrat est formé et prend effet à la date de cette signature.",
        "10.3 Preuve. Ominin conserve la version signée, son empreinte numérique, l'identité déclarée, la date et l'heure de la signature, ainsi que l'adresse IP et le navigateur utilisés ; ces éléments forment le relevé de signature. Ils font foi entre les Parties, sauf preuve contraire.",
        "10.4 Exemplaire. L'exemplaire de chaque Partie lui est envoyé par e-mail, au format PDF, avec son relevé de signature. Le Commercial peut aussi consulter le contrat signé à tout moment depuis son espace commercial.",
      ],
    },
  ],
};
