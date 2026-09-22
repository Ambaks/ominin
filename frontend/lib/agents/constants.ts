import type { AgentMode, AgentStatus, ProspectStatus } from "./types";

/** Miroir de la contrainte agents_profiles_daily_limit_check. */
export const DAILY_LIMIT_MIN = 1;
export const DAILY_LIMIT_MAX = 50;

export const EMAILS_FETCH_LIMIT = 200;
export const PROSPECTS_FETCH_LIMIT = 500;

/** Scopes demandés à Google — miroir de GMAIL_SCOPES (backend, tick.py). */
export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
];
export const GMAIL_STATE_COOKIE = "agents_gmail_oauth_state";
/** Durée de vie du state anti-CSRF (même valeur que le flux Meta). */
export const OAUTH_STATE_MAX_AGE_SECONDS = 600;

export const MODE_LABELS: Record<AgentMode, { title: string; body: string }> = {
  approval: {
    title: "Validation",
    body: "Chaque e-mail attend votre accord dans « À valider » avant de partir.",
  },
  auto: {
    title: "Automatique",
    body: "Les premiers e-mails partent seuls, dans votre créneau. Les réponses aux prospects passent toujours par vous.",
  },
};

/** Jours ISO (1 = lundi), dans l'ordre d'affichage. */
export const WEEK_DAYS: { value: number; short: string; label: string }[] = [
  { value: 1, short: "L", label: "Lundi" },
  { value: 2, short: "M", label: "Mardi" },
  { value: 3, short: "M", label: "Mercredi" },
  { value: 4, short: "J", label: "Jeudi" },
  { value: 5, short: "V", label: "Vendredi" },
  { value: 6, short: "S", label: "Samedi" },
  { value: 7, short: "D", label: "Dimanche" },
];

export const PROSPECT_STATUS_LABELS: Record<ProspectStatus, string> = {
  pending: "À analyser",
  qualified: "Prêt à contacter",
  no_email: "Sans e-mail",
  disqualified: "Écarté",
  contacted: "Contacté",
  interested: "Intéressé",
  not_interested: "Pas intéressé",
};

export const PROSPECT_STATUS_BADGE_CLASSES: Record<ProspectStatus, string> = {
  pending: "border-status-new/40 bg-status-new/10 text-status-new",
  qualified:
    "border-status-to-contact/40 bg-status-to-contact/10 text-status-to-contact",
  no_email: "border-status-no-email/40 bg-status-no-email/10 text-status-no-email",
  disqualified: "border-status-lost/40 bg-status-lost/10 text-status-lost",
  contacted:
    "border-status-contacted/40 bg-status-contacted/10 text-status-contacted",
  interested:
    "border-status-interested/40 bg-status-interested/10 text-status-interested",
  not_interested:
    "border-status-not-interested/40 bg-status-not-interested/10 text-status-not-interested",
};

export const DISQUALIFY_REASON_LABELS: Record<string, string> = {
  no_website: "pas de site web",
  no_email: "aucune adresse sur le site",
  contact_form: "formulaire de contact uniquement",
  not_worth: "hors cible",
  suppressed: "désinscrit",
  bounce: "adresse invalide",
  duplicate_email: "adresse déjà contactée",
  invalid_email: "adresse invalide",
  excluded: "exclu par vous",
  rejected: "brouillon rejeté",
};

export const AGENT_STATUS_COPY: Record<
  AgentStatus,
  { label: string; body: string }
> = {
  awaiting_activation: {
    label: "En attente d'activation",
    body: "Complétez vos réglages et connectez Gmail : l'équipe Ominin active votre agent et vous prévient.",
  },
  no_mailbox: {
    label: "Gmail à connecter",
    body: "Connectez la boîte depuis laquelle partiront vos e-mails.",
  },
  mailbox_error: {
    label: "Gmail à reconnecter",
    body: "Google a refusé l'accès à votre boîte. Reconnectez-la dans les réglages.",
  },
  incomplete: {
    label: "Réglages à compléter",
    body: "Il manque votre entreprise, votre offre, vos cibles ou votre zone.",
  },
  paused: {
    label: "Prospection en pause",
    body: "L'agent lit toujours vos réponses et envoie celles que vous validez, mais ne contacte personne de nouveau.",
  },
  running: {
    label: "En marche",
    body: "L'agent prospecte à chaque heure de votre créneau.",
  },
};
