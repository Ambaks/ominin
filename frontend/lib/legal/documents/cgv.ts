/*
 * Conditions générales de vente et d'abonnement.
 *
 * Aucun montant n'est écrit ici : les prix viennent de lib/landing-data.ts,
 * les délais de ../constants. L'annexe tarifaire est engendrée depuis ces
 * données et entre dans l'empreinte du document (../hash) : changer un prix
 * change l'empreinte, ce qui impose une nouvelle version — donc le préavis de
 * l'article 9 et la réacceptation.
 */
import {
  collectOffer,
  contactEmail,
  pricingSection,
  starterKit,
  type Plan,
} from "@/lib/landing-data";
import { shopBrand, shopOffer } from "@/lib/shop-landing-data";
// La commission du click & collect n'est chiffrée nulle part ailleurs : c'est
// le taux qui alimente le comparateur public. Le contrat cite celui-là, sans
// quoi la page et l'annexe pourraient diverger.
import {
  PRICE_NOTICE_DAYS,
  WITHDRAWAL_DAYS,
  editorLegalName,
  editor,
  LEGAL_PATHS,
} from "../constants";
import { euros, parisEffectiveDate } from "../format";
import type { LegalArticle, LegalDocument } from "../types";

const plans: Plan[] = pricingSection.plans;
/*
 * Offre à mois offerts, s'il y en a une. Cherchée par sa caractéristique et
 * non par son identifiant : le jour où les mois offerts s'arrêtent, ou où
 * l'offre change de nom, l'article disparaît du contrat — il n'a plus d'objet
 * — au lieu de faire échouer l'import et, avec lui, les pages publiques et
 * les deux routes de paiement.
 */
const trialPlan = plans.find((plan) => plan.trial);

/** `PlanCommission.percent` compte des points ; le comparateur stocke un ratio. */
const points = (value: number) => `${value.toLocaleString("fr-FR")} %`;
const collectCommission = points(collectOffer.commission.percent);

const starterLines = [starterKit.cachet, starterKit.shipping, starterKit.omilink];

const planTariff = (plan: Plan) => {
  const parts = [`${plan.name} — ${euros(plan.price)} par mois`];
  if (plan.commission) parts.push(`${points(plan.commission.percent)} ${plan.commission.basis}`);
  if (plan.trial) parts.push(`${plan.trial.months} premiers mois offerts (article 13)`);
  return `${parts.join(" ; ")}.`;
};

/*
 * Offre boutique. Tant qu'elle n'est pas publiée, ses deux prix valent zéro
 * dans shop-landing-data : les imprimer annoncerait une gratuité qu'Ominin
 * n'accorde pas. L'annexe renvoie alors au devis, et la ligne chiffrée paraît
 * le jour où les montants sont arrêtés — l'empreinte change, la procédure de
 * l'article 9 s'applique.
 *
 * Un montant non nul laissé sur une offre non publiée est chiffré lui aussi :
 * setup-stripe crée le prix dès qu'il sort de zéro, donc il est facturé, et
 * une somme facturée ne peut pas rester hors de l'annexe.
 */
const shopPriced =
  shopOffer.published || shopOffer.monthlyPrice > 0 || shopOffer.setupPrice > 0;

const shopTariffLines = [
  ...(shopPriced
    ? [
        `Abonnement — ${euros(shopOffer.monthlyPrice)} par mois et par Boutique.`,
        `Mise en place — ${euros(shopOffer.setupPrice)}, réglés une seule fois à l'ouverture de la Boutique.`,
      ]
    : [
        "Abonnement mensuel et frais de mise en place — fixés individuellement, selon le nombre de références et le travail de construction de la Boutique. Aucun tarif public n'est arrêté pour cette offre à la date des présentes.",
        "Les montants dus sont ceux du devis accepté par le Client avant la souscription ; ils lui sont rappelés au récapitulatif de commande et conservés avec son acceptation (article 5).",
      ]),
  "La mise en place n'est pas une Commande de démarrage au sens de l'article 10 : elle rémunère la construction de la Boutique et ne comprend aucune fourniture.",
];

const commissionLines = [
  ...plans.flatMap((plan) =>
    plan.commission
      ? [`${plan.name} — ${points(plan.commission.percent)} ${plan.commission.basis}.`]
      : []
  ),
  `${collectOffer.name} — ${collectCommission} des commandes à emporter payées en ligne.`,
];

const articles: LegalArticle[] = [
  {
    heading: "Article 1 — Objet et champ d'application",
    body: [
      `Les présentes conditions générales de vente et d'abonnement (les « CGV ») régissent la fourniture par ${editorLegalName} (« Ominin ») de ses services logiciels destinés aux professionnels : pour la restauration, carte digitale accessible par QR code, commande et paiement à table et commande à emporter ; pour le professionnel qui vend ses propres produits, la boutique de vente en ligne publiée sous l'offre ${shopBrand}. Chacun de ces services comprend l'espace de gestion associé.`,
      "Conformément à l'article L441-1 du code de commerce, elles constituent le socle unique de la négociation commerciale. Elles prévalent sur tout document émanant du Client, notamment ses conditions générales d'achat, expressément écartées. Toute dérogation suppose un écrit accepté par les deux parties.",
      "Les Services sont réservés aux professionnels agissant pour les besoins de leur activité. Ominin ne contracte pas avec des consommateurs ; le Convive, lui, ne contracte jamais avec Ominin (article 4).",
      `La souscription emporte acceptation sans réserve des CGV, de l'Annexe tarifaire (Annexe 1) et de l'accord de sous-traitance publié à l'adresse ${LEGAL_PATHS.dpa}, qui en font partie intégrante.`,
    ],
  },
  {
    heading: "Article 2 — Identité de l'éditeur",
    body: [
      `Les Services sont édités et exploités par ${editorLegalName}, ${editor.status}.`,
      `Le numéro d'identification, l'adresse de l'établissement, les coordonnées de contact et l'identité des hébergeurs figurent aux mentions légales, publiées à l'adresse ${LEGAL_PATHS.mentions} et tenues à jour.`,
      `Toute notification adressée à Ominin au titre des présentes est valablement faite par courrier électronique à ${contactEmail}.`,
    ],
  },
  {
    heading: "Article 3 — Définitions",
    body: [
      "Les termes suivants ont, au singulier comme au pluriel, le sens ci-après :",
      [
        "« Client » : le professionnel, personne physique ou morale, qui souscrit un abonnement aux Services pour les besoins de son activité.",
        "« Établissement » : chaque point de vente du Client pour lequel les Services sont activés. L'abonnement est dû par Établissement.",
        `« Boutique » : la boutique de vente en ligne ouverte au nom du Client au titre de l'offre ${shopBrand}, avec son espace de gestion. Elle vaut Établissement pour l'application des présentes, l'abonnement étant dû par Boutique.`,
        "« Services » : les fonctionnalités logicielles mises à disposition au titre de l'offre souscrite, telles que décrites à l'Annexe tarifaire et dans l'espace de gestion.",
        "« Convive » : la personne qui consulte la carte, commande ou paye depuis un support fourni par le Client — QR code de table, page de commande à emporter, Boutique. Le Convive est le client du Client.",
        "« Annexe tarifaire » : l'Annexe 1, qui fixe les prix, commissions et frais applicables. Elle est contractuelle et versionnée avec les présentes.",
        "« Commande de démarrage » : les fournitures et matériels réglés une seule fois à l'ouverture du service (article 10).",
      ],
    ],
  },
  {
    heading: "Article 4 — Rôle d'Ominin : prestataire technique",
    body: [
      "Ominin fournit un outil. Ominin n'est jamais partie au contrat de vente conclu entre le Client et le Convive.",
      "La vente des plats, boissons et autres produits est conclue directement entre le Client, seul vendeur, et le Convive. Le Client en fixe le prix, en perçoit le produit et en assume seul la responsabilité.",
      "Relèvent de la seule responsabilité du Client, sans que cette énumération soit limitative :",
      [
        "l'exactitude, la mise à jour et la loyauté des informations publiées : dénomination des produits, composition, prix, disponibilité, horaires et conditions de retrait ;",
        "l'information sur les allergènes et les mentions obligatoires relatives aux denrées alimentaires, notamment au titre du règlement (UE) n° 1169/2011 dit INCO et des textes pris pour son application, ainsi que la mention « fait maison », l'origine des viandes et l'affichage des prix ;",
        "l'hygiène, la sécurité alimentaire, la conformité de l'Établissement et les déclarations qui s'y rattachent ;",
        "la remise des notes, tickets et factures dus au Convive, et la conservation des données de caisse imposée par la réglementation applicable à son activité ;",
        "ses propres mentions légales, conditions de vente et politique de confidentialité à l'égard des Convives, ainsi que le traitement des réclamations, remboursements et litiges de consommation.",
      ],
      "Ominin met à disposition les champs, gabarits et emplacements permettant de porter ces informations ; il n'en contrôle ni la teneur ni l'exactitude. Le Client garantit Ominin contre toute réclamation d'un Convive, d'un tiers ou d'une autorité trouvant sa cause dans le contenu qu'il publie ou dans l'exécution de la vente.",
      "Lorsque le paiement en ligne est activé, les fonds sont encaissés par le prestataire de paiement sur le compte ouvert au nom du Client auprès de ce prestataire. Ominin n'encaisse pas le prix des ventes pour le compte du Client et n'exerce aucune activité de services de paiement.",
    ],
  },
  {
    heading: "Article 5 — Souscription et formation du contrat",
    body: [
      "La souscription s'effectue en ligne. Le Client renseigne les informations demandées, prend connaissance des présentes et les accepte en cochant la case prévue à cet effet, puis valide et règle sa commande.",
      "Conformément aux articles 1127-1 et 1127-2 du code civil, le Client peut vérifier le détail de sa commande et son prix total, et corriger d'éventuelles erreurs, avant de la confirmer. Le contrat est formé au second clic, celui qui vaut confirmation de la commande.",
      "Ominin conserve, pour chaque acceptation, la version acceptée et son empreinte, la date et l'heure du clic avec les éléments techniques de la connexion, ainsi que le relevé chiffré des conditions financières acceptées à cet instant — offre souscrite, mensualité, commission et sommes réglées à la souscription. Ce relevé établit entre les parties ce qui a été accepté ; les évolutions ultérieures des tarifs ne le modifient pas.",
      `Les présentes sont accessibles à tout moment à l'adresse ${LEGAL_PATHS.cgv} et depuis l'espace de gestion du Client, dans un format permettant leur consultation, leur téléchargement, leur impression et leur conservation. La version acceptée par le Client, identifiée par son numéro et son empreinte, lui est communiquée sur demande à ${contactEmail}.`,
    ],
  },
  {
    heading: "Article 6 — Durée, reconduction et résiliation",
    body: [
      "L'abonnement est souscrit pour une période d'un mois courant à compter de son activation. Il se reconduit tacitement de mois en mois, sans durée minimale ni engagement.",
      `Chaque partie peut résilier à tout moment, sans motif ni pénalité, depuis l'espace de gestion ou par courrier électronique à ${contactEmail}. La résiliation prend effet au terme de la période en cours : les Services restent accessibles jusque-là et la mensualité déjà réglée n'est pas remboursée au prorata.`,
      "Ominin peut résilier de plein droit, après mise en demeure restée sans effet, en cas de défaut de paiement ou de manquement grave du Client, notamment un usage des Services contraire à la loi ou portant atteinte à la sécurité de la plateforme.",
      "Le formalisme de reconduction de l'article L215-1 du code de la consommation ne s'applique pas entre professionnels. Il est ici sans objet, la résiliation étant ouverte à tout moment et sans préavis.",
      `À la résiliation, le Client exporte ses données depuis l'espace de gestion. Leur sort est ensuite réglé par l'accord de sous-traitance (${LEGAL_PATHS.dpa}) et par l'article 14.`,
    ],
  },
  {
    heading: "Article 7 — Droit de rétractation",
    body: [
      "Le droit de rétractation n'est pas dû entre professionnels. L'article L221-3 du code de la consommation l'étend toutefois au professionnel employant cinq salariés au plus lorsque le contrat, conclu hors établissement, n'entre pas dans le champ de son activité principale — qualification discutée s'agissant d'un logiciel de restaurant. Plutôt que d'en débattre, Ominin l'accorde contractuellement.",
      `Le Client dispose de ${WITHDRAWAL_DAYS} jours à compter de la souscription pour se rétracter de son abonnement, sans motif ni pénalité. Il notifie sa décision par une déclaration dénuée d'ambiguïté adressée à ${contactEmail} ; le formulaire de l'Annexe 2 peut être utilisé. Les sommes versées au titre de l'abonnement sont remboursées dans les ${WITHDRAWAL_DAYS} jours suivant la réception de la demande.`,
      `La rétractation ne porte pas sur les Cachets imprimés de la Commande de démarrage : confectionnés à la marque et aux références du Client, ce sont des biens nettement personnalisés, exclus du droit de rétractation par l'article L221-28 3° du code de la consommation. Ils restent dus dès leur mise en fabrication. Le ${starterKit.omilink.name}, s'il a été commandé, est remboursé sur retour en état neuf dans son emballage d'origine, les frais de retour restant à la charge du Client.`,
      "Le Client qui demande l'exécution immédiate des Services pendant le délai reste redevable du montant correspondant au service fourni jusqu'à sa rétractation.",
    ],
  },
  {
    heading: "Article 8 — Prix et Annexe tarifaire",
    body: [
      "Les prix des abonnements, le taux des commissions et les frais de la Commande de démarrage sont fixés à l'Annexe 1. Aucun montant ne figure dans le corps des présentes : l'Annexe tarifaire est la seule source des chiffres, et elle est versionnée avec les CGV.",
      "Lorsque l'Annexe tarifaire indique qu'une offre est tarifée individuellement, les montants applicables sont ceux du devis accepté par le Client, repris au relevé conservé avec son acceptation (article 5). Leur révision suppose un nouveau devis accepté par le Client ; à défaut d'acceptation, le prix convenu reste dû et le Client conserve la faculté de résilier prévue à l'article 6.",
      `Les prix s'entendent en euros et par Établissement. ${editor.vatMention} : aucune taxe sur la valeur ajoutée n'est facturée au Client, qui ne peut donc en déduire aucune.`,
      "Les commissions de l'article 12 s'ajoutent à l'abonnement. Les frais propres au prestataire de paiement retenu par le Client — commissions d'encaissement, frais de virement, frais de contestation — sont dus par le Client à ce prestataire et ne sont pas compris dans les prix d'Ominin.",
    ],
  },
  {
    heading: "Article 9 — Révision des tarifs",
    body: [
      "Ominin peut réviser ses tarifs, qu'il s'agisse du montant des abonnements, du taux des commissions ou des frais de la Commande de démarrage.",
      `Toute révision procède par la publication d'une nouvelle version des présentes, Annexe tarifaire comprise, dont la date d'effet est fixée au moins ${PRICE_NOTICE_DAYS} jours après sa publication. Le Client en est informé dès la publication, donc au moins ${PRICE_NOTICE_DAYS} jours avant cette date d'effet : par courrier électronique à l'adresse renseignée dans son compte et par un bandeau affiché dans son espace de gestion, l'un et l'autre indiquant les modifications apportées et la date d'effet.`,
      "À compter de la date d'effet, l'accès aux Services est subordonné à l'acceptation de la nouvelle version. Le Client qui l'accepte accepte les nouveaux tarifs ; la poursuite de l'utilisation des Services après cette acceptation vaut accord sur ceux-ci.",
      "Le Client qui refuse la nouvelle version résilie son abonnement : celui-ci prend fin au terme de la période en cours, au tarif antérieur, sans pénalité ni indemnité. Aucun rattrapage n'est réclamé — ni les mois offerts déjà consommés, ni les remises accordées, ni les frais de la Commande de démarrage ne font l'objet d'une reprise.",
      "Aucune révision n'est rétroactive : une période déjà réglée le reste au prix accepté.",
      `Si Ominin vient à dépasser les seuils de la franchise en base et doit facturer la taxe sur la valeur ajoutée, celle-ci s'ajoute aux prix. Cette évolution suit la même procédure : nouvelle version, préavis d'au moins ${PRICE_NOTICE_DAYS} jours, puis réacceptation ou résiliation sans frais.`,
    ],
  },
  {
    heading: "Article 10 — Commande de démarrage",
    body: [
      `L'ouverture du service donne lieu à une commande réglée en une fois : un ${starterKit.cachet.name} par table, à ${euros(starterKit.cachet.price)} l'unité, la livraison de l'envoi à ${euros(starterKit.shipping.price)} et, en option sur les offres comportant la commande à table, le ${starterKit.omilink.name} à ${euros(starterKit.omilink.price)}, qui relie les Services aux imprimantes tickets de l'Établissement.`,
      "Les Cachets sont imprimés à la marque du Client, d'après les éléments qu'il fournit et dont il garantit détenir les droits. Ils sont expédiés à l'adresse indiquée à la souscription, dans les pays desservis rappelés au récapitulatif de commande.",
      "Les matériels livrés sont vendus : la propriété en est transférée au paiement intégral du prix, les risques à la livraison.",
      "La Commande de démarrage est due une seule fois. Le Client qui résilie puis souscrit de nouveau pour le même Établissement, avec le même matériel, ne la règle pas une seconde fois ; seuls les Cachets supplémentaires et le remplacement de matériel sont facturés.",
    ],
  },
  {
    heading: "Article 11 — Paiement",
    body: [
      "Les abonnements sont payables mensuellement et d'avance, par prélèvement sur le moyen de paiement enregistré par le Client auprès de Stripe, prestataire de paiement d'Ominin. La Commande de démarrage est réglée à la souscription.",
      "Les coordonnées bancaires du Client ne transitent pas par Ominin et n'y sont pas conservées.",
      // Les deux seuls chiffres écrits en clair du document. Ils sont fixés par
      // l'article D441-5 du code de commerce, pas par Ominin : les servir
      // depuis landing-data laisserait croire qu'un déploiement peut les
      // changer, et les recopier faux exposerait à l'amende de L441-16.
      "Toute somme non réglée à l'échéance porte, de plein droit et sans mise en demeure préalable, intérêts de retard au taux appliqué par la Banque centrale européenne à son opération de refinancement la plus récente, majoré de 10 points de pourcentage. Le Client est en outre redevable d'une indemnité forfaitaire pour frais de recouvrement de 40 €, sans préjudice d'une indemnisation complémentaire sur justificatifs lorsque les frais exposés sont supérieurs (articles L441-10 et D441-5 du code de commerce).",
      "En cas d'échec du prélèvement, Ominin en informe le Client et représente le paiement. Après mise en demeure restée sans effet, Ominin peut suspendre l'accès aux Services jusqu'au règlement ; la suspension n'interrompt pas le cours des mensualités dues.",
    ],
  },
  {
    heading: "Article 12 — Commission",
    body: [
      "Certaines offres comportent une commission, qui s'ajoute à l'abonnement :",
      commissionLines,
      "La commission ne porte que sur les paiements encaissés en ligne par l'intermédiaire des Services. Les règlements en espèces, par carte au comptoir, sur un terminal de paiement du Client ou par tout autre moyen extérieur aux Services n'en supportent aucune.",
      "Elle est calculée sur le montant payé par le Convive, pourboires exclus, et prélevée ou facturée mensuellement selon le mode d'encaissement retenu. Les commandes annulées et les sommes remboursées au Convive donnent lieu à restitution de la commission correspondante.",
      "Elle est distincte des frais du prestataire de paiement, qui s'y ajoutent et sont dus par le Client à ce prestataire.",
    ],
  },
  ...(trialPlan?.trial
    ? [
        {
          heading: "Article 13 — Mois offerts",
          body: [
            `L'offre ${trialPlan.name} s'ouvre sur ${trialPlan.trial.months} mois offerts : l'abonnement n'est pas dû pendant cette période. Seules la commission de l'article 12 et la Commande de démarrage le sont.`,
            `À leur terme, le chiffre d'affaires encaissé par l'intermédiaire des Services sur ces ${trialPlan.trial.months} mois tranche une fois pour toutes. S'il atteint ${euros(trialPlan.trial.exemptionRevenue)}, l'abonnement reste à ${euros(0)} définitivement, la commission rémunérant seule le service. À défaut, le prix mensuel de l'offre, tel que fixé à l'Annexe 1, commence à courir.`,
            "Le calcul est arrêté une seule fois, à l'échéance des mois offerts, et n'est pas révisé ensuite, dans un sens comme dans l'autre. Le relevé retenu est consultable dans l'espace de gestion.",
            "Le bénéfice des mois offerts est acquis : une résiliation pendant ou après cette période ne donne lieu à aucun rattrapage.",
          ],
        },
      ]
    : []),
  {
    heading: "Article 14 — Données et amélioration des Services",
    body: [
      "Les Services produisent deux natures de données, qui ne suivent pas le même régime.",
      "Données d'exploitation — Il s'agit des données non personnelles issues de l'exploitation de l'Établissement : cartes et fiches produits, prix, volumes et horaires de commande, niveaux de stock, factures fournisseurs et données de coût, paramètres de configuration. Le Client en reste propriétaire.",
      "Le Client concède à Ominin, sur ces données d'exploitation, une licence non exclusive, mondiale, irrévocable, gratuite et perpétuelle de les utiliser, reproduire, stocker, adapter, agréger, d'en tirer des statistiques et des données dérivées, et de développer, entraîner, tester et améliorer des modèles statistiques et d'apprentissage automatique.",
      "Ce qui sort de ces traitements est agrégé ou dérivé : il ne permet ni d'identifier un Établissement, ni de reconstituer ses chiffres, et les données d'exploitation ne sont jamais republiées telles quelles.",
      `Données personnelles des Convives — Ominin les traite en qualité de sous-traitant du Client, pour les seules finalités et selon les seules instructions décrites à l'accord de sous-traitance (${LEGAL_PATHS.dpa}). Elles ne sont pas couvertes par la licence ci-dessus.`,
      "Le Client donne pour instruction documentée à Ominin de les anonymiser, au sens du règlement général sur la protection des données, avant toute réutilisation. Seul le résultat anonymisé — dont une personne ne peut plus être réidentifiée, y compris par recoupement — entre dans les traitements d'amélioration des Services. L'anonymisation est irréversible et fait sortir le résultat du champ des données à caractère personnel.",
      `Opposition — Le Client peut, à tout moment et sans frais, s'opposer à la réutilisation du résultat anonymisé pour l'entraînement de modèles : depuis son espace de gestion, ou par demande écrite à ${contactEmail} lorsque son offre n'expose pas ce réglage. L'opposition vaut pour l'avenir ; elle n'affecte ni la licence sur les données d'exploitation, ni le fonctionnement des Services.`,
      "Survie — La licence survit à la résiliation, quelle qu'en soit la cause. Les modèles déjà entraînés n'ont pas à être réentraînés, et les statistiques et données dérivées déjà produites n'ont pas à être détruites : elles ne sont ni séparables ni réversibles. Les données d'exploitation elles-mêmes sont supprimées ou restituées dans les conditions de l'accord de sous-traitance.",
      // La contrepartie est écrite, et non sous-entendue : une licence perpétuelle
      // consentie à titre gratuit s'attaque sur le terrain du déséquilibre
      // significatif (art. 1171 code civil, art. L442-1 code de commerce). Nommer
      // l'avantage reçu répond d'avance à ce grief.
      "Contrepartie — En contrepartie de cette licence, le Client bénéficie sans supplément de prix des fonctionnalités que cette mise en commun rend possibles : comparaison de ses performances avec des établissements semblables, prévision des ventes et des besoins, reconnaissance automatique des factures fournisseurs, recommandations de carte et de prix, et améliorations continues qui en découlent. Les parties conviennent que cet avantage constitue la contrepartie de la licence consentie.",
      `Aucun tiers n'entraîne ses propres modèles sur les données du Client. Les prestataires auxquels Ominin recourt sont énumérés, avec cette mention, au tableau des sous-traitants ultérieurs de l'accord de sous-traitance (${LEGAL_PATHS.dpa}).`,
    ],
  },
  {
    heading: "Article 15 — Propriété intellectuelle",
    body: [
      "Ominin conserve l'intégralité des droits de propriété intellectuelle sur la plateforme : code, interfaces, bases de données, marques, documentation et savoir-faire. L'abonnement confère au Client un droit d'usage personnel, non exclusif et non cessible des Services, pour la durée du contrat et pour les besoins de son activité.",
      "Le Client conserve l'intégralité des droits sur ses contenus : cartes, descriptions, photographies, marques, logos et éléments graphiques. Il concède à Ominin la seule licence nécessaire à l'exécution du contrat — héberger, reproduire, adapter aux formats d'affichage et diffuser ces contenus sur les supports des Services — pour la durée du contrat, à laquelle elle prend fin.",
      "Le Client garantit détenir les droits sur les contenus qu'il transmet, notamment sur les photographies et les marques de tiers, et garantit Ominin contre toute réclamation à ce titre.",
      "Le Client s'interdit de décompiler, désassembler ou tenter d'extraire le code des Services, hors les cas prévus par l'article L122-6-1 du code de la propriété intellectuelle.",
      "Ominin peut citer le nom et le logo du Client comme référence commerciale ; le Client peut s'y opposer à tout moment, par simple demande.",
    ],
  },
  {
    heading: "Article 16 — Disponibilité et maintenance",
    body: [
      "Ominin met en œuvre les moyens raisonnables pour assurer la disponibilité et la continuité des Services. Cette obligation est de moyens, non de résultat : aucun taux de disponibilité n'est garanti, les Services reposant sur des réseaux et des prestataires tiers dont Ominin ne maîtrise pas le fonctionnement.",
      "Ominin peut interrompre les Services pour maintenance. Les interventions programmées sont annoncées et, dans la mesure du possible, conduites hors des heures de service. Les interventions urgentes, notamment de sécurité, peuvent avoir lieu sans préavis.",
      "Ominin fait évoluer les Services : une fonctionnalité peut être modifiée ou retirée. Lorsque le retrait affecte substantiellement l'offre souscrite, il suit la procédure de l'article 9.",
      "Il appartient au Client de prévoir un mode de fonctionnement dégradé — carte imprimée, prise de commande manuelle, encaissement au comptoir — lui permettant de poursuivre son service en cas d'indisponibilité.",
    ],
  },
  {
    heading: "Article 17 — Responsabilité",
    body: [
      "Chaque partie répond des dommages qu'elle cause à l'autre dans les conditions du droit commun.",
      "La responsabilité d'Ominin, toutes causes confondues et tous préjudices réunis, est limitée au montant des sommes effectivement versées par le Client au titre des Services au cours des douze mois précédant le fait générateur du dommage.",
      "Ominin ne répond pas des dommages indirects, notamment perte d'exploitation, perte de chiffre d'affaires, de marge, de clientèle ou de données commerciales, ni du préjudice d'image.",
      "Ominin ne répond pas davantage des conséquences des contenus publiés par le Client (article 4), du défaut de connectivité de l'Établissement, de la défaillance des matériels du Client ou d'un tiers, ni des manquements du prestataire de paiement retenu par le Client.",
      // Sans cette réserve, le plafond tomberait en entier : une limitation qui
      // couvre la faute lourde ou dolosive prive l'obligation essentielle de sa
      // substance et est réputée non écrite (art. 1170 code civil).
      "Ces limitations ne s'appliquent ni en cas de faute lourde ou dolosive, ni en cas de dommage corporel, ni dans les cas où la loi les interdit.",
    ],
  },
  {
    heading: "Article 18 — Force majeure",
    body: [
      "Aucune des parties n'est responsable de l'inexécution de ses obligations lorsqu'elle résulte d'un cas de force majeure au sens de l'article 1218 du code civil.",
      "L'exécution est suspendue pendant la durée de l'empêchement. Si l'empêchement est définitif, ou s'il se prolonge au point de priver le contrat de son intérêt, chaque partie peut y mettre fin de plein droit par notification écrite, sans indemnité.",
      "L'obligation de régler les sommes échues n'est pas suspendue par la force majeure.",
    ],
  },
  {
    heading: "Article 19 — Confidentialité",
    body: [
      "Chaque partie tient confidentielles les informations non publiques reçues de l'autre à l'occasion du contrat, notamment les données commerciales, les volumes d'activité, les conditions financières négociées et les éléments techniques de la plateforme. Elle ne les communique qu'aux membres de son personnel et à ses prestataires qui en ont besoin, et les tient au même engagement.",
      "Cet engagement ne s'étend pas aux informations publiques, déjà connues de la partie qui les reçoit, développées indépendamment, ou dont la divulgation est imposée par la loi ou une autorité — auquel cas la partie tenue de divulguer en informe l'autre sans délai, si la loi le permet.",
      "Il vaut pendant la durée du contrat et pour une durée de cinq ans après son terme.",
      "Les traitements prévus à l'article 14 ne constituent pas un manquement à la confidentialité, leur résultat étant agrégé ou anonymisé.",
    ],
  },
  {
    heading: "Article 20 — Cession",
    body: [
      "Le Client ne peut céder le contrat sans l'accord écrit préalable d'Ominin ; cet accord ne peut être refusé sans motif légitime et est réputé acquis en cas de cession du fonds de commerce de l'Établissement à un repreneur qui en poursuit l'exploitation.",
      // Le passage en société est prévu : sans cette clause, il faudrait faire
      // resigner chaque client au moment de l'apport du fonds à la structure.
      "Ominin peut céder ou transmettre le contrat, en tout ou partie, à toute entité constituée pour poursuivre son activité — notamment lors d'un passage en société — ainsi que dans le cadre d'une fusion, d'un apport ou d'une cession de son activité.",
      "La cession est notifiée au Client. Elle emporte transfert des présentes aux mêmes conditions, tarifs compris. Le Client conserve son droit de résilier à tout moment dans les conditions de l'article 6 ; l'opération ne lui ouvre droit à aucune indemnité.",
    ],
  },
  {
    heading: "Article 21 — Sous-traitance et conformité au RGPD",
    body: [
      `Pour les traitements de données à caractère personnel réalisés pour le compte du Client, Ominin agit en qualité de sous-traitant au sens de l'article 28 du règlement général sur la protection des données. L'accord de sous-traitance publié à l'adresse ${LEGAL_PATHS.dpa} en règle l'objet, la durée, les finalités, les catégories de données, les mesures de sécurité, le recours à des sous-traitants ultérieurs et le sort des données au terme du contrat. Il fait partie intégrante des présentes et est accepté avec elles.`,
      "Le Client est responsable de traitement pour les données des Convives et de son personnel : il lui appartient de disposer d'une base légale, d'informer les personnes concernées et de tenir son registre.",
      "Ominin peut recourir à de nouveaux sous-traitants ultérieurs. Le Client en est informé préalablement et peut s'y opposer dans les conditions prévues par l'accord de sous-traitance.",
      `Pour ses traitements propres — relation client, facturation, sécurité — Ominin agit en qualité de responsable de traitement ; ils sont décrits dans sa politique de confidentialité, publiée à l'adresse ${LEGAL_PATHS.confidentialite}.`,
    ],
  },
  {
    heading: "Article 22 — Réclamations, droit applicable et juridiction",
    body: [
      `Toute réclamation est adressée à ${contactEmail}. Ominin en accuse réception et y répond dans les meilleurs délais. Les parties s'efforcent de régler amiablement leurs différends avant toute action.`,
      "Le dispositif de médiation de la consommation ne s'applique pas : le Client contracte en qualité de professionnel.",
      "Les présentes sont soumises au droit français, à l'exclusion de ses règles de conflit de lois et de la Convention de Vienne sur la vente internationale de marchandises.",
      "À défaut de résolution amiable, tout litige relatif à la formation, l'interprétation, l'exécution ou la rupture des présentes relève de la compétence exclusive des tribunaux du ressort du siège d'Ominin, y compris en cas de pluralité de défendeurs, d'appel en garantie ou de procédure d'urgence. Conclue entre personnes contractant toutes en qualité de professionnel et spécifiée de façon très apparente, cette clause attributive de compétence est valable au regard de l'article 48 du code de procédure civile.",
    ],
  },
  {
    heading: "Annexe 1 — Annexe tarifaire",
    body: [
      "La présente annexe est contractuelle. Elle est publiée avec les CGV, porte le même numéro de version et ne peut être modifiée que selon la procédure de l'article 9.",
      `Les prix s'entendent en euros, par Établissement et par mois. ${editor.vatMention}.`,
      "Abonnements :",
      [...plans.map(planTariff),
        `${collectOffer.name} — ${euros(collectOffer.price)} par mois ; ${collectCommission} des commandes à emporter payées en ligne.`,
        `${collectOffer.bundle.name} — ${euros(collectOffer.bundle.price)} par mois ; ${collectCommission} des commandes à emporter payées en ligne, aucune commission sur le service à table.`,
      ],
      `${shopBrand} — ${shopOffer.name} :`,
      shopTariffLines,
      "Commande de démarrage, réglée une seule fois à la souscription (article 10) :",
      starterLines.map((line) =>
        line.id === starterKit.cachet.id
          ? `${line.name} — ${euros(line.price)} par table : ${line.tagline}`
          : `${line.name} — ${euros(line.price)} : ${line.tagline}`
      ),
      "S'y ajoutent, le cas échéant, les frais du prestataire de paiement retenu par le Client, qui ne sont pas perçus par Ominin.",
      "Les montants ci-dessus sont ceux en vigueur à la date d'effet indiquée en tête des présentes.",
    ],
  },
  {
    heading: "Annexe 2 — Formulaire de rétractation",
    body: [
      `À compléter et à renvoyer uniquement si vous souhaitez vous rétracter de votre abonnement dans le délai de ${WITHDRAWAL_DAYS} jours prévu à l'article 7. Les Cachets imprimés, biens nettement personnalisés, en sont exclus.`,
      [
        `À l'attention de ${editorLegalName} — ${contactEmail}`,
        "Je vous notifie par la présente ma rétractation du contrat d'abonnement aux Services Ominin.",
        "Offre souscrite :",
        "Établissement et adresse :",
        "Date de souscription :",
        "Nom du professionnel souscripteur :",
        "Adresse de courrier électronique du compte :",
        "Date :",
        "Signature (uniquement en cas de notification sur papier) :",
      ],
    ],
  },
];

export const cgv: LegalDocument = {
  doc: "cgv",
  version: "2026-09-22",
  effectiveFrom: parisEffectiveDate("2026-09-22"),
  title: "Conditions générales de vente et d'abonnement",
  lead: "Contrat d'abonnement entre Ominin et les professionnels de la restauration qui souscrivent ses services. Les prix figurent à l'Annexe tarifaire, qui fait partie du contrat.",
  summary: "Première version.",
  articles,
};
