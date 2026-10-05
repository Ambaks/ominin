import {
  BRANDS,
  type Slide,
  type SocialBrand,
  type SocialPlatform,
} from "@/lib/social/brands";
import { createClient } from "@/lib/supabase/client";
import { check, must } from "@/lib/supabase/result";
import { rollingWeekStart } from "./format";
import { PRODUCTS, type Product } from "./products";

/*
 * Réseaux sociaux : comptes reliés, publications de l'agent et historique de
 * sa ligne éditoriale. Comme pour Léa, l'admin lit et écrit sous RLS et les
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

export interface SocialPost {
  id: string;
  brand: SocialBrand;
  postDate: string;
  topic: string;
  angle: string;
  slides: Slide[];
  captions: Record<SocialPlatform, string>;
  playbookVersion: number;
  publications: SocialPublication[];
}

export interface PlaybookFindings {
  whatWorks: string[];
  whatFails: string[];
  nextExperiments: string[];
}

export interface SocialPlaybook {
  id: string;
  brand: SocialBrand;
  version: number;
  guidelines: string;
  changeSummary: string;
  findings: PlaybookFindings;
  createdAt: string;
}

/** Fenêtre de publications chargée : ~5 semaines pour quatre marques. */
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
        "id, brand, post_date, topic, angle, slides, captions, social_playbooks(version), social_publications(id, status, permalink, error, published_at, metrics, metrics_settled_at, social_accounts(platform, handle))"
      )
      .order("post_date", { ascending: false })
      .limit(SOCIAL_POSTS_FETCH_LIMIT)
  );
  return rows.map((row) => ({
    id: row.id,
    brand: row.brand as SocialBrand,
    postDate: row.post_date,
    topic: row.topic,
    angle: row.angle,
    slides: row.slides as unknown as Slide[],
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
    const findings = (row.findings ?? {}) as Record<
      string,
      string[] | undefined
    >;
    return {
      id: row.id,
      brand: row.brand as SocialBrand,
      version: row.version,
      guidelines: row.guidelines,
      changeSummary: row.change_summary,
      findings: {
        whatWorks: findings.what_works ?? [],
        whatFails: findings.what_fails ?? [],
        nextExperiments: findings.next_experiments ?? [],
      },
      createdAt: row.created_at,
    };
  });
}

/** Revenir à une version = en ajouter une, copie de l'ancienne : l'agent suit
 * toujours la plus haute, et l'historique reste linéaire. */
export async function restorePlaybook(
  playbook: SocialPlaybook,
  latestVersion: number
): Promise<void> {
  check(
    await createClient()
      .from("social_playbooks")
      .insert({
        brand: playbook.brand,
        version: latestVersion + 1,
        guidelines: playbook.guidelines,
        change_summary: `Retour manuel à la version ${playbook.version}.`,
      })
  );
}

export type SocialJob = "social_post" | "social_research";

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

export async function triggerSocialRun(job: SocialJob): Promise<void> {
  const response = await fetch("/api/social/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(body.error ?? "Lancement impossible.");
  }
}
