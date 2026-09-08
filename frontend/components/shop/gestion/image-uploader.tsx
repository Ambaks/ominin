"use client";

import { useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { uploadProductPhoto } from "@/lib/shop/gestion-api";
import { ArrowDownIcon, ArrowUpIcon, TrashIcon, UploadIcon } from "../icons";
import { secondaryButton } from "./page-header";

export interface UploadedImage {
  url: string;
  alt: string | null;
}

export function ImageUploader({ images, onChange }: { images: UploadedImage[]; onChange: (images: UploadedImage[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    const added: UploadedImage[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      try {
        added.push({ url: await uploadProductPhoto(file), alt: null });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Envoi impossible.");
      }
    }
    if (added.length) onChange([...images, ...added]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const move = (index: number, delta: number) => {
    const next = [...images];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {images.map((img, i) => (
          <div key={img.url} className="group relative aspect-[4/5] overflow-hidden rounded-xl border border-hairline bg-surface-raised">
            <img src={img.url} alt="" className="size-full object-cover" />
            {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ember-1">Principale</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-gradient-to-t from-background/80 to-transparent p-2 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
              <button type="button" onClick={() => move(i, -1)} aria-label="Monter" className="flex size-7 items-center justify-center rounded-full bg-background">
                <ArrowUpIcon className="size-3.5" />
              </button>
              <button type="button" onClick={() => move(i, 1)} aria-label="Descendre" className="flex size-7 items-center justify-center rounded-full bg-background">
                <ArrowDownIcon className="size-3.5" />
              </button>
              <button type="button" onClick={() => onChange(images.filter((_, j) => j !== i))} aria-label="Retirer" className="flex size-7 items-center justify-center rounded-full bg-background text-ember-3">
                <TrashIcon className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-hairline text-xs font-medium text-muted transition hover:border-ember-2/40 hover:text-foreground disabled:opacity-60">
          <UploadIcon className="size-5" />
          {uploading ? "Envoi…" : "Ajouter"}
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void handleFiles(e.target.files)} />
      <p className="text-xs text-faint">JPG, PNG ou WebP, redimensionnées automatiquement. La première photo est celle de la grille.</p>
      {images.length === 0 && (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className={`${secondaryButton} w-fit`}>
          Choisir des photos
        </button>
      )}
    </div>
  );
}
