import type { Cta, FaqItem, Feature, NavLink, Step } from "@/lib/landing-data";

/*
 * Copy de la landing Ominin Agents (agents.ominin.com). Pas de prix : l'accès
 * s'ouvre compte par compte, activé par l'équipe Ominin, pendant le
 * lancement. Aucun texte dans les composants — tout vit ici.
 */

export const agentsBrand = "Ominin Agents";

export const signupCta: Cta = { label: "Créer mon agent", href: "/inscription" };

export const seo = {
  title: "Ominin Agents — Un agent qui prospecte pour votre entreprise",
  description:
    "Votre agent trouve les entreprises de votre zone qui ont besoin de vos services, leur écrit en votre nom depuis votre Gmail et vous signale chaque réponse. Vous validez chaque envoi, ou vous le laissez faire.",
};

export const nav = {
  links: [
    { label: "Fonctionnement", href: "#fonctionnement" },
    { label: "Contrôle", href: "#controle" },
    { label: "FAQ", href: "#faq" },
  ] satisfies NavLink[],
  cta: signupCta,
  login: { label: "Connexion", href: "/connexion" } satisfies Cta,
};

export const hero = {
  eyebrow: "Prospection B2B · Depuis votre Gmail · Vous gardez la main",
  titleStart: "Vous travaillez.",
  titleAccent: "Votre agent prospecte.",
  subtitle:
    "Il repère les entreprises de votre zone qui ont besoin de vos services, trouve leur adresse, leur écrit un e-mail personnalisé en votre nom depuis votre propre boîte, et vous prévient dès qu'on lui répond.",
  secondaryCta: { label: "Voir comment ça marche", href: "#fonctionnement" } satisfies Cta,
  trustline: ["Envoyé depuis votre Gmail", "Validation en un geste", "Désinscription intégrée"],
};

/** Journal de bord de l'agent, maquette du hero : une matinée de travail. */
export const heroLog = {
  title: "Journal de l'agent",
  day: "Mardi",
  entries: [
    { time: "08:47", text: "Recherche « rénovation à Nîmes »", detail: "18 entreprises trouvées" },
    { time: "08:52", text: "Maçonnerie Martin — adresse trouvée sur leur site", detail: "Rénovation de mas en pierre : cible idéale" },
    { time: "08:53", text: "E-mail rédigé pour Maçonnerie Martin", detail: "En attente de votre validation", pending: true },
    { time: "09:47", text: "Envoyé depuis votre boîte", detail: "Signé de votre nom" },
    { time: "14:12", text: "Maçonnerie Martin vous a répondu", detail: "Intéressé · brouillon de réponse prêt", hot: true },
  ],
};

export const howItWorks = {
  id: "fonctionnement",
  eyebrow: "Fonctionnement",
  title: "Quatre étapes, dont trois qu'il fait seul.",
  steps: [
    {
      title: "Décrivez votre activité",
      description:
        "Vos services, vos points forts, les entreprises que vous visez et votre zone. Cinq minutes, une seule fois.",
    },
    {
      title: "Connectez votre Gmail",
      description:
        "Les e-mails partent de votre adresse, signés de votre nom. Les réponses arrivent dans votre boîte, comme d'habitude.",
    },
    {
      title: "L'agent prospecte",
      description:
        "À chaque heure de votre créneau, il cherche de nouvelles entreprises, trouve leur contact et rédige un e-mail propre à chacune.",
    },
    {
      title: "Vous récoltez les réponses",
      description:
        "Il classe chaque réponse, vous prépare un brouillon et vous alerte. Il ne vous reste qu'à rappeler.",
    },
  ] satisfies Step[],
};

export const controlSection = {
  id: "controle",
  eyebrow: "Vous gardez la main",
  title: "Il écrit en votre nom. Rien ne lui échappe, rien ne vous échappe.",
  subtitle:
    "Tout se règle depuis votre espace : le mode d'envoi, les jours, les heures, le volume, les cibles et la zone.",
  features: [
    {
      stat: "2 modes",
      title: "Automatique ou validation",
      description:
        "En validation, chaque e-mail attend votre accord : vous le lisez, le corrigez ou le rejetez. En automatique, l'agent envoie seul — les réponses aux prospects, elles, passent toujours par vous.",
    },
    {
      stat: "1–50",
      title: "Un rythme que vous fixez",
      description:
        "Jours, heures et nombre d'e-mails par jour : l'agent étale ses envois sur votre créneau, jamais en rafale.",
    },
    {
      stat: "1 fois",
      title: "Jamais deux fois la même adresse",
      description:
        "Une entreprise reçoit un seul e-mail de prospection. Qui se désinscrit n'est plus jamais contacté.",
    },
    {
      stat: "0",
      title: "Prix ou date inventés",
      description:
        "L'agent n'annonce que ce que vous lui avez confié. Pour le reste, il propose d'en parler avec vous.",
    },
  ] satisfies Feature[],
};

export const faqSection = {
  id: "faq",
  eyebrow: "FAQ",
  title: "Les questions qu'on nous pose.",
  items: [
    {
      question: "Depuis quelle adresse partent les e-mails ?",
      answer:
        "La vôtre : vous connectez votre compte Gmail ou Google Workspace en un clic. Les e-mails partent de votre boîte, signés de votre nom, et les réponses y arrivent comme n'importe quel e-mail. L'agent ne lit que les conversations qu'il a lui-même ouvertes ; il ne modifie, ne classe et ne supprime rien.",
    },
    {
      question: "Où trouve-t-il les entreprises ?",
      answer:
        "Dans Google Maps, pour chaque cible et chaque ville de votre zone. Il visite ensuite leur site pour trouver l'adresse de contact et comprendre leur activité. Les entreprises sans adresse restent dans votre liste avec leur numéro, pour un appel.",
    },
    {
      question: "Est-ce légal ?",
      answer:
        "Oui. En France, la prospection par e-mail entre professionnels est permise sans accord préalable, à condition que le message concerne l'activité du destinataire, identifie l'expéditeur et permette de refuser la suite simplement. Chaque e-mail de l'agent respecte ces trois règles, et une désinscription est appliquée immédiatement.",
    },
    {
      question: "Combien ça coûte ?",
      answer:
        "Pendant le lancement, l'accès s'ouvre compte par compte : créez votre compte, notre équipe active votre agent et vous contacte pour en parler.",
    },
    {
      question: "Puis-je l'arrêter à tout moment ?",
      answer:
        "Oui : un interrupteur dans votre espace met la prospection en pause, et vous pouvez déconnecter Gmail d'un clic.",
    },
  ] satisfies FaqItem[],
};

export const finalCta = {
  title: "Votre agent peut commencer cette semaine.",
  subtitle:
    "Créez votre compte et décrivez votre activité : l'équipe Ominin active votre agent et revient vers vous.",
  contactLabel: "Nous écrire",
  microcopy: ["Activation par l'équipe Ominin", "Pause à tout moment"],
};

export const footer = {
  tagline:
    "Ominin Agents — la prospection de votre entreprise, confiée à un agent qui écrit en votre nom.",
};
