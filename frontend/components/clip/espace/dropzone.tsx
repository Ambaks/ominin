"use client";

import { useRef, useState } from "react";
import { ACCEPTED_VIDEO_TYPES, MAX_CLIP_BYTES } from "@/lib/clip/constants";
import { UploadIcon } from "./icons";

/*
 * Zone de dépôt du clip : valide format et taille côté client (le serveur
 * revalide), puis remonte le fichier au parent qui pilote l'upload. Affiche
 * la progression pendant l'envoi vers le bucket.
 */

function formatSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}

export function Dropzone({
  file,
  progress,
  uploaded,
  disabled,
  onSelect,
}: {
  file: File | null;
  /** Fraction 0–1 pendant l'envoi, null sinon. */
  progress: number | null;
  uploaded: boolean;
  disabled: boolean;
  onSelect: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = (candidate: File | undefined) => {
    if (!candidate || disabled) return;
    if (!ACCEPTED_VIDEO_TYPES[candidate.type]) {
      setError("Format non supporté (MP4, MOV ou WebM).");
      return;
    }
    if (candidate.size > MAX_CLIP_BYTES) {
      setError("Ce clip dépasse 50 Mo. Compressez-le ou contactez-nous.");
      return;
    }
    setError(null);
    onSelect(candidate);
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          pick(event.dataTransfer.files[0]);
        }}
        className={`flex flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-10 text-center transition-colors ${
          dragging
            ? "border-ember-2/60 bg-surface"
            : "border-hairline hover:border-ember-2/40"
        } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      >
        <UploadIcon className="size-6 text-ember-1" />
        {file ? (
          <p className="text-sm font-medium">
            {file.name}{" "}
            <span className="font-normal text-faint">
              ({formatSize(file.size)})
            </span>
          </p>
        ) : (
          <>
            <p className="text-sm font-medium">
              Déposez votre clip ici ou cliquez pour choisir
            </p>
            <p className="text-xs text-faint">MP4, MOV ou WebM — 50 Mo max</p>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={Object.keys(ACCEPTED_VIDEO_TYPES).join(",")}
        className="hidden"
        onChange={(event) => {
          pick(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      {progress != null && (
        <div className="h-1.5 overflow-hidden rounded-full bg-surface">
          <div
            className="ember-gradient h-full rounded-full transition-[width]"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}
      {uploaded && progress == null && (
        <p className="text-xs font-medium text-ember-1">Clip importé.</p>
      )}
      {error && <p className="text-xs text-ember-3">{error}</p>}
    </div>
  );
}
