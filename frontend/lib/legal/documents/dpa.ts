import { parisEffectiveDate } from "../format";
import { contactEmail } from "@/lib/landing-data";
import {
  LEGAL_PATHS,
  PRICE_NOTICE_DAYS,
  editorLegalName,
  subProcessors,
} from "../constants";
import type { LegalDocument } from "../types";

export const dpa: LegalDocument = {
  doc: "dpa",
  version: "2026-09-22",
  effectiveFrom: parisEffectiveDate("2026-09-22"),
  title: "Accord de sous-traitance (art. 28 RGPD)",
  lead: "Annexe aux conditions générales de vente, acceptée avec elles. Elle encadre le traitement des données à caractère personnel qu'Ominin effectue pour le compte du Client.",
  summary: "Première version.",
  articles: [
    {
      heading: "Article 1 — Objet, définitions et articulation avec les CGV",
      body: [
        `Le présent accord définit les conditions dans lesquelles ${editorLegalName} (« Ominin ») traite, pour le compte du Client, les données à caractère personnel collectées à l'occasion de l'utilisation de ses services : menus numériques, commande et paiement à table, click and collect, boutiques en ligne et espace de gestion.`,
        "Les termes « données à caractère personnel », « traitement », « responsable de traitement », « sous-traitant », « violation de données » et « personne concernée » s'entendent au sens de l'article 4 du règlement (UE) 2016/679 (« RGPD »). Le « Client » est le professionnel titulaire du compte Ominin ; les « Convives » sont les personnes qui consultent un menu, passent commande ou paient au moyen des services du Client.",
        "Le présent accord est une annexe des conditions générales de vente : il est accepté avec elles, pour la même durée, et prime sur elles pour tout ce qui concerne le traitement de données à caractère personnel. Les stipulations des CGV relatives à la durée, à la résiliation et à la responsabilité s'appliquent au présent accord.",
      ],
    },
    {
      heading: "Article 2 — Répartition des rôles",
      body: [
        "Pour les données des Convives collectées par les services, le Client est responsable de traitement et Ominin est sous-traitant. Le Client détermine les finalités et les moyens : c'est lui qui décide d'ouvrir un menu, d'activer la commande, de demander un numéro de téléphone pour un retrait.",
        `Pour les données de son propre compte client — identification du gérant et de ses collaborateurs, facturation, assistance, prospection —, Ominin est responsable de traitement. Ces traitements relèvent de la politique de confidentialité publiée à ${LEGAL_PATHS.confidentialite}, non du présent accord.`,
        "L'article 28.10 du RGPD prévoit qu'un sous-traitant qui détermine les finalités et les moyens d'un traitement est considéré comme responsable de ce traitement. C'est la raison pour laquelle la réutilisation prévue à l'article 5 est rédigée comme une instruction du Client : tant qu'elle porte sur des données à caractère personnel, l'anonymisation est exécutée pour le compte du Client et sur son instruction documentée, et non pour le compte propre d'Ominin. Ominin n'agit pour son propre compte qu'à partir du résultat anonyme, qui n'est plus une donnée à caractère personnel.",
      ],
    },
    {
      heading: "Article 3 — Description du traitement",
      body: [
        "Nature des opérations : collecte, enregistrement, organisation, conservation, consultation, transmission aux prestataires nécessaires à l'exécution, effacement.",
        "Finalités : afficher le menu et la boutique du Client, recevoir et acheminer les commandes, permettre le paiement, informer le Convive de l'état de sa commande, mettre à disposition du Client les statistiques d'exploitation de son établissement, assurer l'assistance et la sécurité du service.",
        "Durée : le temps du contrat, sous réserve des durées de conservation propres à chaque catégorie et de l'article 12.",
        "Catégories de données traitées :",
        [
          "Identité de commande : nom ou prénom donné au comptoir, numéro de table, numéro de commande.",
          "Coordonnées de retrait : numéro de téléphone, adresse e-mail, créneau choisi, le cas échéant adresse de livraison.",
          "Contenu de la commande et notes libres adressées au restaurant.",
          "Données de transaction : montant, devise, horodatage, statut, identifiant de paiement, quatre derniers chiffres et marque de la carte lorsqu'ils sont restitués par le prestataire.",
          "Données techniques : horodatage de connexion, adresse IP, identifiant de session, journaux de sécurité.",
        ],
        "Ominin ne collecte ni ne conserve aucun numéro de carte bancaire, date d'expiration ou cryptogramme : la saisie a lieu chez le prestataire de paiement (Stripe, Square), qui en est seul dépositaire. Aucune donnée relevant de l'article 9 du RGPD n'est demandée ; une allergie ou un régime alimentaire mentionné spontanément par un Convive dans une note libre est traité comme un simple commentaire de commande et effacé avec elle.",
        "Catégories de personnes concernées : les Convives du Client, ainsi que les membres du personnel du Client disposant d'un accès à l'espace de gestion.",
      ],
    },
    {
      heading: "Article 4 — Instructions documentées",
      body: [
        "Ominin ne traite les données que sur instruction documentée du Client. Constituent des instructions documentées : le présent accord, les CGV, les paramètres choisis par le Client dans son espace de gestion, et toute demande écrite adressée par le Client au contact indiqué à l'article 14.",
        "Ominin informe le Client si une instruction lui paraît constituer une violation du RGPD ou d'une autre disposition du droit de l'Union ou du droit français relative à la protection des données, et peut en suspendre l'exécution jusqu'à ce que le Client la confirme ou la retire.",
        "Si Ominin est tenu de traiter des données en vertu du droit de l'Union ou du droit français, il en informe le Client avant le traitement, sauf si ce droit interdit une telle information pour des motifs importants d'intérêt public.",
      ],
    },
    {
      heading: "Article 5 — Anonymisation et réutilisation",
      body: [
        "Le Client, en sa qualité de responsable de traitement, donne pour instruction à Ominin d'anonymiser les données à caractère personnel des Convives issues de son établissement.",
        "L'anonymisation est elle-même une opération de traitement portant sur des données à caractère personnel : elle est à ce titre couverte par la présente instruction documentée au sens de l'article 28.3.a du RGPD, et n'a pas d'autre fondement.",
        "Le procédé doit produire un résultat anonyme, et non pseudonyme, au sens du considérant 26 du RGPD : la réidentification ne doit être possible par aucun moyen raisonnablement susceptible d'être utilisé, ni par Ominin ni par un tiers. Il comporte au minimum :",
        [
          "l'agrégation des commandes en séries statistiques, sans conservation de la ligne individuelle identifiante ;",
          "la suppression des identifiants directs : nom, téléphone, e-mail, adresse, identifiants de compte et de paiement ;",
          "la suppression ou la généralisation des identifiants indirects, notamment l'horodatage fin, la localisation précise et les combinaisons rares susceptibles de singulariser une personne ;",
          "l'application de seuils de cohorte : aucune valeur n'est publiée ni conservée lorsqu'elle repose sur un effectif trop faible pour empêcher l'isolement d'une personne ;",
          "l'abandon du texte libre saisi par les Convives, qui ne peut être anonymisé de façon fiable.",
        ],
        "Le simple hachage d'un identifiant, même salé, est une pseudonymisation et non une anonymisation : il ne satisfait pas à la présente instruction et ne suffit pas à faire sortir la donnée du champ du RGPD.",
        "Une fois l'anonymisation effectuée, le résultat ne constitue plus une donnée à caractère personnel et sort du champ du RGPD. Ominin l'utilise alors pour son propre compte, y compris pour développer, entraîner, tester et améliorer des modèles statistiques et d'apprentissage automatique, et pour produire des références sectorielles. Aucun jeu de données anonymisé n'est rattaché nominativement au Client sans son accord écrit.",
        "Le Client peut désactiver cette réutilisation à tout moment depuis son espace de gestion — le réglage prend effet immédiatement — ou, lorsque son offre n'expose pas ce réglage, par simple demande écrite au contact indiqué à l'article 14, qu'Ominin applique sans délai —, sans motif et sans frais. La désactivation prend effet pour l'avenir : elle arrête l'anonymisation à fin de réutilisation ainsi que l'incorporation de nouvelles données, sans affecter les jeux anonymes déjà constitués ni les modèles déjà entraînés, dont le retrait est techniquement impossible. Elle est sans effet sur les données d'exploitation non personnelles du Client, dont l'usage relève de la licence prévue aux CGV.",
        "Ominin fournit au Client la mention à insérer dans sa propre politique de confidentialité à destination des Convives, décrivant cette anonymisation et sa finalité. Le Client s'engage à la publier et à la tenir accessible aux Convives : c'est lui qui, en tant que responsable de traitement, doit l'information prévue aux articles 13 et 14 du RGPD.",
      ],
    },
    {
      heading: "Article 6 — Confidentialité du personnel",
      body: [
        "Ominin veille à ce que les personnes autorisées à traiter les données au titre du présent accord s'engagent à en respecter la confidentialité ou soient soumises à une obligation légale appropriée de confidentialité. Cet engagement survit à la fin de leur collaboration.",
        "L'accès aux données du Client est limité aux personnes qui en ont besoin pour exécuter le service ou fournir l'assistance demandée, et fait l'objet d'une journalisation.",
      ],
    },
    {
      heading: "Article 7 — Sécurité du traitement (art. 32 RGPD)",
      body: [
        "Ominin met en œuvre les mesures techniques et organisationnelles suivantes, au regard de l'état de l'art, des coûts de mise en œuvre et des risques pour les personnes concernées :",
        [
          "chiffrement des données en transit (TLS) et au repos ;",
          "cloisonnement par locataire : les données de chaque établissement sont isolées par des règles de sécurité au niveau des lignes (row level security) appliquées dans la base elle-même, et non seulement dans l'application ;",
          "authentification des comptes de gestion, gestion des sessions et révocation immédiate des accès ;",
          "journalisation des accès et des opérations sensibles, conservée pour permettre l'analyse d'un incident ;",
          "principe du moindre privilège pour les comptes techniques comme pour les personnes ;",
          "sauvegardes régulières, chiffrées et restaurables, dont la restauration est testée ;",
          "revue des dépendances et application des correctifs de sécurité.",
        ],
        "Ces mesures peuvent évoluer ; elles ne peuvent pas être abaissées en deçà du niveau de sécurité décrit ci-dessus pendant la durée du contrat.",
      ],
    },
    {
      heading: "Article 8 — Sous-traitants ultérieurs",
      body: [
        "Le Client donne à Ominin une autorisation écrite générale de recourir à des sous-traitants ultérieurs (art. 28.2 RGPD). Ominin leur impose par contrat les mêmes obligations de protection des données que celles du présent accord et demeure pleinement responsable de leur exécution devant le Client.",
        `La liste ci-dessous est contractuelle. Tout ajout ou remplacement de sous-traitant ultérieur procède par la publication d'une nouvelle version du présent accord, dont la date d'effet est fixée au moins ${PRICE_NOTICE_DAYS} jours après sa publication : le nouveau sous-traitant n'intervient pas avant cette date. La version annoncée est portée dès sa publication à l'adresse ${LEGAL_PATHS.dpa}, avec son numéro, sa date d'effet et le résumé des changements, qui nomme le sous-traitant concerné ; elle est signalée par un bandeau dans l'espace de gestion du Client.`,
        "Le Client peut s'y opposer par écrit pendant ce délai en exposant un motif tiré de la protection des données ; à défaut d'accord, il peut résilier sans frais la partie du service concernée.",
        "Sous-traitants ultérieurs en vigueur à la date du présent accord :",
        subProcessors.map(
          (processor) =>
            `${processor.name} — ${processor.purpose} — ${processor.location} — ${
              processor.training
                ? "entraîne ses propres modèles sur les données confiées"
                : "n'entraîne pas ses propres modèles sur les données"
            }.`
        ),
        "La dernière mention de chaque ligne est là pour que le Client puisse répondre sans réserve à ses propres Convives, et à son expert-comptable ou à son assureur, sur le sort des données confiées : aucun prestataire de cette liste n'entraîne ses modèles sur les données du Client. Seule l'anonymisation prévue à l'article 5, et seulement si elle n'a pas été désactivée, conduit à l'entraînement de modèles — par Ominin, et sur des données qui ne sont plus personnelles.",
      ],
    },
    {
      heading: "Article 9 — Transferts hors de l'Union européenne",
      body: [
        "La localisation de traitement de chaque sous-traitant ultérieur est celle indiquée à l'article 8. Les données sont traitées dans l'Union européenne chaque fois que le prestataire le permet.",
        "Lorsque la localisation mentionne les États-Unis, le transfert repose sur la décision d'adéquation de la Commission européenne du 10 juillet 2023 (EU-US Data Privacy Framework), le prestataire étant certifié à ce cadre, complétée par les clauses contractuelles types de la décision (UE) 2021/914 et par les mesures techniques décrites à l'article 7 — chiffrement en transit et au repos, minimisation des données transmises. Aucun transfert n'a lieu vers un pays tiers non couvert par l'un de ces mécanismes.",
        "Si un mécanisme de transfert venait à être invalidé, Ominin en informe le Client et, à défaut de pouvoir lui substituer un mécanisme valable ou un prestataire situé dans l'Union, suspend le transfert concerné.",
      ],
    },
    {
      heading: "Article 10 — Assistance au responsable de traitement",
      body: [
        "Ominin met à la disposition du Client, dans son espace de gestion, les moyens de répondre lui-même aux demandes d'exercice des droits des Convives : accès, rectification, effacement, limitation, portabilité et opposition (art. 15 à 22 RGPD).",
        "Lorsque la demande excède ces moyens, Ominin y prête son concours dans un délai compatible avec celui d'un mois imparti au Client par l'article 12.3 du RGPD. Si un Convive s'adresse directement à Ominin, celui-ci ne répond pas à sa place : il transmet la demande au Client et en informe le Convive.",
        "Ominin assiste le Client, compte tenu de la nature du traitement et des informations à sa disposition, pour la sécurité (art. 32), la notification des violations (art. 33 et 34), l'analyse d'impact relative à la protection des données (art. 35) et la consultation préalable de la CNIL (art. 36).",
      ],
    },
    {
      heading: "Article 11 — Notification des violations de données",
      body: [
        "Ominin notifie au Client toute violation de données à caractère personnel les concernant sans délai injustifié après en avoir pris connaissance (art. 33.2 RGPD).",
        "Le délai de 72 heures prévu à l'article 33.1 est celui dont dispose le Client, en sa qualité de responsable de traitement, pour notifier la violation à la CNIL. Il ne pèse pas sur Ominin en tant que sous-traitant : l'obligation d'Ominin est de notifier sans délai injustifié, donc assez tôt et assez complètement pour que le Client puisse tenir le sien.",
        "La notification comporte, dans la mesure du possible dès le premier message et à défaut par compléments successifs : la nature de la violation, les catégories et le nombre approximatif de personnes et d'enregistrements concernés, les conséquences probables, les mesures prises ou proposées pour y remédier et en atténuer les effets, et le point de contact d'Ominin.",
        "Ominin documente chaque violation et tient cette documentation à la disposition du Client. Il n'informe pas les Convives à la place du Client : la communication prévue à l'article 34 du RGPD relève du responsable de traitement.",
      ],
    },
    {
      heading: "Article 12 — Sort des données à la fin du contrat",
      body: [
        "Au terme du contrat, quelle qu'en soit la cause, le Client choisit entre la restitution des données et leur effacement. Le choix est exercé par écrit ; à défaut de choix exprimé, Ominin efface les données.",
        "La restitution intervient dans un format structuré et couramment utilisé. La restitution comme l'effacement sont exécutés au plus tard au terme du préavis de résiliation prévu aux CGV. Les copies présentes dans les sauvegardes sont purgées à l'échéance de leur cycle de rotation, sans réutilisation entre-temps.",
        "Ominin peut conserver les données dont la conservation lui est imposée par le droit de l'Union ou le droit français, notamment les pièces comptables, pour la seule durée prescrite et sans autre usage.",
        "Par exception, ne sont affectés ni par la restitution ni par l'effacement : les jeux de données déjà anonymisés au titre de l'article 5, qui ne sont plus des données à caractère personnel, et les modèles déjà entraînés à partir d'eux. Cette exception correspond à la clause de survie des CGV.",
      ],
    },
    {
      heading: "Article 13 — Audit et documentation",
      body: [
        "Ominin met à la disposition du Client les informations nécessaires pour démontrer le respect des obligations de l'article 28 du RGPD (art. 28.3.h).",
        "Le Client peut faire réaliser un audit, par lui-même ou par un auditeur indépendant qu'il mandate et qui ne soit pas un concurrent d'Ominin, sur préavis écrit raisonnable, une fois par période de douze mois — sauf incident de sécurité avéré ou demande d'une autorité de contrôle, qui ouvrent un audit supplémentaire.",
        "L'audit se déroule pendant les heures ouvrées, sans perturbation disproportionnée du service, sous engagement de confidentialité, et ne donne pas accès aux données des autres clients d'Ominin. Il est réalisé aux frais du Client. Ominin peut y répondre par la production de documentation ou d'attestations de ses propres prestataires lorsqu'elles couvrent le périmètre demandé.",
      ],
    },
    {
      heading: "Article 14 — Registre et contact",
      body: [
        "Ominin tient le registre des catégories d'activités de traitement effectuées pour le compte de ses clients prévu à l'article 30.2 du RGPD, et le communique sur demande à l'autorité de contrôle ainsi qu'au Client pour la partie qui le concerne.",
        `Toute question, instruction, opposition à un sous-traitant ultérieur ou demande d'audit au titre du présent accord est adressée à ${contactEmail}. L'identité et l'adresse postale de l'éditeur figurent aux mentions légales publiées à ${LEGAL_PATHS.mentions}.`,
      ],
    },
  ],
};
