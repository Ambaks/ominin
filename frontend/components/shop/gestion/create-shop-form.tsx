"use client";

import { useState } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { Field, inputClass } from "@/components/ui/field";
import { slugify } from "@/lib/shop/format";
import { createShop } from "@/lib/shop/gestion-api";

/** Création de la boutique de la personne connectée (nom, adresse, préfixe des commandes). */
export function CreateShopForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [prefix, setPrefix] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onName = (value: string) => {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
    if (!prefix) setPrefix(value.replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase());
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createShop({ name: name.trim(), slug: slug.trim(), orderPrefix: prefix.trim().toUpperCase() });
      window.location.assign("/gestion");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Une erreur est survenue.");
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-5 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <Wordmark suffix="Shop" className="text-2xl" />
        <h1 className="font-display text-2xl font-medium">Votre boutique</h1>
        <p className="max-w-sm text-sm text-muted">Quelques informations pour ouvrir votre espace. Tout le reste se règle ensuite.</p>
      </div>
      <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-5 rounded-3xl border border-hairline bg-surface p-6">
        <Field label="Nom de la boutique" required>
          <input className={inputClass} value={name} onChange={(e) => onName(e.target.value)} placeholder="MyBox" required />
        </Field>
        <Field label="Adresse" required hint={`shop.ominin.com/${slug || "…"}`}>
          <input
            className={inputClass}
            value={slug}
            onChange={(e) => {
              setSlug(slugify(e.target.value));
              setSlugTouched(true);
            }}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            required
          />
        </Field>
        <Field label="Préfixe des numéros de commande" required hint={`Exemple : ${prefix || "MB"}-2609-0001`}>
          <input className={`${inputClass} uppercase`} value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} pattern="[A-Z0-9]{2,4}" maxLength={4} required />
        </Field>
        {error && (
          <p className="text-sm text-ember-3" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className="ember-gradient rounded-full px-5 py-3 text-sm font-semibold text-background disabled:opacity-60">
          {busy ? "Création…" : "Ouvrir ma boutique"}
        </button>
        {/* Clientes et gérantes partagent l'hôte : celle qui arrive ici par
            erreur doit retrouver son chemin sans se créer une boutique. */}
        <p className="text-center text-xs text-muted">
          Vous cherchez votre compte cliente ? Retournez sur la boutique où vous avez commandé.
        </p>
      </form>
    </main>
  );
}
