"use client";

import { useState } from "react";
import { GlassButton } from "@/components/gestion/ui";
import { Field, inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { uploadPhoto } from "@/lib/gestion/photo";

/** Photo d'un plat ou d'une affiche : téléversée (compressée) ou URL collée. */
export function PhotoField({
  value,
  onChange,
  alt,
  label = "Photo",
}: {
  value: string;
  onChange: (url: string) => void;
  alt: string;
  label?: string;
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
        error instanceof Error ? error.message : "L'envoi de la photo a échoué. Réessayez avec une image plus légère."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <Field label={label} hint="Depuis votre téléphone (compressée automatiquement), ou une adresse d'image">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {/* Un label habillé en commande : le sélecteur de fichier reste natif. */}
          <label
            className={`g-btn g-press shrink-0 cursor-pointer ${
              uploading ? "g-btn-secondary text-faint" : "g-btn-primary"
            }`}
          >
            {uploading ? "Envoi…" : value ? "Changer la photo" : "Téléverser une photo"}
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
            aria-label="Adresse de la photo"
            className={inputClass}
          />
        </div>
        {value && (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt={alt}
              className="h-24 w-40 rounded-g-card border border-hairline object-cover"
            />
            <GlassButton onClick={() => onChange("")}>Retirer</GlassButton>
          </div>
        )}
      </div>
    </Field>
  );
}
