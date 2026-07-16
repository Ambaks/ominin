import type {
  CaptionSet,
  ClipPlatform,
  ConnectedAccount,
  PlatformAnalytics,
  PostAnalytics,
  PostPlatformMetrics,
} from "../provider/types";
import type { ClipPost, ClipState } from "../types";

/*
 * Fixtures de la démo publique (/demo) : le persona « Lucas Clips », clippeur
 * francophone de streamers. Toutes les dates sont calculées relativement à
 * l'instant de chargement pour que la démo paraisse toujours fraîche. Aucune
 * donnée réelle — pattern lib/menu-data.ts / lib/clip-landing-data.ts.
 */

/** Rythmes des interactions simulées — un seul endroit pour régler la démo. */
export const DEMO_TIMINGS = {
  /** Écran de chargement de marque à l'entrée. */
  initialLoadMs: 900,
  /** Durée totale de l'upload simulé du clip. */
  uploadDurationMs: 2600,
  /** Cadence de progression de l'upload simulé. */
  uploadTickMs: 80,
  /** « L'IA rédige » avant de rendre les titres pré-écrits. */
  captionDelayMs: 1600,
  /** Création du post après le clic sur Publier. */
  publishDelayMs: 700,
  /** Publication fraîche : en_cours → publié, visible sur Publications. */
  statusResolveMs: 6000,
  /** Le post en_cours présent au chargement se résout de lui-même. */
  seededPendingResolveMs: 8000,
  /** Relance du post partiel : en_cours → publié. */
  retryResolveMs: 4500,
  /** Connexion du compte X après le clic sur Connecter. */
  connectDelayMs: 1800,
  /** Lecture des analytics à l'arrivée sur la page. */
  analyticsDelayMs: 1100,
  /** Lecture des métriques d'une carte de l'onglet Par publication. */
  postAnalyticsDelayMs: 900,
} as const;

export const DEMO_EMAIL = "demo@ominin.com";

/** Comptes reliés au chargement — X reste à connecter, pour le montrer en démo. */
export const DEMO_ACCOUNTS: ConnectedAccount[] = [
  {
    platform: "tiktok",
    handle: "lucas.clips",
    displayName: "Lucas Clips",
    reauthRequired: false,
  },
  {
    platform: "youtube",
    handle: "LucasClips",
    displayName: "Lucas Clips",
    reauthRequired: false,
  },
  {
    platform: "instagram",
    handle: "lucas.clips",
    displayName: "Lucas Clips",
    reauthRequired: false,
  },
];

/** Ajouté par « Connecter mes comptes » après connectDelayMs. */
export const DEMO_X_ACCOUNT: ConnectedAccount = {
  platform: "x",
  handle: "lucasclips_",
  displayName: "Lucas Clips",
  reauthRequired: false,
};

/** Clip d'exemple « déposé » au clic sur la zone (écho de heroShowcase.clip). */
export const DEMO_SAMPLE_CLIP = {
  name: "meilleur-moment-du-live.mp4",
  size: Math.round(24.6 * 1024 * 1024),
};

export const DEMO_UPLOAD_PATH = "demo/meilleur-moment-du-live.mp4";

export const DEMO_BANNER = {
  message: "Démo interactive — données fictives",
  ctaLabel: "Créer mon espace",
  ctaHref: "/login?inscription=1",
};

/** Titres rendus par « Générer les titres » après captionDelayMs. */
export const DEMO_CAPTIONS: CaptionSet = {
  tiktok: {
    title: "Il tente le 1v4 le plus fou du stream 😳 #valorant #clutch #fr",
  },
  instagram: {
    title: "Le 1v4 qui a fait exploser le chat 😳🔥",
  },
  youtube: {
    title: "Ce 1v4 a rendu le chat complètement fou",
    description:
      "Moment fort du live d'hier : un clutch improbable en ranked, le chat en fusion. Abonne-toi pour le meilleur des streams FR, tous les jours.",
  },
  x: {
    title: "Le 1v4 le plus improbable du stream d'hier. Le chat a explosé 😳",
  },
};

const minute = 60 * 1000;
const hour = 60 * minute;
const day = 24 * hour;

const iso = (timestamp: number) => new Date(timestamp).toISOString();

/** Historique de publications — un pipeline vivant : en cours, publié, partiel. */
export function buildDemoPosts(now: number): ClipPost[] {
  return [
    {
      id: "demo-post-1",
      title: "Sa réaction quand il gagne enfin le tournoi 🏆",
      captions: {
        tiktok: { title: "Sa réaction quand il gagne enfin le tournoi 🏆 #fr" },
        youtube: {
          title: "Il gagne le tournoi et perd totalement le contrôle",
          description: "La victoire la plus attendue de l'année, en direct.",
        },
        instagram: { title: "La victoire la plus méritée du stream 🏆" },
      },
      platforms: ["tiktok", "youtube", "instagram"],
      status: "en_cours",
      storagePath: "demo/victoire-tournoi.mp4",
      results: [],
      attempt: 1,
      createdAt: iso(now - 2 * minute),
      publishedAt: null,
    },
    {
      id: "demo-post-2",
      title: "Kameto découvre le nouveau patch en direct",
      captions: {
        tiktok: { title: "Kameto découvre le nouveau patch en direct 💀 #fr" },
        youtube: {
          title: "Sa tête quand il lit les notes du patch",
          description: "Réaction à chaud, aucun montage nécessaire.",
        },
        instagram: { title: "Le patch que personne n'avait demandé 💀" },
      },
      platforms: ["tiktok", "youtube", "instagram"],
      status: "publie",
      storagePath: null,
      results: [
        { platform: "tiktok", success: true, message: "" },
        { platform: "youtube", success: true, message: "" },
        { platform: "instagram", success: true, message: "" },
      ],
      attempt: 1,
      createdAt: iso(now - 5 * hour),
      publishedAt: iso(now - 5 * hour + 3 * minute),
    },
    {
      id: "demo-post-3",
      title: "Le chat vote pour la pire idée possible 💀",
      captions: {
        tiktok: { title: "Le chat vote pour la pire idée possible 💀 #twitchfr" },
        youtube: {
          title: "Il laisse le chat décider… grosse erreur",
          description: "La démocratie du chat Twitch dans toute sa splendeur.",
        },
        instagram: { title: "Laisser le chat décider, cette erreur 💀" },
      },
      platforms: ["tiktok", "youtube", "instagram"],
      status: "partiel",
      storagePath: "demo/vote-du-chat.mp4",
      results: [
        { platform: "tiktok", success: true, message: "" },
        { platform: "youtube", success: true, message: "" },
        {
          platform: "instagram",
          success: false,
          message:
            "Session Instagram expirée — reconnectez le compte puis relancez.",
        },
      ],
      attempt: 1,
      createdAt: iso(now - day - 2 * hour),
      publishedAt: null,
    },
    {
      id: "demo-post-4",
      title: "Ce plot twist à la dernière seconde 🤯",
      captions: {
        tiktok: { title: "Ce plot twist à la dernière seconde 🤯 #gaming" },
        youtube: {
          title: "Personne n'avait vu venir cette fin",
          description: "Le retournement le plus fou du live de mardi.",
        },
        instagram: { title: "La fin que personne n'attendait 🤯" },
      },
      platforms: ["tiktok", "youtube", "instagram"],
      status: "publie",
      storagePath: null,
      results: [
        { platform: "tiktok", success: true, message: "" },
        { platform: "youtube", success: true, message: "" },
        { platform: "instagram", success: true, message: "" },
      ],
      attempt: 1,
      createdAt: iso(now - 2 * day - 4 * hour),
      publishedAt: iso(now - 2 * day - 4 * hour + 2 * minute),
    },
    {
      id: "demo-post-5",
      title: "POV : tu rage-quit devant 30 000 viewers",
      captions: {
        tiktok: { title: "POV : tu rage-quit devant 30 000 viewers 😭 #fr" },
        youtube: {
          title: "Le rage-quit le plus théâtral de Twitch FR",
          description: "Il avait pourtant promis de rester calme.",
        },
        instagram: { title: "Le rage-quit du siècle, en direct 😭" },
      },
      platforms: ["tiktok", "youtube", "instagram"],
      status: "publie",
      storagePath: null,
      results: [
        { platform: "tiktok", success: true, message: "" },
        { platform: "youtube", success: true, message: "" },
        { platform: "instagram", success: true, message: "" },
      ],
      attempt: 1,
      createdAt: iso(now - 3 * day - 6 * hour),
      publishedAt: iso(now - 3 * day - 6 * hour + 4 * minute),
    },
    {
      id: "demo-post-6",
      title: "Il duo avec un viewer niveau fer… qui carry",
      captions: {
        tiktok: { title: "Le viewer niveau fer qui carry son streamer 😳 #fr" },
        youtube: {
          title: "Ce viewer « niveau fer » cachait bien son jeu",
          description: "Le duo le plus improbable du mois.",
        },
        instagram: { title: "Le smurf le moins discret de Twitch 😳" },
      },
      platforms: ["tiktok", "youtube", "instagram"],
      status: "publie",
      storagePath: null,
      results: [
        { platform: "tiktok", success: true, message: "" },
        { platform: "youtube", success: true, message: "" },
        { platform: "instagram", success: true, message: "" },
      ],
      attempt: 1,
      createdAt: iso(now - 5 * day - 3 * hour),
      publishedAt: iso(now - 5 * day - 3 * hour + 3 * minute),
    },
  ];
}

/*
 * Portée quotidienne sur 14 jours : tendance haussière, du bruit réaliste.
 * Motifs distincts par plateforme (fractions du pic quotidien de chacune).
 */
const REACH_PATTERNS: Record<string, number[]> = {
  tiktok: [0.42, 0.48, 0.44, 0.55, 0.51, 0.62, 0.58, 0.68, 0.74, 0.7, 0.82, 0.78, 0.9, 1],
  youtube: [0.5, 0.46, 0.54, 0.52, 0.6, 0.57, 0.66, 0.63, 0.72, 0.77, 0.74, 0.85, 0.92, 1],
  instagram: [0.38, 0.45, 0.42, 0.5, 0.56, 0.53, 0.6, 0.66, 0.62, 0.73, 0.7, 0.8, 0.88, 1],
  x: [0.46, 0.42, 0.52, 0.49, 0.58, 0.55, 0.64, 0.6, 0.7, 0.67, 0.78, 0.84, 0.9, 1],
};

const ANALYTICS_BASE: Omit<PlatformAnalytics, "reachTimeseries">[] = [
  {
    platform: "tiktok",
    followers: 84_300,
    views: 1_240_000,
    reach: 986_000,
    likes: 128_400,
    comments: 6_120,
    shares: 18_900,
  },
  {
    platform: "youtube",
    followers: 42_100,
    views: 730_500,
    reach: 512_300,
    likes: 61_800,
    comments: 4_350,
    shares: 7_240,
  },
  {
    platform: "instagram",
    followers: 28_700,
    views: 396_400,
    reach: 301_200,
    likes: 44_500,
    comments: 2_980,
    shares: 5_610,
  },
  {
    platform: "x",
    followers: 12_400,
    views: 158_900,
    reach: 121_700,
    likes: 9_840,
    comments: 1_120,
    shares: 3_480,
  },
];

/** Pic quotidien de portée par plateforme (dernier jour de la série). */
const DAILY_REACH_PEAK: Record<string, number> = {
  tiktok: 96_000,
  youtube: 41_000,
  instagram: 24_500,
  x: 9_800,
};

export function buildDemoAnalytics(now: number): PlatformAnalytics[] {
  return ANALYTICS_BASE.map((base) => ({
    ...base,
    reachTimeseries: REACH_PATTERNS[base.platform].map((fraction, index, all) => ({
      date: iso(now - (all.length - 1 - index) * day),
      value: Math.round(fraction * DAILY_REACH_PEAK[base.platform]),
    })),
  }));
}

/*
 * Métriques par publication (onglet Par publication) : cohérentes avec le
 * fixture — les posts anciens cumulent plus de vues, TikTok domine.
 */
const DEMO_POST_METRICS: Record<
  string,
  Partial<Record<ClipPlatform, PostPlatformMetrics>>
> = {
  "demo-post-2": {
    tiktok: { views: 412_000, likes: 38_200, comments: 1_460, shares: 5_230, saves: 2_110 },
    youtube: { views: 188_400, likes: 12_600, comments: 842, shares: 1_130, saves: 690 },
    instagram: { views: 96_700, likes: 8_940, comments: 512, shares: 1_480, saves: 1_020 },
  },
  "demo-post-3": {
    tiktok: { views: 268_500, likes: 21_700, comments: 903, shares: 3_150, saves: 1_240 },
    youtube: { views: 121_300, likes: 8_020, comments: 517, shares: 640, saves: 380 },
  },
  "demo-post-4": {
    tiktok: { views: 351_800, likes: 30_400, comments: 1_210, shares: 4_060, saves: 1_680 },
    youtube: { views: 164_900, likes: 10_900, comments: 734, shares: 980, saves: 560 },
    instagram: { views: 84_200, likes: 7_610, comments: 448, shares: 1_260, saves: 870 },
  },
  "demo-post-5": {
    tiktok: { views: 489_300, likes: 45_100, comments: 1_890, shares: 6_420, saves: 2_540 },
    youtube: { views: 203_700, likes: 14_200, comments: 918, shares: 1_310, saves: 760 },
    instagram: { views: 112_400, likes: 10_300, comments: 587, shares: 1_720, saves: 1_190 },
  },
  "demo-post-6": {
    tiktok: { views: 297_600, likes: 24_800, comments: 1_040, shares: 3_540, saves: 1_390 },
    youtube: { views: 139_500, likes: 9_150, comments: 601, shares: 740, saves: 430 },
    instagram: { views: 71_900, likes: 6_480, comments: 382, shares: 1_080, saves: 740 },
  },
};

/** Un post publié pendant la démo : ses premières heures de diffusion. */
const DEMO_FRESH_METRICS: Partial<Record<ClipPlatform, PostPlatformMetrics>> = {
  tiktok: { views: 12_400, likes: 1_380, comments: 64, shares: 210, saves: 96 },
  youtube: { views: 4_180, likes: 356, comments: 28, shares: 41, saves: 19 },
  instagram: { views: 2_960, likes: 301, comments: 17, shares: 52, saves: 44 },
  x: { views: 1_540, likes: 118, comments: 9, shares: 33, saves: 0 },
};

export function buildDemoPostAnalytics(post: ClipPost): PostAnalytics[] {
  const metricsByPlatform = DEMO_POST_METRICS[post.id] ?? DEMO_FRESH_METRICS;
  const succeeded =
    post.results.length > 0
      ? new Set(
          post.results
            .filter((result) => result.success)
            .map((result) => result.platform)
        )
      : new Set(post.platforms);
  return post.platforms
    .filter((platform) => succeeded.has(platform))
    .map((platform) => {
      const metrics = metricsByPlatform[platform];
      return {
        platform,
        postUrl: null,
        metrics: metrics ? { ...metrics } : null,
        error: metrics ? null : "Statistiques en cours de collecte.",
      };
    });
}

export function buildDemoState(now: number): ClipState {
  return {
    email: DEMO_EMAIL,
    accounts: DEMO_ACCOUNTS,
    posts: buildDemoPosts(now),
  };
}
