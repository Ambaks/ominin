"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { OFFRE_LABELS } from "@/lib/gestion/constants";
import type { Offre } from "@/lib/gestion/types";
import { createClient } from "@/lib/supabase/client";

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function OnboardingForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [offre, setOffre] = useState<Offre>("digital");
  const [tableCount, setTableCount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("create_etablissement", {
      p_name: name.trim(),
      p_slug: slug,
      p_offre: offre,
      p_table_count: Number(tableCount),
    });
    if (error) {
      setError(
        // 23505 : violation d'unicité Postgres (slug déjà pris).
        error.code === "23505"
          ? "Cette adresse de menu est déjà prise, choisissez-en une autre."
          : error.message
      );
      setBusy(false);
      return;
    }
    window.location.assign("/gestion");
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5 py-10">
      <div className="text-center">
        <p className="ember-text text-[10px] font-semibold uppercase tracking-[0.28em]">
          Bienvenue sur Ominin
        </p>
        <h1 className="mt-1 font-display text-2xl font-medium tracking-tight">
          Créez votre établissement
        </h1>
      </div>

      <form
        onSubmit={onSubmit}
        className="flex w-full max-w-md flex-col gap-5 rounded-2xl border border-hairline bg-surface p-6"
      >
        <Field label="Nom du restaurant" required>
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (!slugEdited) setSlug(slugify(event.target.value));
            }}
            required
            className={inputClass}
          />
        </Field>
        <Field
          label="Adresse du menu"
          required
          hint={`Vos clients scanneront le QR code vers /m/${slug || "votre-restaurant"}`}
        >
          <input
            value={slug}
            onChange={(event) => {
              setSlugEdited(true);
              setSlug(slugify(event.target.value));
            }}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Offre" hint="Modifiable à tout moment avec votre conseiller.">
          <select
            value={offre}
            onChange={(event) => setOffre(event.target.value as Offre)}
            className={inputClass}
          >
            {(Object.keys(OFFRE_LABELS) as Offre[]).map((value) => (
              <option key={value} value={value}>
                {OFFRE_LABELS[value]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nombre de tables" required>
          <input
            type="number"
            min={0}
            value={tableCount}
            onChange={(event) => setTableCount(event.target.value)}
            required
            className={inputClass}
          />
        </Field>

        {error && <p className="text-sm text-ember-3">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
        >
          Créer mon établissement
        </button>
      </form>
    </div>
  );
}
