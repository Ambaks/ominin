"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { uploadPhoto } from "@/lib/gestion/photo";

/** Photo d'un plat ou d'une formule : téléversée (compressée) ou URL collée. */
export function PhotoField({
  value,
  onChange,
  alt,
}: {
  value: string;
  onChange: (url: string) => void;
  alt: string;
}) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      onChange(await uploadPhoto(file));
      toast.success("Photo téléversée.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "L'envoi de la photo a échoué."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <Field
      label="Photo"
      hint="Téléversez une image (compressée automatiquement) ou collez une URL"
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <label
            className={`shrink-0 cursor-pointer rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
              uploading
                ? "border border-hairline text-faint"
                : "ember-gradient text-background"
            }`}
          >
            {uploading ? "Envoi…" : "Téléverser une photo"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading}
              onChange={(event) => void handleFile(event)}
              className="hidden"
            />
          </label>
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            type="url"
            placeholder="ou https://…"
            className={inputClass}
          />
        </div>
        {value && (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt={alt}
              className="h-24 w-40 rounded-xl border border-hairline object-cover"
            />
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-sm font-semibold text-muted transition-colors hover:text-foreground"
            >
              Retirer
            </button>
          </div>
        )}
      </div>
    </Field>
  );
}
