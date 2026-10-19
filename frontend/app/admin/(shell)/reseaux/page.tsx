"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShareIcon } from "@/components/admin/icons";
import { AccountsTab } from "@/components/admin/social/accounts-tab";
import { DraftsTab } from "@/components/admin/social/drafts-tab";
import { PlaybookTab } from "@/components/admin/social/playbook-tab";
import { PostsTab } from "@/components/admin/social/posts-tab";
import { RunPanel } from "@/components/admin/social/run-panel";
import {
  SnapchatTab,
  type SnapchatItem,
} from "@/components/admin/social/snapchat-tab";
import { PillTabs } from "@/components/ui/pill-tabs";
import { useToast } from "@/components/ui/toast";
import { useAdminBasePath } from "@/lib/admin/base-path";
import * as api from "@/lib/admin/social";
import type {
  PostStatus,
  SocialAccount,
  SocialPlaybook,
  SocialPost,
} from "@/lib/admin/social";
import { BRANDS, type SocialBrand } from "@/lib/social/brands";

/*
 * Poste de pilotage de l'agent des réseaux sociaux. Il prépare chaque
 * mercredi soir les publications de la semaine (trois créneaux par marque,
 * en Reel, carrousel ou image) ;
 * rien ne part sans être validé ici. L'écran sert à valider, corriger ou
 * faire réécrire les brouillons, relier les comptes, voir ce qui est parti
 * et ce que ça a donné, poster Snapchat à la main, et tenir la ligne
 * éditoriale. La vue d'un produit ne montre que sa marque ; la vue
 * d'ensemble, toutes.
 */

type TabId = "drafts" | "accounts" | "posts" | "snapchat" | "playbook";

/** Statuts d'un post qui n'est pas encore parti : l'onglet « À valider ». */
const PENDING: readonly PostStatus[] = ["draft", "redrafting", "approved"];

/** Retours du flux OAuth Meta (?meta=…), posés par /api/social/meta/callback. */
const META_OUTCOMES: Record<string, { ok: boolean; message: string }> = {
  ok: {
    ok: true,
    message: "Comptes Meta reliés — rattache-les à leur marque.",
  },
  vide: {
    ok: false,
    message:
      "Aucune Page trouvée : coche les Pages d'Ominin dans la fenêtre d'autorisation Meta.",
  },
  erreur: { ok: false, message: "Connexion Meta impossible. Réessaie." },
};

export default function SocialPage() {
  const toast = useToast();
  const router = useRouter();
  const { basePath, localPath, product } = useAdminBasePath();
  // L'écran n'est ouvert qu'aux produits qui ont leur marque (voir le shell).
  const brand = product as SocialBrand | null;
  const brands = brand ? BRANDS.filter((item) => item.id === brand) : BRANDS;

  const [tab, setTab] = useState<TabId>("drafts");
  const [accounts, setAccounts] = useState<SocialAccount[] | null>(null);
  const [posts, setPosts] = useState<SocialPost[] | null>(null);
  const [playbooks, setPlaybooks] = useState<SocialPlaybook[] | null>(null);

  const fail = useCallback(
    (error: unknown) =>
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      ),
    [toast]
  );

  const reloadAccounts = useCallback(() => {
    api.fetchSocialAccounts().then(setAccounts).catch(fail);
  }, [fail]);
  const reloadPosts = useCallback(() => {
    api.fetchSocialPosts().then(setPosts).catch(fail);
  }, [fail]);
  const reloadPlaybooks = useCallback(() => {
    api.fetchPlaybooks().then(setPlaybooks).catch(fail);
  }, [fail]);

  // Les publications portent aussi le compteur de l'onglet Snapchat : elles
  // se chargent d'entrée, avec les comptes.
  useEffect(() => {
    reloadAccounts();
    reloadPosts();
  }, [reloadAccounts, reloadPosts]);

  useEffect(() => {
    if (tab === "playbook" && playbooks === null) reloadPlaybooks();
  }, [tab, playbooks, reloadPlaybooks]);

  // Lu dans l'URL au montage plutôt que par useSearchParams, qui imposerait
  // une frontière Suspense à toute la page pour un paramètre éphémère.
  useEffect(() => {
    const meta = new URLSearchParams(window.location.search).get("meta");
    const outcome = meta ? META_OUTCOMES[meta] : undefined;
    if (!outcome) return;
    if (outcome.ok) toast.success(outcome.message);
    else toast.error(outcome.message);
    router.replace(`${basePath}${localPath}`);
  }, [toast, router, basePath, localPath]);

  const brandPosts = useMemo(
    () => posts?.filter((post) => !brand || post.brand === brand) ?? null,
    [posts, brand]
  );
  // Un compte pas encore rattaché reste visible partout : il est peut-être
  // celui de cette marque.
  const brandAccounts =
    accounts?.filter(
      (account) => !brand || account.brand === brand || account.brand === null
    ) ?? null;

  const pending = useMemo(
    () => brandPosts?.filter((post) => PENDING.includes(post.status)) ?? null,
    [brandPosts]
  );
  const published = useMemo(
    () => brandPosts?.filter((post) => post.status === "published") ?? null,
    [brandPosts]
  );
  const toValidate = (pending ?? []).filter(
    (post) => post.status === "draft"
  ).length;

  const snapchat = useMemo<SnapchatItem[]>(
    () =>
      (brandPosts ?? []).flatMap((post) =>
        post.publications
          .filter((publication) => publication.platform === "snapchat")
          .map((publication) => ({ post, publication }))
      ),
    [brandPosts]
  );
  const toPost = snapchat.filter(
    (item) => item.publication.status === "to_post"
  ).length;
  const unassigned = (accounts ?? []).filter((a) => a.brand === null).length;

  const loading = <div className="shimmer h-44 rounded-2xl" />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="ember-gradient flex size-9 items-center justify-center rounded-xl">
          <ShareIcon className="size-4.5 text-background" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-medium">Réseaux sociaux</h1>
          <p className="text-xs text-faint">
            Trois publications par marque et par semaine (Reel, carrousel ou
            image), préparées par
            l&apos;agent, publiées une fois validées
          </p>
        </div>
      </div>

      <RunPanel onRefresh={reloadPosts} />

      <PillTabs
        tabs={[
          { id: "drafts", label: "À valider", count: toValidate },
          { id: "accounts", label: "Comptes", count: unassigned },
          { id: "posts", label: "Publications" },
          { id: "snapchat", label: "Snapchat à poster", count: toPost },
          { id: "playbook", label: "Apprentissage" },
        ]}
        activeId={tab}
        onSelect={(id) => setTab(id as TabId)}
      />

      {tab === "drafts" &&
        (pending ? (
          <DraftsTab posts={pending} onChange={reloadPosts} />
        ) : (
          loading
        ))}
      {tab === "accounts" &&
        (brandAccounts ? (
          <AccountsTab
            accounts={brandAccounts}
            brands={brands}
            onChange={reloadAccounts}
          />
        ) : (
          loading
        ))}
      {tab === "posts" &&
        (published ? <PostsTab posts={published} /> : loading)}
      {tab === "snapchat" &&
        (brandPosts ? (
          <SnapchatTab items={snapchat} onChange={reloadPosts} />
        ) : (
          loading
        ))}
      {tab === "playbook" &&
        (playbooks ? (
          <PlaybookTab
            key={brand ?? "toutes"}
            brands={brands}
            playbooks={playbooks}
            onChange={reloadPlaybooks}
          />
        ) : (
          loading
        ))}
    </div>
  );
}
