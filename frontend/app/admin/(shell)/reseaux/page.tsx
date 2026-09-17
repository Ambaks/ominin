"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShareIcon } from "@/components/admin/icons";
import { AccountsTab } from "@/components/admin/social/accounts-tab";
import { PlaybookTab } from "@/components/admin/social/playbook-tab";
import { PostsTab } from "@/components/admin/social/posts-tab";
import {
  SnapchatTab,
  type SnapchatItem,
} from "@/components/admin/social/snapchat-tab";
import { PillTabs } from "@/components/ui/pill-tabs";
import { useToast } from "@/components/ui/toast";
import { useAdminBasePath } from "@/lib/admin/base-path";
import * as api from "@/lib/admin/social";
import type {
  SocialAccount,
  SocialPlaybook,
  SocialPost,
} from "@/lib/admin/social";

/*
 * Poste de pilotage de l'agent des réseaux sociaux. Il publie seul, chaque
 * jour, un carrousel par marque, et réécrit seul sa ligne éditoriale d'après
 * les résultats : rien ici n'attend une validation. L'écran sert à relier les
 * comptes, à voir ce qui est parti et ce que ça a donné, à poster Snapchat à
 * la main, et à reprendre la main sur la ligne éditoriale si besoin.
 */

type TabId = "accounts" | "posts" | "snapchat" | "playbook";

/** Retours du flux OAuth Meta (?meta=…), posés par /api/social/meta/callback. */
const META_OUTCOMES: Record<string, { ok: boolean; message: string }> = {
  ok: { ok: true, message: "Comptes Meta reliés — rattache-les à leur marque." },
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
  const { basePath, localPath } = useAdminBasePath();

  const [tab, setTab] = useState<TabId>("accounts");
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

  const snapchat = useMemo<SnapchatItem[]>(
    () =>
      (posts ?? []).flatMap((post) =>
        post.publications
          .filter((publication) => publication.platform === "snapchat")
          .map((publication) => ({ post, publication }))
      ),
    [posts]
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
            Un carrousel par marque et par jour, publié et amélioré par
            l&apos;agent
          </p>
        </div>
      </div>

      <PillTabs
        tabs={[
          { id: "accounts", label: "Comptes", count: unassigned },
          { id: "posts", label: "Publications" },
          { id: "snapchat", label: "Snapchat à poster", count: toPost },
          { id: "playbook", label: "Apprentissage" },
        ]}
        activeId={tab}
        onSelect={(id) => setTab(id as TabId)}
      />

      {tab === "accounts" &&
        (accounts ? (
          <AccountsTab accounts={accounts} onChange={reloadAccounts} />
        ) : (
          loading
        ))}
      {tab === "posts" && (posts ? <PostsTab posts={posts} /> : loading)}
      {tab === "snapchat" &&
        (posts ? <SnapchatTab items={snapchat} onChange={reloadPosts} /> : loading)}
      {tab === "playbook" &&
        (playbooks ? (
          <PlaybookTab playbooks={playbooks} onChange={reloadPlaybooks} />
        ) : (
          loading
        ))}
    </div>
  );
}
