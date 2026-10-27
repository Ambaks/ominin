import {
  BRANDS,
  type Slide,
  type SocialBrand,
  type SocialPlatform,
} from "@/lib/social/brands";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";
import type { ReelScript, RenderStatus } from "@/lib/social/reel";
import { check, must } from "@/lib/supabase/result";
import { rollingWeekStart } from "./format";
import { PRODUCTS, type Product } from "./products";

/*
 * Réseaux sociaux : comptes reliés, brouillons et publications de l'agent,
 * historique de sa ligne éditoriale. Comme pour Léa, l'admin lit et écrit sous RLS et les
 * runs quotidiens relisent la base. Deux gestes passent par une route
 * serveur parce qu'ils manipulent un secret : la connexion Meta, et le
 * lancement d'un run à la main.
 */

/** Produits qui publient sous leur propre marque : leur vue Réseaux ne
 * montre qu'elle. La marque Ominin, elle, n'apparaît qu'en vue d'ensemble. */
export const SOCIAL_PRODUCTS = PRODUCTS.filter(
  (product): product is Extract<Product, SocialBrand> =>
    BRANDS.some((brand) => brand.id === product)
);

/** Métriques de portée (comptes touchés) : Instagram, puis Facebook.
 * Snapchat ne remonte que des vues, saisies à la main. */
const REACH_METRICS = ["reach", "post_total_media_view_unique"];

export interface SocialWeek {
  /** Publications parties ces 7 derniers jours, par l'agent ou à la main. */
  published: number;
  /** Portée cumulée de ces publications, Instagram et Facebook. */
  reach: number;
  /** Stories Snapchat préparées par l'agent, pas encore postées. */
  snapchatToPost: number;
}

/** Résumé de l'Aperçu : une marque, ou toutes en vue d'ensemble. */
export async function fetchSocialWeek(
  brand: SocialBrand | null
): Promise<SocialWeek> {
  const supabase = createClient();
  let published = supabase
    .from("social_publications")
    .select("metrics, social_posts!inner(brand)")
    .in("status", ["published", "posted"])
    .gte("published_at", rollingWeekStart().toISOString());
  let toPost = supabase
    .from("social_publications")
    .select("id, social_accounts!inner(platform), social_posts!inner(brand)", {
      count: "exact",
      head: true,
    })
    .eq("status", "to_post")
    .eq("social_accounts.platform", "snapchat");
  if (brand) {
    published = published.eq("social_posts.brand", brand);
    toPost = toPost.eq("social_posts.brand", brand);
  }
  const [publishedResult, pending] = await Promise.all([published, toPost]);
  check(pending);
  const rows = must(publishedResult);
  let reach = 0;
  for (const row of rows) {
    const metrics = (row.metrics ?? {}) as Record<string, number>;
    for (const name of REACH_METRICS) reach += metrics[name] ?? 0;
  }
  return {
    published: rows.length,
    reach,
    snapchatToPost: pending.count ?? 0,
  };
}

export interface SocialAccount {
  id: string;
  platform: SocialPlatform;
  /** null : découvert via Meta, pas encore rattaché à une marque. */
  brand: SocialBrand | null;
  handle: string;
  enabled: boolean;
}

export type PublicationStatus = "published" | "failed" | "to_post" | "posted";

export interface SocialPublication {
  id: string;
  platform: SocialPlatform;
  handle: string;
  status: PublicationStatus;
  permalink: string | null;
  error: string | null;
  publishedAt: string | null;
  metrics: Record<string, number> | null;
  /** Chiffres figés : ce sont eux que l'analyse lit. */
  settled: boolean;
}

/** draft : à relire. redrafting : réécriture demandée, l'agent la reprend.
 * approved : part à son heure. published : parti sur tous ses comptes. */
export type PostStatus =
  | "draft"
  | "redrafting"
  | "approved"
  | "published"
  | "rejected";

export interface SocialPost {
  id: string;
  brand: SocialBrand;
  postDate: string;
  scheduledAt: string;
  status: PostStatus;
  /** Commentaire de la dernière demande de réécriture, tant qu'elle attend. */
  feedback: string | null;
  /** Version des images (voir slideUrl). */
  updatedAt: string;
  format: PostFormat;
  topic: string;
  angle: string;
  /** Carrousel : 5 à 8 images ; image : une ; Reel : aucune. */
  slides: Slide[];
  /** Reel seulement : le script, l'état de son rendu, la vidéo rendue. */
  reel: ReelScript | null;
  renderStatus: RenderStatus | null;
  renderError: string | null;
  /** Avancement du rendu en cours (workflow social-render) : étape, part
   * faite de 0 à 1, temps restant estimé pendant le montage. */
  renderStage: string | null;
  renderProgress: number | null;
  renderEtaSeconds: number | null;
  videoPath: string | null;
  /** Avis de l'arbitre sur la version retenue par l'agent ; null une fois
   * le post modifié à la main. */
  review: PostReview | null;
  captions: Record<SocialPlatform, string>;
  playbookVersion: number;
  publications: SocialPublication[];
}

export type PostFormat = "carousel" | "image" | "reel";

/** Note sur 10 donnée par l'arbitre, son verdict, les corrections qu'il
 * demandait encore, et le nombre de réécritures faites pour y arriver. */
export interface PostReview {
  score: number;
  verdict: string;
  fixes: string[];
  rounds: number;
}

export interface PlaybookFindings {
  whatWorks: string[];
  whatFails: string[];
  nextExperiments: string[];
}

/** Bilan de l'analyse hebdomadaire, posé sur la version en vigueur. */
export interface PlaybookProposal {
  /** Ligne proposée, ou null : le bilan ne propose pas de changement. */
  guidelines: string | null;
  changeSummary: string | null;
  findings: PlaybookFindings;
  createdAt: string;
}

export interface SocialPlaybook {
  id: string;
  brand: SocialBrand;
  version: number;
  guidelines: string;
  changeSummary: string;
  findings: PlaybookFindings;
  proposal: PlaybookProposal | null;
  createdAt: string;
}

/** Fenêtre de publications chargée : environ trois mois à douze par semaine. */
const SOCIAL_POSTS_FETCH_LIMIT = 150;

export async function fetchSocialAccounts(): Promise<SocialAccount[]> {
  const rows = must(
    await createClient()
      .from("social_accounts")
      .select("id, platform, brand, handle, enabled")
      .order("created_at")
  );
  return rows.map((row) => ({
    id: row.id,
    platform: row.platform as SocialPlatform,
    brand: row.brand as SocialBrand | null,
    handle: row.handle,
    enabled: row.enabled,
  }));
}

/** URL d'autorisation Meta ; le navigateur y est envoyé dans la foulée. */
export async function startMetaConnect(): Promise<string> {
  const response = await fetch("/api/social/meta/connect", { method: "POST" });
  const body = (await response.json()) as { url?: string; error?: string };
  if (!response.ok || !body.url) {
    throw new Error(body.error ?? "Connexion Meta impossible.");
  }
  return body.url;
}

/** Verdict par compte Meta : null s'il répond et peut publier, sinon la raison. */
export type MetaCheck = Record<string, string | null>;

export async function checkMetaConnection(): Promise<MetaCheck> {
  const response = await fetch("/api/social/meta/check", { method: "POST" });
  const body = (await response.json()) as {
    results?: MetaCheck;
    error?: string;
  };
  if (!response.ok || !body.results) {
    throw new Error(body.error ?? "Vérification Meta impossible.");
  }
  return body.results;
}

export async function assignAccountBrand(
  id: string,
  brand: SocialBrand | null
): Promise<void> {
  check(
    await createClient().from("social_accounts").update({ brand }).eq("id", id)
  );
}

export async function setAccountEnabled(
  id: string,
  enabled: boolean
): Promise<void> {
  check(
    await createClient()
      .from("social_accounts")
      .update({ enabled })
      .eq("id", id)
  );
}

/** Snapchat n'a pas d'API : le compte se déclare, l'agent prépare, on poste. */
export async function addSnapchatAccount(
  brand: SocialBrand,
  handle: string
): Promise<void> {
  check(
    await createClient()
      .from("social_accounts")
      .insert({ platform: "snapchat", brand, handle })
  );
}

export async function removeAccount(id: string): Promise<void> {
  check(await createClient().from("social_accounts").delete().eq("id", id));
}

export async function fetchSocialPosts(): Promise<SocialPost[]> {
  const rows = must(
    await createClient()
      .from("social_posts")
      .select(
        "id, brand, post_date, scheduled_at, status, feedback, updated_at, format, topic, angle, slides, reel, render_status, render_error, render_stage, render_progress, render_eta_seconds, video_path, review, captions, social_playbooks(version), social_publications(id, status, permalink, error, published_at, metrics, metrics_settled_at, social_accounts(platform, handle))"
      )
      .order("scheduled_at", { ascending: false })
      .limit(SOCIAL_POSTS_FETCH_LIMIT)
  );
  return rows.map((row) => ({
    id: row.id,
    brand: row.brand as SocialBrand,
    postDate: row.post_date,
    scheduledAt: row.scheduled_at,
    status: row.status as PostStatus,
    feedback: row.feedback,
    updatedAt: row.updated_at,
    format: row.format as PostFormat,
    topic: row.topic,
    angle: row.angle,
    slides: row.slides as unknown as Slide[],
    reel: row.reel as unknown as ReelScript | null,
    renderStatus: row.render_status as RenderStatus | null,
    renderError: row.render_error,
    renderStage: row.render_stage,
    renderProgress: row.render_progress,
    renderEtaSeconds: row.render_eta_seconds,
    videoPath: row.video_path,
    review: row.review as unknown as PostReview | null,
    captions: row.captions as unknown as Record<SocialPlatform, string>,
    playbookVersion: row.social_playbooks.version,
    publications: row.social_publications.map((publication) => ({
      id: publication.id,
      platform: publication.social_accounts.platform as SocialPlatform,
      handle: publication.social_accounts.handle,
      status: publication.status as PublicationStatus,
      permalink: publication.permalink,
      error: publication.error,
      publishedAt: publication.published_at,
      metrics: publication.metrics as Record<string, number> | null,
      settled: publication.metrics_settled_at != null,
    })),
  }));
}

/** Corrections de l'admin sur un brouillon ou un post validé pas encore parti.
 * Le garde sur le statut empêche de réécrire ce que l'agent est en train de
 * reprendre, ou ce qui est déjà publié. Un script de Reel modifié repart au
 * rendu : la vidéo est refaite (job social_render, workflow social-render). */
export async function savePostContent(
  id: string,
  content: {
    slides: Slide[];
    reel: ReelScript | null;
    captions: Record<SocialPlatform, string>;
  }
): Promise<void> {
  must(
    await createClient()
      .from("social_posts")
      .update({
        slides: content.slides as unknown as Json,
        captions: content.captions,
        review: null,
        ...(content.reel && {
          reel: content.reel as unknown as Json,
          render_status: "pending",
          render_error: null,
        }),
      })
      .eq("id", id)
      .in("status", ["draft", "approved"])
      .select("id")
      .single()
  );
  if (content.reel) await triggerSocialRun("social_render");
}

/** Valider, rejeter, ou repasser en brouillon un post validé. Un Reel ne se
 * valide qu'une fois sa vidéo rendue : on valide ce qu'on a vu. */
export async function setPostStatus(
  id: string,
  status: Extract<PostStatus, "draft" | "approved" | "rejected">
): Promise<void> {
  let query = createClient()
    .from("social_posts")
    .update({ status })
    .eq("id", id)
    .in("status", ["draft", "approved", "rejected"]);
  if (status === "approved") {
    query = query.or("format.neq.reel,render_status.eq.ready");
  }
  must(await query.select("id").single());
}

/** Relance le rendu des Reels en attente ou en échec. */
export async function retryRenders(): Promise<void> {
  await triggerSocialRun("social_render");
}

/** Renvoie le brouillon à l'agent avec un commentaire, puis lance la
 * réécriture (job social_redraft, qui reprend tous ceux en attente). */
export async function requestRedraft(
  id: string,
  feedback: string
): Promise<void> {
  must(
    await createClient()
      .from("social_posts")
      .update({ status: "redrafting", feedback })
      .eq("id", id)
      .in("status", ["draft", "approved"])
      .select("id")
      .single()
  );
  // Un run déjà en cours reprendra ce brouillon : il boucle jusqu'au dernier.
  await triggerSocialRun("social_redraft");
}

/** Garde .eq("status") : un double clic ne réécrit pas l'heure de publication. */
export async function markPosted(publicationId: string): Promise<void> {
  check(
    await createClient()
      .from("social_publications")
      .update({ status: "posted", published_at: new Date().toISOString() })
      .eq("id", publicationId)
      .eq("status", "to_post")
  );
}

/** Vues d'une story Snapchat, lues dans l'appli. Refusé une fois les chiffres
 * figés : l'analyse les a peut-être déjà lus. */
export async function setSnapchatViews(
  publicationId: string,
  views: number
): Promise<void> {
  check(
    await createClient()
      .from("social_publications")
      .update({ metrics: { views } })
      .eq("id", publicationId)
      .eq("status", "posted")
      .is("metrics_settled_at", null)
  );
}

export async function fetchPlaybooks(): Promise<SocialPlaybook[]> {
  const rows = must(
    await createClient()
      .from("social_playbooks")
      .select("*")
      .order("version", { ascending: false })
  );
  return rows.map((row) => {
    const proposal = row.proposal as {
      guidelines: string | null;
      change_summary: string | null;
      findings: unknown;
      created_at: string;
    } | null;
    return {
      id: row.id,
      brand: row.brand as SocialBrand,
      version: row.version,
      guidelines: row.guidelines,
      changeSummary: row.change_summary,
      findings: parseFindings(row.findings),
      proposal: proposal && {
        guidelines: proposal.guidelines,
        changeSummary: proposal.change_summary,
        findings: parseFindings(proposal.findings),
        createdAt: proposal.created_at,
      },
      createdAt: row.created_at,
    };
  });
}

function parseFindings(value: unknown): PlaybookFindings {
  const findings = (value ?? {}) as Record<string, string[] | undefined>;
  return {
    whatWorks: findings.what_works ?? [],
    whatFails: findings.what_fails ?? [],
    nextExperiments: findings.next_experiments ?? [],
  };
}

/** Toute nouvelle ligne (retour arrière, correction à la main, proposition
 * adoptée) s'ajoute comme une version : l'agent suit toujours la plus haute,
 * et l'historique reste linéaire. */
export async function addPlaybookVersion(
  current: SocialPlaybook,
  guidelines: string,
  changeSummary: string,
  findings?: PlaybookFindings
): Promise<void> {
  check(
    await createClient()
      .from("social_playbooks")
      .insert({
        brand: current.brand,
        version: current.version + 1,
        guidelines,
        change_summary: changeSummary,
        ...(findings && {
          findings: {
            what_works: findings.whatWorks,
            what_fails: findings.whatFails,
            next_experiments: findings.nextExperiments,
          },
        }),
      })
  );
}

export async function dismissProposal(playbookId: string): Promise<void> {
  check(
    await createClient()
      .from("social_playbooks")
      .update({ proposal: null })
      .eq("id", playbookId)
  );
}

export type SocialJob =
  | "social_draft"
  | "social_redraft"
  | "social_render"
  | "social_post";

export interface SocialRun {
  job: SocialJob;
  status: "running" | "succeeded" | "failed";
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
}

/** Dernier run d'un job, pour l'état affiché à côté de son bouton. */
export async function fetchLatestSocialRun(
  job: SocialJob
): Promise<SocialRun | null> {
  const { data, error } = await createClient()
    .from("outreach_runs")
    .select("status, started_at, finished_at, error")
    .eq("job", job)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (
    data && {
      job,
      status: data.status as SocialRun["status"],
      startedAt: data.started_at,
      finishedAt: data.finished_at,
      error: data.error,
    }
  );
}

/** "running" : un run de ce job tournait déjà, aucun autre n'est lancé. */
export async function triggerSocialRun(
  job: SocialJob
): Promise<"started" | "running"> {
  const response = await fetch("/api/social/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job }),
  });
  if (response.status === 409) return "running";
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(body.error ?? "Lancement impossible.");
  }
  return "started";
}
