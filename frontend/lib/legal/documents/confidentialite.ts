import { parisEffectiveDate } from "../format";
import { contactEmail } from "@/lib/landing-data";
import { LEGAL_PATHS, editorLegalName, hosts } from "../constants";
import type { LegalDocument } from "../types";

export const confidentialite: LegalDocument = {
  doc: "confidentialite",
  version: "2026-09-22",
  effectiveFrom: parisEffectiveDate("2026-09-22"),
  title: "Politique de confidentialité",
  lead: "Comment Ominin traite les données à caractère personnel de ses clients professionnels et des visiteurs de son site. Les données des convives des restaurants relèvent de l'article 7.",
  summary: "Première version.",
  articles: [
    {
      heading: "Article 1 — Responsable de traitement",
      body: [
        `Les traitements décrits par la présente politique sont mis en œuvre par ${editorLegalName}, entrepreneur individuel, éditeur du service Ominin. L'identité complète, le numéro SIREN et l'adresse postale figurent aux mentions légales publiées à ${LEGAL_PATHS.mentions}.`,
        `Pour toute question relative à vos données ou pour exercer vos droits : ${contactEmail}.`,
        "Ominin n'est pas tenu de désigner un délégué à la protection des données : ses traitements ne relèvent d'aucun des cas de l'article 37 du RGPD. Les demandes sont traitées par l'éditeur lui-même.",
      ],
    },
    {
      heading: "Article 2 — Données traitées, finalités et bases légales",
      body: [
        "Chaque finalité repose sur une base légale distincte. Aucune donnée n'est collectée pour une finalité qui ne figure pas ci-dessous.",
        "Compte client et fourniture du service — nom, prénom, adresse e-mail, téléphone, établissement, identifiants de connexion, paramètres et journaux d'usage de l'espace de gestion. Base légale : l'exécution du contrat conclu avec vous (art. 6.1.b du RGPD). Ces données sont nécessaires : sans elles le compte ne peut pas être ouvert.",
        "Facturation, encaissement et obligations comptables — coordonnées de facturation, montants, dates, moyens et références de paiement, factures émises. Base légale : le respect d'obligations légales auxquelles Ominin est soumis (art. 6.1.c du RGPD), notamment en matière comptable et fiscale. Ominin ne conserve aucun numéro de carte bancaire : la saisie a lieu chez le prestataire de paiement.",
        "Assistance et sécurité du service — échanges avec le support, journaux de connexion, adresse IP, événements de sécurité. Base légale : l'exécution du contrat (art. 6.1.b) et l'intérêt légitime d'Ominin à garantir la disponibilité et l'intégrité du service (art. 6.1.f).",
        "Prospection commerciale entre professionnels et amélioration du service — coordonnées professionnelles de prospects et de clients, informations publiques sur l'établissement, statistiques d'usage agrégées du produit. Base légale : l'intérêt légitime d'Ominin à faire connaître une offre destinée aux professionnels du secteur et à améliorer son service (art. 6.1.f). Cet intérêt a été mis en balance avec vos droits : la prospection vise des adresses professionnelles, porte sur une offre en rapport direct avec l'activité du destinataire, n'utilise aucune donnée sensible, aucun profilage ni aucune décision automatisée, et chaque message comporte un lien de désinscription. Vous pouvez à tout moment vous opposer à ces traitements dans les conditions de l'article 6.",
        "Mesure d'audience et cookies non nécessaires — voir l'article 9. Lorsqu'un tel traceur est déposé, il l'est sur la base de votre consentement préalable (art. 82 de la loi Informatique et Libertés) ; à la date de la présente version, aucun ne l'est.",
        "Aucune donnée n'est vendue, louée ou cédée à des tiers à des fins publicitaires.",
      ],
    },
    {
      heading: "Article 3 — Durées de conservation",
      body: [
        [
          "Compte client et données de l'espace de gestion : pendant toute la durée du contrat, puis effacement ou restitution à sa fin, dans les conditions prévues par l'accord de sous-traitance.",
          "Pièces comptables et factures : dix ans à compter de la clôture de l'exercice, conformément à l'article L123-22 du code de commerce.",
          "Échanges avec le support : trois ans à compter du dernier échange.",
          "Journaux de connexion et de sécurité : douze mois au plus, puis effacement automatique.",
          "Prospects professionnels non devenus clients : trois ans à compter du dernier contact de votre part, conformément à la recommandation de la CNIL.",
          "Preuve de l'acceptation des documents contractuels : cinq ans après la fin du contrat, durée de la prescription applicable.",
        ],
        "Au-delà de ces durées, les données sont effacées ou anonymisées de façon irréversible.",
      ],
    },
    {
      heading: "Article 4 — Destinataires et hébergement",
      body: [
        "Les données ne sont accessibles qu'à l'éditeur et aux prestataires strictement nécessaires au fonctionnement du service, liés par contrat et agissant sur instruction. Elles peuvent également être communiquées à une autorité administrative ou judiciaire lorsqu'une disposition légale l'impose.",
        "Hébergement (mention obligatoire, art. 6-III de la loi pour la confiance dans l'économie numérique) :",
        hosts.map((host) => `${host.name} — ${host.role} — ${host.address}.`),
        `La liste complète et à jour des sous-traitants ultérieurs, avec leur finalité, leur localisation et l'indication qu'aucun d'eux n'entraîne ses propres modèles sur les données confiées, figure à l'article 8 de l'accord de sous-traitance publié à ${LEGAL_PATHS.dpa}. Cette liste fait foi : la présente politique ne la reproduit pas pour éviter qu'elles divergent.`,
      ],
    },
    {
      heading: "Article 5 — Transferts hors de l'Union européenne",
      body: [
        "Les données sont traitées dans l'Union européenne chaque fois que le prestataire le permet. Certains prestataires figurant à la liste mentionnée à l'article 4 sont établis aux États-Unis.",
        "Ces transferts reposent sur la décision d'adéquation de la Commission européenne du 10 juillet 2023 (EU-US Data Privacy Framework), les prestataires concernés étant certifiés à ce cadre, complétée par les clauses contractuelles types de la décision (UE) 2021/914 et par le chiffrement des données en transit et au repos. Une copie des garanties applicables peut être obtenue à l'adresse indiquée à l'article 1.",
      ],
    },
    {
      heading: "Article 6 — Vos droits",
      body: [
        "Vous disposez, sur les données vous concernant, des droits suivants :",
        [
          "droit d'accès et d'obtention d'une copie (art. 15 du RGPD) ;",
          "droit de rectification des données inexactes ou incomplètes (art. 16) ;",
          "droit à l'effacement, dans les limites des obligations légales de conservation (art. 17) ;",
          "droit à la limitation du traitement (art. 18) ;",
          "droit à la portabilité des données que vous avez fournies, pour les traitements fondés sur le contrat (art. 20) ;",
          "droit d'opposition aux traitements fondés sur l'intérêt légitime, notamment à la prospection commerciale, à laquelle vous pouvez vous opposer à tout moment et sans motif (art. 21) ;",
          "droit de définir des directives relatives au sort de vos données après votre décès (art. 85 de la loi Informatique et Libertés).",
        ],
        `Ces droits s'exercent à ${contactEmail}. Une réponse vous est adressée dans un délai d'un mois à compter de la réception de la demande, prolongeable de deux mois en cas de complexité, auquel cas vous en êtes informé. Une pièce d'identité n'est demandée qu'en cas de doute raisonnable sur l'identité du demandeur.`,
        "Si vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la Commission nationale de l'informatique et des libertés : CNIL, 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07, ou en ligne sur www.cnil.fr.",
      ],
    },
    {
      heading: "Article 7 — Données des convives des restaurants",
      body: [
        "Lorsqu'un convive consulte le menu d'un restaurant, passe commande ou paie au moyen du service, les données le concernant sont traitées par Ominin pour le compte du restaurant. Le restaurant est responsable de traitement ; Ominin n'est que sous-traitant, au sens de l'article 28 du RGPD.",
        "En conséquence, un convive qui souhaite exercer ses droits doit s'adresser au restaurant auprès duquel il a commandé : c'est lui qui décide des finalités, répond aux demandes et publie l'information due aux personnes. Une demande adressée directement à Ominin n'est pas traitée à la place du restaurant : elle lui est transmise, et le convive en est informé.",
        `Les catégories de données concernées, les mesures de sécurité, les sous-traitants ultérieurs et les conditions d'anonymisation sont décrits dans l'accord de sous-traitance publié à ${LEGAL_PATHS.dpa}.`,
      ],
    },
    {
      heading: "Article 8 — Sécurité",
      body: [
        "Les données sont chiffrées en transit et au repos. Les données de chaque établissement sont cloisonnées par des règles de sécurité appliquées au niveau des lignes dans la base de données elle-même. Les accès sont authentifiés, journalisés et limités au strict nécessaire ; les sauvegardes sont chiffrées et leur restauration est testée.",
        "Aucun numéro de carte bancaire n'est collecté ni conservé par Ominin : la saisie des données de paiement a lieu directement chez le prestataire de paiement, seul dépositaire de ces informations.",
      ],
    },
    {
      heading: "Article 9 — Cookies",
      body: [
        "Le site et l'espace de gestion déposent uniquement les traceurs suivants :",
        [
          "cookies de session et d'authentification, nécessaires pour vous connecter, maintenir votre session et protéger le formulaire contre la falsification de requêtes ;",
          "cookie de préférence d'affichage, qui mémorise le thème clair ou sombre que vous avez choisi, avec un équivalent en stockage local du navigateur pour éviter le clignotement au chargement ;",
          "stockage local du panier, sur les pages de commande, afin que votre sélection survive à un rechargement.",
        ],
        "Ces traceurs sont strictement nécessaires au service que vous demandez : ils sont dispensés de consentement au titre de l'article 82 de la loi Informatique et Libertés, et aucune bannière n'est donc affichée.",
        "Aucun cookie de mesure d'audience, de publicité, de réseau social ou de suivi entre sites n'est déposé. Si un traceur de mesure d'audience devait l'être, votre consentement serait recueilli au préalable et la présente politique mise à jour.",
      ],
    },
    {
      heading: "Article 10 — Modifications de la présente politique",
      body: [
        "La présente politique peut être modifiée pour tenir compte d'une évolution du service, d'un changement de prestataire ou d'une évolution de la réglementation. Chaque modification donne lieu à une nouvelle version, identifiée par sa date et publiée à cette adresse ; les versions antérieures restent consultables sur demande.",
        "Une modification substantielle des finalités ou des destinataires est signalée aux clients dans leur espace de gestion. Les modifications relatives aux traitements effectués pour le compte des restaurants relèvent, elles, de la procédure de l'accord de sous-traitance.",
      ],
    },
  ],
};
