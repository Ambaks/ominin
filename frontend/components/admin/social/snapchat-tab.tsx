"use client";

import { useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { inputClass } from "@/components/ui/field";
import { useRunMutation, useToast } from "@/components/ui/toast";
import { formatDay } from "@/lib/admin/format";
import * as api from "@/lib/admin/social";
import type { SocialPost, SocialPublication } from "@/lib/admin/social";
import { BRAND_BY_ID, slideUrl } from "@/lib/social/brands";
import { PRIMARY_BUTTON, SECONDARY_BUTTON, SECTION_TITLE } from "./styles";

export interface SnapchatItem {
  post: SocialPost;
  publication: SocialPublication;
}

/*
 * Snapchat n'a pas d'API de publication : l'agent prépare la story (images
 * 9:16 et texte), on la poste depuis le téléphone, puis on reporte ici les
 * vues lues dans l'appli — sans elles, l'agent n'apprend rien de Snapchat.
 * Une story vit 24 h : les vues se saisissent le lendemain, avant que les
 * chiffres ne soient figés.
 */
export function SnapchatTab({
  items,
  onChange,
}: {
  items: SnapchatItem[];
  onChange: () => void;
}) {
  const toPost = items.filter((item) => item.publication.status === "to_post");
  const awaitingViews = items.filter(
    (item) => item.publication.status === "posted" && !item.publication.settled
  );

  if (toPost.length === 0 && awaitingViews.length === 0) {
    return (
      <EmptyState
        title="Rien à poster"
        body="Quand une marque a un compte Snapchat déclaré, la story du jour préparée par l'agent apparaît ici, prête à télécharger."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {toPost.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className={SECTION_TITLE}>À poster</p>
          {toPost.map((item) => (
            <ToPostCard key={item.publication.id} item={item} onChange={onChange} />
          ))}
        </div>
      )}
      {awaitingViews.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className={SECTION_TITLE}>Vues à reporter</p>
          {awaitingViews.map((item) => (
            <ViewsRow key={item.publication.id} item={item} onChange={onChange} />
          ))}
        </div>
      )}
    </div>
  );
}

function Heading({ item }: { item: SnapchatItem }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-xs text-faint">
        {formatDay(item.post.postDate)} · {BRAND_BY_ID.get(item.post.brand)?.name}{" "}
        · @{item.publication.handle}
      </p>
      <p className="font-medium">{item.post.topic}</p>
    </div>
  );
}

function ToPostCard({
  item,
  onChange,
}: {
  item: SnapchatItem;
  onChange: () => void;
}) {
  const run = useRunMutation();
  const toast = useToast();
  const { post, publication } = item;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-hairline bg-surface p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Heading item={item} />
        <button
          type="button"
          onClick={() =>
            void run(async () => {
              await api.markPosted(publication.id);
              onChange();
            }, "Story marquée comme postée.")
          }
          className={PRIMARY_BUTTON}
        >
          Marquer comme posté
        </button>
      </div>

      <div className="no-scrollbar flex gap-3 overflow-x-auto">
        {post.slides.map((_, index) => {
          const url = slideUrl(post.id, index + 1, true);
          return (
            <a
              key={index}
              href={url}
              download={`${post.brand}-${post.postDate}-${index + 1}.jpg`}
              className="group relative shrink-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- JPEG rendu par /api/social/slides, déjà à la bonne taille */}
              <img
                src={url}
                alt={`Image ${index + 1}`}
                loading="lazy"
                className="aspect-9/16 w-36 rounded-xl border border-hairline"
              />
              <span className="absolute inset-x-2 bottom-2 rounded-full bg-background/85 py-1 text-center text-[11px] font-semibold">
                Télécharger
              </span>
            </a>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-raised p-3">
        <p className="min-w-0 flex-1 text-sm">{post.captions.snapchat}</p>
        <button
          type="button"
          onClick={() =>
            void navigator.clipboard
              .writeText(post.captions.snapchat)
              .then(() => toast.success("Texte copié."))
          }
          className={SECONDARY_BUTTON}
        >
          Copier
        </button>
      </div>
    </div>
  );
}

function ViewsRow({
  item,
  onChange,
}: {
  item: SnapchatItem;
  onChange: () => void;
}) {
  const run = useRunMutation();
  const known = item.publication.metrics?.views;
  const [views, setViews] = useState(known != null ? String(known) : "");

  return (
    <form
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-hairline bg-surface p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const value = Number(views);
        if (views === "" || !Number.isInteger(value) || value < 0) return;
        void run(async () => {
          await api.setSnapchatViews(item.publication.id, value);
          onChange();
        }, "Vues enregistrées.");
      }}
    >
      <Heading item={item} />
      <input
        className={`${inputClass} w-28`}
        inputMode="numeric"
        placeholder="Vues"
        value={views}
        onChange={(event) => setViews(event.target.value)}
      />
      <button type="submit" className={SECONDARY_BUTTON}>
        Enregistrer
      </button>
    </form>
  );
}
