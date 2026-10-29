/*
 * À faire relire par un avocat avant publication.
 *
 * Contrat de commercial indépendant, version 3 : l'espace commercial tel qu'il
 * fonctionne (visites, demandes de visite, inscription sur place, Client
 * Apporté à Stripe et HubRise branchés, commission par client, taux propre à
 * chaque commercial). Mêmes règles que la version 1 pour l'identité d'Ominin
 * et l'empreinte (voir documents/commercial.ts) ; l'offre citée à l'article
 * 6.1 vient de lib/landing-data.ts, la changer demande une nouvelle version.
 */
import { connectCommission, contactEmail } from "@/lib/landing-data";
import {
  COMMERCIAL_COMMISSION_PERCENT,
  COMMERCIAL_CONTEST_MONTHS,
  COMMERCIAL_DETAIL_INTERVAL_MONTHS,
  COMMERCIAL_DETAIL_RESPONSE_DAYS,
  COMMERCIAL_FINAL_STATEMENT_DAYS,
  COMMERCIAL_NOTICE_MONTHS,
  COMMERCIAL_OPTION_YEARS,
  COMMERCIAL_PAYMENT_DAYS,
  COMMERCIAL_STATEMENT_BEFORE_DAY,
  COMMERCIAL_TERM_MONTHS,
  COMMERCIAL_TOTAL_YEARS,
  COMMERCIAL_URSSAF_INTERVAL_MONTHS,
  COMMERCIAL_URSSAF_THRESHOLD_EUROS,
  editor,
  editorLegalName,
} from "../constants";
import { parisEffectiveDate } from "../format";
import type { LegalDocument } from "../types";

const term = `${COMMERCIAL_TERM_MONTHS} mois`;
const option = `${COMMERCIAL_OPTION_YEARS} ans`;
const total = `${COMMERCIAL_TOTAL_YEARS} ans`;
const notice = `${COMMERCIAL_NOTICE_MONTHS} mois`;
const commission = `${COMMERCIAL_COMMISSION_PERCENT} %`;
const offer = `${connectCommission.percent} %`;
const urssaf = `${COMMERCIAL_URSSAF_THRESHOLD_EUROS.toLocaleString("fr-FR")} € HT`;

export const commercialV3: LegalDocument = {
  doc: "commercial",
  version: "2026-11-16",
  effectiveFrom: parisEffectiveDate("2026-11-16"),
  title: "Contrat de commercial indépendant",
  lead: "Contrat d'apport d'affaires entre Ominin et les commerciaux indépendants qui présentent ses offres aux restaurants. Il se signe en ligne, depuis l'espace commercial.",
  summary:
    "Le contrat décrit l'espace commercial actuel : un restaurant est suivi dès votre première visite, un collègue peut demander à le visiter, vous inscrivez le restaurant sur place avec son gérant, et il devient Client Apporté quand Stripe et HubRise sont branchés. La commission court 24 mois à partir de ce jour, même après la fin de votre contrat, et Ominin peut augmenter votre taux. Chaque partie peut résilier avec préavis.",
  essentials: [
    `${commission} de ce qu'Ominin encaisse sur chaque restaurant que vous apportez, pendant ${term} à partir du jour où il devient client (Stripe et HubRise branchés), y compris après la fin de votre contrat (articles 4.4 à 4.8).`,
    "Ominin peut augmenter votre taux, jamais le baisser ; une hausse vaut pour les relevés suivants (article 4.6).",
    "Votre première visite enregistrée d'un restaurant libre vous le réserve, sans limite de durée ; un collègue peut vous demander à le visiter (articles 4.1 et 4.2).",
    "Vous présentez les offres publiées et accompagnez l'inscription : c'est le gérant qui accepte les conditions d'Ominin, et Ominin reste libre d'accepter un restaurant (articles 2.2 et 4.10).",
    `Relevé avant le ${COMMERCIAL_STATEMENT_BEFORE_DAY} de chaque mois, paiement dans les ${COMMERCIAL_PAYMENT_DAYS} jours suivant la réception de votre facture (article 5).`,
    `${term} sans reconduction tacite, prolongeables par Ominin de ${option} ; chacun peut résilier avec ${notice} de préavis (articles 3 et 7).`,
    "Aucune obligation d'activité, d'horaires ni de compte rendu (article 2.3). Pendant 12 mois après la fin, vous ne détournez pas vos Clients Apportés (article 6.6).",
  ],
  articles: [
    {
      heading: "Entre les soussignés",
      body: [
        `${editorLegalName}, ${editor.status.toLowerCase()} exerçant sous le nom commercial Ominin, SIREN ${editor.siren}, dispensé d'immatriculation au RCS et au répertoire des métiers, domicilié ${editor.address}, ci-après « Ominin »,`,
        "et",
        "l'entrepreneur individuel (EI) dont le nom, le prénom, le numéro SIRET, l'adresse de domicile, l'adresse e-mail et le numéro de téléphone sont renseignés lors de la signature et reproduits au relevé de signature, ci-après « le Commercial »,",
        "ensemble « les Parties ».",
        "Préambule. Ominin édite des solutions numériques pour la restauration, notamment la commande en ligne (menu QR et commande à table, click & collect) reliée à la caisse du restaurant. Le Commercial, professionnel indépendant, souhaite présenter ces solutions à des restaurants et accompagner l'inscription de ceux qui le souhaitent. Les Parties ont donc convenu de ce qui suit.",
      ],
    },
    {
      heading: "Article 1 — Objet",
      body: [
        "Le Commercial présente les offres d'Ominin à des restaurants, bars et commerces de bouche (les « Prospects ») et accompagne, sur place, l'inscription de ceux qui décident de devenir clients. En contrepartie, il perçoit une commission sur les Clients Apportés, dans les conditions de l'article 4.",
      ],
    },
    {
      heading: "Article 2 — Statut du Commercial",
      body: [
        "2.1 Apporteur d'affaires. Le Commercial intervient en qualité d'apporteur d'affaires indépendant. Sa mission se limite à présenter les offres d'Ominin et à accompagner l'inscription des Prospects qui le souhaitent : il n'est chargé ni de négocier ni de conclure des contrats au nom et pour le compte d'Ominin. Malgré l'intitulé « commercial », il n'est donc ni agent commercial au sens de l'article L.134-1 du Code de commerce, ni VRP, ni salarié d'Ominin, et aucune indemnité de fin de contrat ou de clientèle ne lui est due.",
        "2.2 Aucun pouvoir de représentation. Le contrat entre Ominin et un restaurant se forme par l'acceptation, par le gérant lui-même, des conditions générales de vente d'Ominin au moment de son inscription. Le Commercial n'accepte aucune condition à la place du gérant, ne signe rien au nom d'Ominin et ne peut l'engager. Il n'encaisse aucune somme pour son compte et ne promet ni prix, ni remise, ni délai, ni matériel, ni fonctionnalité absents des offres publiées par Ominin.",
        "2.3 Indépendance. Le Commercial organise librement son activité : il décide s'il prospecte, quand, où, combien de temps et selon quelles méthodes. Il n'est soumis à aucune obligation d'activité minimale, à aucun horaire, à aucun objectif, à aucun compte rendu imposé ni à aucun pouvoir de direction ou disciplinaire d'Ominin. L'espace commercial et le serveur Discord de l'équipe sont des outils mis à sa disposition : les visites qu'il enregistre servent à attribuer les restaurants (article 4), et les annonces publiées dans Discord informent l'équipe ; ni les unes ni les autres ne constituent un contrôle de son activité. Il supporte seul ses frais (déplacements, téléphone, matériel), sauf accord écrit préalable d'Ominin.",
        "2.4 Non-exclusivité. Le présent contrat n'est exclusif pour aucune des Parties. Ominin peut travailler avec d'autres commerciaux et prospecter elle-même. Le Commercial peut exercer d'autres activités, à condition de ne pas proposer aux restaurants qu'il suit ou qu'il a apportés, pendant la durée du contrat, une solution concurrente de commande en ligne destinée à la restauration.",
        `2.5 Obligations sociales et fiscales. Le Commercial déclare exercer comme entrepreneur individuel régulièrement immatriculé (numéro SIRET) et s'acquitte seul de ses cotisations sociales et de ses impôts. Il dépose dans son espace commercial un avis de situation SIRENE à la signature. Dès que les commissions relevées au titre du contrat atteignent ${urssaf}, puis tous les ${COMMERCIAL_URSSAF_INTERVAL_MONTHS} mois, il y dépose aussi une attestation de vigilance URSSAF (art. L.8222-1 et D.8222-5 du Code du travail).`,
      ],
    },
    {
      heading: "Article 3 — Durée et option de prolongation",
      body: [
        `3.1 Durée initiale. Le contrat court pendant ${term} à compter de la première signature, par le Commercial, d'une version du contrat de commercial d'Ominin (article 10) ; la signature d'une version ultérieure ne fait pas repartir ce délai. Il n'est pas reconduit tacitement.`,
        `3.2 Option d'Ominin. Le Commercial consent à Ominin une promesse unilatérale de prolongation (art. 1124 du Code civil) : Ominin peut, si elle le souhaite, prolonger le contrat de ${option}, soit une durée totale de ${total}. Le Commercial ne peut pas retirer cette promesse pendant la durée initiale.`,
        "3.3 Levée de l'option. Ominin lève l'option par e-mail adressé au Commercial au plus tard un (1) mois avant la fin de la durée initiale. La prolongation s'applique aux mêmes conditions, taux de commission compris.",
        "3.4 Absence de levée. Si Ominin ne lève pas l'option dans ce délai, le contrat prend fin de plein droit au terme de la durée initiale, sans indemnité pour l'une ou l'autre Partie.",
        `3.5 Fin de la prolongation. En cas de prolongation, le contrat prend fin de plein droit au terme des ${total}. Toute collaboration au-delà nécessite un nouveau contrat.`,
        "3.6 Résiliation préservée. La promesse ne prive aucune des Parties des droits de résiliation prévus à l'article 7.",
      ],
    },
    {
      heading: "Article 4 — Restaurants suivis, Clients Apportés et commission",
      body: [
        "4.1 Restaurant suivi. Un restaurant est libre s'il n'est ni client d'Ominin, ni suivi par un commercial, et ne s'est pas opposé à la prospection. Lorsque le Commercial enregistre dans son espace commercial la première visite ou l'inscription d'un restaurant libre, ce restaurant est « suivi » par lui : la carte des autres commerciaux l'indique, et lui seul peut l'inscrire. Le suivi n'a pas de durée limite ; il ne prend fin que dans les cas des articles 4.2 et 8.2.",
        "4.2 Demande de visite. Un autre commercial peut demander à visiter un restaurant suivi ; la demande est adressée au Commercial qui le suit dans le serveur Discord de l'équipe. Celui-ci l'accepte, et le restaurant est aussitôt libéré, ou la refuse. Refusée ou restée sans réponse, la demande libère le restaurant pour tous à l'expiration du délai fixé par Ominin, compté depuis la demande et indiqué dans l'annonce de celle-ci, sauf si le Commercial qui le suit a entre-temps enregistré une nouvelle visite ou commencé l'inscription de ce restaurant : il en garde alors le suivi. Ominin peut modifier ce délai ; le nouveau délai vaut pour les demandes faites après sa modification.",
        "4.3 Inscription. Avec l'accord du gérant et en sa présence, le Commercial peut l'accompagner dans l'inscription de son établissement : questionnaire sur l'établissement, création de son compte, acceptation par le gérant des conditions générales de vente d'Ominin, ouverture de son compte de paiement Stripe, connexion de sa caisse par HubRise, photos de la carte. Le gérant accepte lui-même les conditions générales et renseigne lui-même ses informations auprès de Stripe ; il peut terminer plus tard, depuis son espace de gestion, les étapes qu'il ne fait pas sur place.",
        "4.4 Client Apporté. Un restaurant inscrit par le Commercial devient Client Apporté le jour où son compte de paiement Stripe et sa connexion HubRise sont tous deux actifs, que ce soit pendant la visite ou plus tard ; Ominin le constate automatiquement chaque jour et l'indique dans le Tableau de l'espace commercial. Un restaurant ne devient Client Apporté que si ce jour précède la fin du présent contrat. Un client qui a quitté Ominin puis revient n'est pas de nouveau un Client Apporté.",
        `4.5 Taux de base. Pour chaque Client Apporté, le Commercial perçoit une commission de ${commission} (le « taux de base ») du Chiffre d'affaires net encaissé par Ominin auprès de ce client.`,
        "4.6 Taux propre au Commercial. Ominin peut, à tout moment et à sa seule initiative, porter le taux du Commercial au-dessus du taux de base. Elle l'en informe par e-mail, et le taux applicable est affiché dans son espace commercial. Ce taux ne peut plus être diminué, y compris pour les commissions dues après la fin du contrat. Une hausse s'applique aux relevés envoyés après elle ; les relevés déjà envoyés, et leurs régularisations, restent calculés au taux qu'ils indiquent.",
        `4.7 Période. La commission est due sur le Chiffre d'affaires net encaissé auprès de chaque Client Apporté pendant ${term} à compter du jour où il est devenu Client Apporté. Elle cesse avant ce terme si le Client Apporté met fin à son contrat avec Ominin. Elle reste due après la fin du présent contrat, quelle qu'en soit la cause, jusqu'au terme de cette période.`,
        "4.8 Chiffre d'affaires net encaissé. Il s'agit des sommes hors taxes effectivement encaissées et conservées par Ominin auprès du Client Apporté au titre de ses offres : les frais prélevés sur les commandes payées en ligne et sur les ventes de sa boutique en ligne, ainsi que, le cas échéant, les abonnements et commissions facturés par Ominin. En sont déduits ou exclus :",
        [
          "les commandes annulées, les remboursements, avoirs, impayés et contestations de paiement ;",
          "les paiements de démonstration ou de test ;",
          "le matériel, offert ou vendu, et les frais de tiers refacturés à l'identique ;",
          "les frais de réservation payés par la clientèle d'un établissement de nuit, sauf décision d'Ominin de les inclure.",
        ],
        "4.9 Régularisation. Si une somme ayant donné lieu à commission est ensuite remboursée, annulée ou impayée, ou si un encaissement d'un mois déjà relevé n'est connu qu'après l'envoi du relevé, la différence est portée au relevé suivant, au taux du relevé d'origine.",
        "4.10 Liberté d'Ominin. Ominin fixe librement ses offres et ses prix, reste libre d'accepter ou de refuser un restaurant et applique ses conditions générales à ses clients. Un restaurant refusé ne donne lieu à aucune commission ni indemnité.",
      ],
    },
    {
      heading: "Article 5 — Relevé et paiement",
      body: [
        `5.1 Relevé mensuel. Avant le ${COMMERCIAL_STATEMENT_BEFORE_DAY} de chaque mois, Ominin adresse au Commercial, par e-mail et dans son espace commercial, un relevé du mois précédent indiquant, pour chaque Client Apporté, le Chiffre d'affaires net encaissé et la commission due, le taux appliqué et les régularisations.`,
        "5.2 Facture. Sur la base de ce relevé, le Commercial émet une facture conforme à la réglementation et la dépose dans son espace commercial. Si la commission est soumise à TVA, celle-ci s'ajoute au montant hors taxes ; s'il bénéficie de la franchise, il porte la mention « TVA non applicable, art. 293 B du CGI ».",
        `5.3 Délai. Ominin règle la facture par virement dans les ${COMMERCIAL_PAYMENT_DAYS} jours suivant sa réception.`,
        `5.4 Contrôle. Le Commercial peut demander depuis son espace, une fois par période de ${COMMERCIAL_DETAIL_INTERVAL_MONTHS} mois, le détail des encaissements de ses Clients Apportés ; Ominin le transmet dans les ${COMMERCIAL_DETAIL_RESPONSE_DAYS} jours. Une contestation d'un relevé se fait par écrit, depuis l'espace commercial, dans les ${COMMERCIAL_CONTEST_MONTHS} mois de sa réception ; Ominin y répond par écrit, et une correction passe par une régularisation.`,
      ],
    },
    {
      heading: "Article 6 — Engagements des Parties",
      body: [
        `6.1 Engagements du Commercial. Le Commercial présente Ominin de manière loyale et exacte, à partir des supports et des offres publiés par Ominin dans la rubrique Ressources de son espace commercial. À la date de la présente version, l'offre publiée est de ${offer} ${connectCommission.basis}, sans abonnement, sans rien à payer à l'inscription, avec un matériel de démarrage offert lorsque l'inscription se fait avec un commercial ; seule l'offre publiée au jour de la visite fait foi. Il s'interdit toute affirmation trompeuse sur les prix, les fonctionnalités ou les résultats, ainsi que tout dénigrement d'un concurrent. Il respecte les règles applicables à la prospection, notamment le refus d'un restaurant d'être démarché.`,
        "6.2 Engagements d'Ominin. Ominin met à la disposition du Commercial l'espace commercial (carte des restaurants, Tableau, Ressources, Argent) et l'accès au serveur Discord de l'équipe ; elle tient à jour ses supports, ses offres et ses démonstrations. Elle applique de bonne foi les règles d'attribution de l'article 4 et l'informe, dans son espace, de l'état de ses inscriptions et de ses Clients Apportés.",
        "6.3 Marque. Le Commercial peut utiliser le nom et le logo Ominin pour la seule exécution du contrat, sans les modifier. Il ne crée aucun site, compte de réseau social, adresse e-mail ou nom de domaine au nom d'Ominin sans son accord écrit. Ce droit cesse à la fin du contrat.",
        "6.4 Confidentialité. Chaque Partie garde confidentielles les informations non publiques reçues de l'autre : données des clients et des Prospects, chiffres d'affaires, produits en développement. Cette obligation dure pendant le contrat et deux (2) ans après sa fin.",
        "6.5 Données personnelles. Chaque Partie respecte le Règlement général sur la protection des données (RGPD).",
        [
          "Données des Prospects. Ominin est responsable des traitements réalisés avec l'espace commercial. Les informations que le Commercial y enregistre (résultat des visites, nom et coordonnées d'un interlocuteur, informations, coordonnées du gérant et photos recueillies à l'inscription) servent uniquement à la prospection, à l'inscription des restaurants et à l'attribution des commissions. Le Commercial n'y enregistre que des données professionnelles exactes et nécessaires, recueillies loyalement ; il indique à son interlocuteur qu'elles sont transmises à Ominin et respecte son opposition. Il ne les conserve pas hors des outils d'Ominin et ne les réutilise pas pour son propre compte.",
          "Outils. Ces données sont hébergées par les prestataires d'Ominin cités dans sa politique de confidentialité. Le serveur Discord de l'équipe (Discord Inc., États-Unis) reçoit les annonces de l'espace commercial : visites, demandes de visite, inscriptions avec le nom et les coordonnées du gérant. Le Commercial n'y publie lui-même aucune autre donnée personnelle d'un Prospect.",
          "Conservation. Ominin conserve les données d'un Prospect qui n'est pas devenu client au plus trois (3) ans après le dernier contact, puis les supprime ou les anonymise.",
          `Données du Commercial. Ominin traite les données du Commercial pour gérer le contrat, attribuer les restaurants, calculer et payer les commissions ; elle ne se sert pas de l'espace commercial pour suivre ses horaires, ses déplacements ou son assiduité. Elle conserve ces données pendant le contrat, puis le temps de ses obligations comptables (dix (10) ans pour les pièces comptables). Le Commercial exerce ses droits en écrivant à ${contactEmail}.`,
        ],
        "6.6 Non-sollicitation. Pendant le contrat et douze (12) mois après sa fin, le Commercial s'interdit d'inciter un Client Apporté par lui à quitter Ominin ou à remplacer ses services par une solution concurrente. Cette clause ne vise que ses Clients Apportés ; elle ne l'empêche pas d'exercer son activité auprès d'autres restaurants.",
      ],
    },
    {
      heading: "Article 7 — Résiliation anticipée",
      body: [
        "7.1 Accord commun. Les Parties peuvent mettre fin au contrat à tout moment d'un commun accord écrit.",
        `7.2 Résiliation par le Commercial. Le Commercial peut mettre fin au contrat à tout moment, depuis son espace commercial ou par e-mail, avec un préavis de ${notice}.`,
        "7.3 Manquement. En cas de manquement grave de l'une des Parties, l'autre peut résilier le contrat si une mise en demeure par e-mail ou lettre recommandée reste sans effet pendant quinze (15) jours.",
        "7.4 Résiliation immédiate. Chaque Partie peut résilier le contrat sans préavis en cas de fraude de l'autre. Ominin le peut aussi en cas de fausse information enregistrée dans l'espace commercial pour obtenir un restaurant ou une commission, d'acceptation des conditions générales à la place d'un gérant, d'engagement pris au nom d'Ominin sans son accord, de dénigrement d'Ominin, ou de radiation de l'immatriculation du Commercial.",
        `7.5 Résiliation par Ominin. Ominin peut mettre fin au contrat à tout moment, par e-mail, avec le même préavis de ${notice}.`,
        "7.6 Commissions préservées. Quelle que soit la cause de la fin du contrat, les commissions sur les Clients Apportés restent dues selon les articles 4.7 et 8.1.",
      ],
    },
    {
      heading: "Article 8 — Effets de la fin du contrat",
      body: [
        `8.1 Relevés. Ominin continue d'établir et de payer les relevés mensuels des Clients Apportés jusqu'au terme de leur période de commission (article 4.7), selon l'article 5. Le relevé du mois de la fin du contrat est adressé dans les ${COMMERCIAL_FINAL_STATEMENT_DAYS} jours suivant celle-ci.`,
        "8.2 Restaurants suivis. À la fin du contrat, les restaurants suivis par le Commercial qui ne sont pas devenus Clients Apportés redeviennent libres, y compris ceux dont l'inscription est commencée. Les Clients Apportés restent clients d'Ominin.",
        "8.3 Espace commercial. Le Commercial garde l'accès à la rubrique Argent de son espace commercial, à ses relevés et à son contrat ; l'accès à la carte, au Tableau et aux restaurants prend fin, de même que son accès au serveur Discord de l'équipe. Il cesse d'utiliser la marque Ominin et détruit les supports et les données de Prospects qu'il détiendrait encore.",
        "8.4 Les articles 4.5 à 4.9 (commission), 5 (relevé et paiement), 6.4 (confidentialité), 6.5 (données personnelles) et 6.6 (non-sollicitation) continuent de s'appliquer pour leur durée propre.",
      ],
    },
    {
      heading: "Article 9 — Dispositions générales",
      body: [
        "9.1 Intuitu personae. Le contrat est conclu en considération de la personne du Commercial. Il ne peut être cédé ni sous-traité sans l'accord écrit d'Ominin.",
        "9.2 Intégralité et nouvelles versions. Le contrat constitue l'accord entier des Parties sur son objet. Toute modification prend la forme d'une nouvelle version, proposée dans l'espace commercial et signée par le Commercial ; tant qu'il ne l'a pas signée, la version qu'il a signée continue de s'appliquer. La hausse du taux prévue à l'article 4.6 ne demande pas de nouvelle signature.",
        "9.3 Nullité partielle. Si une clause est déclarée nulle, les autres clauses restent applicables.",
        "9.4 Droit applicable et litiges. Le contrat est soumis au droit français. En cas de litige, les Parties recherchent une solution amiable pendant trente (30) jours à compter de la réclamation écrite de l'une d'elles. À défaut, le litige est porté devant la juridiction compétente selon les règles de droit commun.",
        "9.5 Signature. Le contrat peut être signé à la main ou par voie électronique. La signature électronique a la même valeur qu'une signature manuscrite (art. 1366 et 1367 du Code civil). Chaque Partie reçoit un exemplaire signé, papier ou PDF.",
      ],
    },
    {
      heading: "Article 10 — Conclusion et signature électronique",
      body: [
        "10.1 Offre. Ominin adresse le présent contrat au Commercial par une invitation nominative envoyée à son adresse e-mail, ou le propose dans son espace commercial lorsqu'il a signé une version antérieure. Cette invitation vaut offre de contracter aux conditions de la présente version.",
        "10.2 Signature électronique. Le Commercial signe depuis son espace commercial, après s'y être authentifié par un lien reçu à son adresse e-mail, avoir renseigné son identité et coché la case par laquelle il déclare avoir lu le contrat et l'accepter. La présente version s'applique à compter de cette signature.",
        "10.3 Preuve. Ominin conserve la version signée, son empreinte numérique, l'identité déclarée, la date et l'heure de la signature, ainsi que l'adresse IP et le navigateur utilisés ; ces éléments forment le relevé de signature. Ils font foi entre les Parties, sauf preuve contraire.",
        "10.4 Exemplaire. L'exemplaire de chaque Partie lui est envoyé par e-mail, au format PDF, avec son relevé de signature. Le Commercial peut aussi consulter le contrat signé à tout moment depuis son espace commercial.",
      ],
    },
  ],
};
