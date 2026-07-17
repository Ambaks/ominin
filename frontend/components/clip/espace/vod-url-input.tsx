"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { isValidSourceUrl } from "@/lib/clip/vod/validation";

export function VodUrlInput({
  onSubmit,
  submitting,
}: {
  onSubmit: (url: string) => void;
  submitting: boolean;
}) {
  const [url, setUrl] = useState("");
  const trimmed = url.trim();
  const valid = trimmed.length > 0 && isValidSourceUrl(trimmed);

  return (
    <div className="flex flex-col gap-3">
      <Field
        label="Lien de la vidéo"
        hint="Vidéo ou live YouTube, VOD Twitch"
      >
        <input
          type="url"
          className={inputClass}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=… ou https://twitch.tv/videos/…"
          disabled={submitting}
        />
      </Field>
      {trimmed.length > 0 && !valid && (
        <p className="text-xs text-ember-3">
          Seuls les liens YouTube et les VOD Twitch sont acceptés.
        </p>
      )}
      <button
        type="button"
        disabled={!valid || submitting}
        onClick={() => onSubmit(trimmed)}
        className="ember-gradient self-start rounded-full px-6 py-3 text-sm font-semibold text-background transition-transform active:scale-[0.98] disabled:opacity-50"
      >
        {submitting ? (
          <span className="animate-pulse">Lancement…</span>
        ) : (
          "Lancer l'analyse"
        )}
      </button>
    </div>
  );
}
