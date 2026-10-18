import { compatibleTills, connectCommission, contactEmail, starterKit } from "@/lib/landing-data";
import { decimal, euros, percent, thousands } from "@/lib/pitch/kit";
import type { Source } from "@/lib/pitch/types";
import { menuPrintUrl } from "@/lib/site";

/*
 * Le pitch aux restaurants-chicha (www.ominin.com/chicha), envoyé par e-mail
 * avec la carte en ligne de BOHO. Typographie : celle de kit.ts.
 *
 * La référence est notre restaurant pilote, BOHO, à Toulouse : nommé dans
 * « BOHO nous a fait confiance » et sur les liens vers sa carte, « notre
 * restaurant pilote » partout ailleurs. Choix du propriétaire d'Ominin : des
 * totaux arrondis, des taux et des heures, jamais de date précise, ni le
 * chiffre d'affaires, ni ses chiffres d'exploitation (équipes, prix, pertes).
 *
 * Les recommandations IA ne sont pas construites : elles portent « Bientôt ».
 */

/** Production du pilote, 30 soirs de service sur un mois (soirée de 5 h à 5 h). */
const pilot = {
  nights: 30,
  /** Commandes payées depuis la table, envoyées en cuisine sans attendre le serveur ; affichées « 1 000+ ». */
  onlineOrdersAtLeast: 1_000,
  /** Ces commandes × l'écart typique (médianes) commande → ticket : une estimation basse. */
  hoursSaved: 75,
  gainMinutes: 4,
  /** L'écart des moyennes commande → ticket, tiré par les soirs de rush. */
  meanMinutesSaved: 6,
  /** Vendredi et samedi : une commande sur huit attend le serveur plus de 15 min. */
  weekendLateShare: 8,
  weekendLateMinutes: 15,
  /** Au plus fort (26 commandes et plus en 15 min) : l'attente typique, et une sur six au-delà de 20 min. */
  rushMedianMinutes: 11,
  rushTail: { share: 6, minutes: 20 },
  /** Tickets imprimés moins d'une minute après le paiement. */
  printedUnderMinute: 99.6,
  multiOrderTables: { of: 3, count: 2 },
  /** Fidélité depuis son ouverture : membres, revenus, récompenses offertes ; part du CA, environ. */
  loyalty: { members: 157, returning: 33, rewards: 17, revenueShare: 10, pointsPerEuro: 1, rewardPoints: 50 },
};

/**
 * Le paiement depuis la table sur les 18 soirs où il tourne à plein : part des
 * commandes payées, part de l'encaissé, meilleur soir et meilleure heure,
 * premier et dernier vendredi et samedi, et le soir où « Payer en ligne » est
 * passé en premier choix.
 */
const adoption = {
  nights: 18,
  share: 44,
  takingsShare: 41,
  bestNight: 54,
  peakHour: { of: 10, count: 7, label: "à la meilleure heure d’un samedi, entre 1\u00a0h et 2\u00a0h du matin" },
  fridays: { from: 14, to: 41 },
  saturdays: { from: 27, to: 42 },
  defaultChoice: { before: 15, after: 32 },
};

const hoursPerNight = pilot.hoursSaved / pilot.nights;
/** « 2 h 30 » : des heures, arrondies aux dix minutes. */
const hoursMinutes = (hours: number) => {
  const total = Math.round(hours * 6) * 10;
  return `${Math.floor(total / 60)}\u00a0h\u00a0${String(total % 60).padStart(2, "0")}`;
};
const minutes = (value: number) => `${value}\u00a0min`;
const outOf = (count: number, of: number) => `${count}\u00a0sur\u00a0${of}`;
const orders = `${thousands(pilot.onlineOrdersAtLeast)}+`;

const mailSubject = "Ominin pour mon restaurant-chicha";
/** Le corps du mail prérempli : ce qu'il nous faut pour proposer un rendez-vous. */
const mailBody = "Bonjour,\n\nJe souhaite un rendez-vous pour découvrir Ominin.\n\nNom de l’établissement :\nVille :\nNombre de tables :\nTéléphone :\n";

/** Le WhatsApp du fondateur, au format international sans « + », et le message qu'il préremplit. */
const whatsappNumber = "13366718135";
const whatsappText = "Bonjour, je souhaite un rendez-vous pour découvrir Ominin dans mon établissement.";

const bohoMenu = `${menuPrintUrl}/m/boho`;

/** « boîtier Omilink » au fil d'une phrase. */
const omilink = `${starterKit.omilink.name[0].toLowerCase()}${starterKit.omilink.name.slice(1)}`;

export const chichaSources = {
  pilot: {
    short: `Ominin, données de production de notre restaurant pilote, ${pilot.nights}\u00a0soirs de service`,
    full: `Ominin\u00a0— données de production de notre restaurant pilote, ${pilot.nights}\u00a0soirs de service sur un mois, à l’automne 2026\u00a0: délai commande → ticket cuisine (le ticket part au paiement), tables, fidélité. Heures épargnées\u00a0: les commandes payées depuis la table × le gain typique par commande.`,
  },
  adoption: {
    short: `Ominin, paiement depuis la table chez notre restaurant pilote, ${adoption.nights}\u00a0soirs`,
    full: `Ominin\u00a0— paiement depuis la table chez notre restaurant pilote, sur les ${adoption.nights}\u00a0soirs où il tourne à plein\u00a0: part des commandes et de l’encaissé payés en ligne.`,
  },
} satisfies Record<string, Source>;

export type ChichaSourceId = keyof typeof chichaSources;

export const chicha = {
  contact: {
    email: contactEmail,
    mailto: `mailto:${contactEmail}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`,
    label: "Prendre rendez-vous",
    emailLabel: "Par e-mail",
    whatsapp: `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappText)}`,
    whatsappLabel: "Rendez-vous sur WhatsApp",
    whatsappShort: "Rendez-vous",
    signature: "Ambaka Le Grégam, fondateur d’Ominin",
  },
  bohoMenu: { href: bohoMenu, label: "Voir la carte de BOHO", short: "La carte de BOHO" },
  soonTag: "Bientôt",

  meta: {
    title: "Ominin pour les restaurants-chicha",
    description: `Plus de ${Math.floor(pilot.hoursSaved)}\u00a0heures d’attente épargnées en un mois aux clients de notre restaurant-chicha pilote, à Toulouse\u00a0: commande et paiement depuis la table, fidélité, et vos vraies données au travail.`,
  },

  hero: {
    eyebrow: "Ominin pour les restaurants-chicha",
    title: { first: `Plus de ${Math.floor(pilot.hoursSaved)}\u00a0heures`, second: "d’attente épargnées", accent: "en un mois." },
    lead: "C’est ce qu’Ominin a rendu aux clients de notre restaurant-chicha pilote, à Toulouse\u00a0: ils commandent et paient depuis leur table, et la commande part en cuisine sans attendre le serveur.",
    pillars: ["On booste vos ventes.", "On vous simplifie la vie.", "On optimise votre établissement à partir de vos vraies données."],
    together: "Et on est avec vous à chaque étape.",
    facts: [
      { value: orders, label: "commandes parties en cuisine sans attendre le serveur" },
      { value: percent(adoption.share), label: "des commandes payées depuis la table, sans aucune pub" },
      { value: outOf(pilot.multiOrderTables.count, pilot.multiOrderTables.of), label: "tables commandent plusieurs fois dans la soirée" },
    ],
    calculation: `Le calcul\u00a0: ces commandes × environ ${minutes(pilot.gainMinutes)} gagnées chacune dans le cas typique, soit environ ${hoursMinutes(hoursPerNight)} de moins par soir en moyenne.`,
    measured: `Chez notre restaurant pilote, à Toulouse · ${pilot.nights}\u00a0soirs de service en un mois (paiement depuis la table\u00a0: les ${adoption.nights}\u00a0soirs où il tourne à plein).`,
    consent: "Chiffres publiés avec l’accord du restaurant.",
  },

  adoption: {
    eyebrow: "Le paiement depuis la table",
    title: { text: "Vos clients le", accent: "veulent." },
    lead: `En moins d’un mois, sans aucune pub, plus de ${Math.floor(adoption.share / 10)}\u00a0commandes sur\u00a010 se paient depuis la table chez notre pilote (sur ses ${adoption.nights}\u00a0derniers soirs). Personne ne les y oblige\u00a0: le serveur passe toujours pour ceux qui préfèrent.`,
    main: { value: percent(adoption.share), label: `des commandes payées depuis la table, ${percent(adoption.takingsShare)} de l’argent encaissé, sur ${adoption.nights}\u00a0soirs.` },
    facts: [
      { value: percent(adoption.bestNight), label: "Jusqu’à plus de la moitié certains soirs." },
      { value: outOf(adoption.peakHour.count, adoption.peakHour.of), label: `${adoption.peakHour.label}.` },
      { value: `×${decimal(adoption.defaultChoice.after / adoption.defaultChoice.before)}`, label: `le soir où «\u00a0Payer en ligne\u00a0» est passé en premier choix\u00a0: de ${percent(adoption.defaultChoice.before)} à ${percent(adoption.defaultChoice.after)}, en plein service.` },
    ],
    growthLabel: "Part payée depuis la table, du premier week-end après le lancement au dernier",
    growth: [
      { label: "Vendredis", from: adoption.fridays.from, to: adoption.fridays.to },
      { label: "Samedis", from: adoption.saturdays.from, to: adoption.saturdays.to },
    ],
    sources: ["adoption"] satisfies ChichaSourceId[],
  },

  sales: {
    eyebrow: "On booste vos ventes",
    title: { text: "Une tournée de plus,", accent: "sans attendre le serveur." },
    lead: `Chez notre pilote, ${outOf(pilot.multiOrderTables.count, pilot.multiOrderTables.of)} tables commandent plusieurs fois dans la soirée. Depuis la table, chaque tournée tient en deux gestes\u00a0: une autre boisson, une chicha fraîche, sans attendre qu’un serveur passe.`,
    loyalty: {
      title: "La fidélité, intégrée",
      text: `Au moment de commander, le client laisse son numéro ou son e-mail\u00a0: chaque euro lui rapporte ${pilot.loyalty.pointsPerEuro}\u00a0point. Vous choisissez les récompenses et leur prix en points\u00a0; elles accompagnent un achat, donc elles font commander.`,
      since: "Chez notre pilote, depuis l’ouverture du programme\u00a0:",
      facts: [
        { value: String(pilot.loyalty.members), label: "membres" },
        { value: String(pilot.loyalty.returning), label: "déjà revenus" },
        { value: String(pilot.loyalty.rewards), label: "récompenses offertes" },
        { value: `≈\u00a0${percent(pilot.loyalty.revenueShare)}`, label: "du chiffre d’affaires vient des membres" },
      ],
      example: "Exemple",
      card: { label: "Vos points", balance: 47, goal: pilot.loyalty.rewardPoints, reward: "Un soft offert", hint: "Plus que 3\u00a0points" },
    },
    reco: {
      title: "Le bon accord, au bon moment",
      text: "La carte suggérera ce qui se marie avec la commande en cours, d’après ce que vos clients commandent vraiment ensemble. Chez notre pilote, les tables qui prennent un Blue Lagoon ajoutent souvent des nems, et l’entrecôte appelle le Latina Passion. Pensé pour les tables qui prennent à boire sans jamais commander à manger.",
      example: "Exemple",
      cards: [
        { kicker: "Se marie bien avec votre Blue Lagoon", item: "Nems poulet (x4)", note: "4 nems au poulet, à partager" },
        { kicker: "Se marie bien avec votre entrecôte", item: "Latina Passion", note: "Passion, citron vert" },
      ],
      action: "Ajouter",
    },
    sources: ["pilot"] satisfies ChichaSourceId[],
  },

  simple: {
    eyebrow: "On vous simplifie la vie",
    title: { text: "Le serveur encaisse moins,", accent: "il sert plus." },
    lead: "Pas d’application à installer\u00a0: la carte s’ouvre dans le navigateur du téléphone.",
    steps: [
      { title: "Scannez", text: "Le QR code de la table ouvre votre carte, à vos couleurs, à jour en direct." },
      { title: "Choisissez", text: "La chicha et son parfum, les boissons, à manger\u00a0: chaque option suit jusqu’au ticket." },
      { title: "Payez depuis la table", text: "Carte, Apple\u00a0Pay ou Google\u00a0Pay, dans la page, sans attendre le terminal." },
      { title: "En cuisine", text: "Le ticket sort aussitôt à la bonne imprimante, cuisine ou bar, avec le numéro de table." },
    ],
    facts: [
      { value: `−${minutes(pilot.meanMinutesSaved)}`, label: "d’attente en moyenne avant la cuisine, quand la commande est payée depuis la table plutôt qu’en attendant le serveur." },
      { value: outOf(1, pilot.weekendLateShare), label: `Le vendredi et le samedi, une commande sur ${pilot.weekendLateShare} attend le serveur plus de ${minutes(pilot.weekendLateMinutes)}. Au plus fort du service, ${minutes(pilot.rushMedianMinutes)} d’attente typique, une sur ${pilot.rushTail.share} au-delà de ${minutes(pilot.rushTail.minutes)}.` },
      { value: percent(pilot.printedUnderMinute), label: "des tickets imprimés en cuisine ou au bar moins d’une minute après le paiement." },
    ],
    sources: ["pilot"] satisfies ChichaSourceId[],
  },

  data: {
    eyebrow: "On optimise votre établissement",
    title: { text: "Vos vraies données,", accent: "lues avec vous." },
    lead: "Chaque commande passée par Ominin devient une donnée\u00a0: ce qui se vend, quand, à quel prix, avec quelle équipe. Voici ce que nous analysons avec vous, et ce que nous avons commencé à optimiser pour notre restaurant pilote\u00a0:",
    items: [
      { kicker: "Prix de la carte", title: "Chaque changement de prix, mesuré plat par plat.", text: "Ce qui fait vendre, ce qui fait fuir, ce que les formules rapportent vraiment\u00a0: vous savez avant de réimprimer la carte." },
      { kicker: "Équipes", title: "Les heures de service, croisées avec les ventes.", text: "Où une heure de personnel rapporte, où elle attend\u00a0: de quoi caler les plannings sur les vrais pics." },
      { kicker: "Ventes à prendre", title: "Les tables qui boivent sans jamais manger.", text: "Autant de tables à qui proposer une planche\u00a0: c’est là que viendront les suggestions d’accords." },
      { kicker: "Commandes annulées", title: "Celles que le client n’a pas repassées dans les 20\u00a0minutes.", text: "Un manque à gagner rendu visible, soirée par soirée, table par table." },
    ],
  },

  together: {
    eyebrow: "On est avec vous à chaque étape",
    title: { text: "BOHO nous a fait", accent: "confiance." },
    lead: "Nous ne sommes pas partis après l’installation\u00a0: nous suivons ses soirées au jour le jour, nous corrigeons ce qui coince, et les demandes du gérant deviennent des fonctions.",
    journalLabel: "Le journal de bord",
    journal: [
      { date: "Jour 1", text: "Premier service\u00a0: la carte en ligne, les tickets sur les imprimantes de la cuisine et du bar." },
      { date: "Jour 7", text: "Le paiement depuis la table et le programme de fidélité ouvrent." },
      { date: "Jour 9", text: `«\u00a0Payer en ligne\u00a0» passe en premier choix\u00a0: de ${percent(adoption.defaultChoice.before)} à ${percent(adoption.defaultChoice.after)} des commandes le soir même.` },
      { date: "Jour 12", text: "Dernières mises au point du paiement par carte\u00a0: dès le lendemain, le paiement depuis la table tourne à plein." },
      { date: "Jour 14", text: "Le pointage des équipes ouvre." },
      { date: "Jour 26", text: "À la demande du gérant\u00a0: fermer une catégorie de la carte en un geste, fixer un minimum de commande en ligne. Et l’effet des prix de la carte, mesuré plat par plat." },
      { date: "Jour 31", text: "Les heures pointées, croisées avec les ventes, pour caler les plannings." },
    ],
  },

  faq: {
    eyebrow: "Vos questions",
    title: { text: "Ce qu’on nous", accent: "demande." },
    items: [
      { question: "Faut-il changer de caisse\u00a0?", answer: `Non. Les paiements passent par Square ou Stripe. Vos commandes arrivent dans votre caisse, ou sortent sur vos imprimantes de cuisine et de bar, reliées s’il le faut par le ${omilink}, qui les connecte à Internet.` },
      { question: "Les commandes arrivent-elles dans ma caisse\u00a0?", answer: `Oui. Avec Square, en direct\u00a0; avec plus de ${compatibleTills}\u00a0caisses du marché, grâce à HubRise. Chaque commande y arrive, sans ressaisie.` },
      { question: "Et les pourboires\u00a0?", answer: `Ils vont à votre équipe\u00a0: ${percent(0)} de commission chez nous, seuls les frais de carte du paiement s’appliquent. Sunday, par exemple, prélève une commission sur les pourboires.` },
      { question: "Et ceux qui préfèrent payer au serveur\u00a0?", answer: `Rien ne change pour eux\u00a0: le serveur vient à la table avec le terminal, ou prend les espèces. Sur ces paiements, ${percent(0)} de commission.` },
      { question: "Et les parfums, les recharges, les options\u00a0?", answer: "La carte les gère\u00a0: parfum au choix, recharge seule, suppléments. Chaque option apparaît sur le ticket." },
      { question: "Où va l’argent\u00a0?", answer: "Sur votre compte Square ou Stripe, ou directement sur votre compte bancaire, au nom de l’établissement." },
      { question: "Et mes chiffres à moi\u00a0?", answer: "Ils restent les vôtres. Ceux de notre pilote sont publiés avec son accord\u00a0: nous ne montrons jamais ceux d’un établissement sans lui demander." },
      { question: "Et après la mise en place\u00a0?", answer: "Nous restons. Comme pour notre pilote\u00a0: le suivi des soirées, vos réglages, vos demandes et la lecture de vos chiffres." },
    ],
  },

  pricing: {
    eyebrow: "Le prix",
    title: { first: `${euros(0)} par mois.`, accent: `${percent(connectCommission.percent)} des commandes`, rest: "payées en ligne." },
    lead: `Pas d’abonnement, pas d’engagement\u00a0: notre commission porte sur les commandes payées depuis la table, et seulement sur elles. ${percent(connectCommission.percent)} pour commencer, dégressif selon votre chiffre d’affaires, en plus des frais de carte du paiement.`,
    items: [
      `Paiements au serveur, espèces et pourboires\u00a0: ${percent(0)} de commission`,
      `QR codes imprimés à votre image\u00a0: ${euros(starterKit.cachet.price)} l’unité`,
      `${starterKit.omilink.name}\u00a0: ${euros(starterKit.omilink.price)}, une fois, si besoin, pour relier vos imprimantes`,
      "Mise en ligne de votre carte, suivi et lecture de vos chiffres\u00a0: inclus",
    ],
  },

  closing: {
    eyebrow: "Et maintenant",
    title: { text: "Parlons de", accent: "votre établissement." },
    steps: ["Un rendez-vous chez vous, à l’heure qui vous arrange.", "Nous mettons votre carte en ligne, à vos couleurs.", "Vos QR codes arrivent\u00a0: vos clients commandent dès le premier soir."],
  },

  sourcesNote: "Les chiffres viennent des données de production de notre restaurant pilote\u00a0; les prix sont ceux de nos tarifs publics.",
  footer: "Ominin · La commande à table pour les restaurants-chicha",
};
