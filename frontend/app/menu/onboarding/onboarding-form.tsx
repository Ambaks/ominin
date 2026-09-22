"use client";

import { useState } from "react";
import { AcceptTerms, useContract } from "@/components/legal/accept-terms";
import { Field, inputClass } from "@/components/ui/field";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { startCheckout, type StarterOptions } from "@/lib/gestion/checkout";
import { signContract } from "@/lib/legal/client";
import type { Offre } from "@/lib/gestion/types";
import { pricingSection } from "@/lib/landing-data";
import { createClient } from "@/lib/supabase/client";

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Slugs réservés par des routes statiques (miroir de la contrainte SQL). */
const RESERVED_SLUGS = ["demo", "collect"];

export function OnboardingForm({
  initialOffre,
  initialTables,
  starter,
}: {
  initialOffre?: Offre;
  initialTables?: number;
  /** Branchements choisis sur /devis, repris dans la commande de démarrage. */
  starter?: StarterOptions | null;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [offre, setOffre] = useState<Offre>(initialOffre ?? "digital");
  const [tableCount, setTableCount] = useState(
    initialTables ? String(initialTables) : ""
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Le contrat se signe ici, à la création de l'établissement : c'est le
  // premier moment où il y a une entité à engager, et il précède tout
  // paiement. Le choix de licence de données se fait au même instant, puis
  // se modifie dans les réglages.
  const { contract, contractError } = useContract();
  const [accepted, setAccepted] = useState(false);
  const [trainingOptOut, setTrainingOptOut] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    // Vérifié avant la création : un retour ici ne laisse aucun
    // établissement derrière lui.
    if (!contract) return;
    if (RESERVED_SLUGS.includes(slug)) {
      setError("Cette adresse est réservée, choisissez-en une autre.");
      return;
    }
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
        // 23505 : unicité (slug pris) ; 23514 : contrainte de check (réservé).
        error.code === "23505"
          ? "Cette adresse de menu est déjà prise, choisissez-en une autre."
          : error.code === "23514"
            ? "Cette adresse est réservée, choisissez-en une autre."
            : error.message
      );
      setBusy(false);
      return;
    }

    // La signature suit la création : elle référence l'établissement, qui
    // doit donc exister. Un échec ici n'immobilise pas le parcours — le
    // verrou de /gestion redemandera l'accord, plutôt que de laisser un
    // établissement créé derrière un bouton mort.
    try {
      await signContract(contract.versions, {
        context: "onboarding",
        trainingOptOut,
      });
    } catch {
      window.location.assign("/gestion");
      return;
    }

    // Enchaîne sur le paiement ; en cas d'échec (Stripe non configuré…),
    // /gestion affiche l'écran « Activer mon abonnement ».
    try {
      // false ⇒ redirection vers Stripe en cours ; true ⇒ rien à régler.
      if (
        !(await startCheckout(contract.versions, {
          starter: starter ?? undefined,
          trainingOptOut,
        }))
      ) {
        return;
      }
    } catch {
      // Le verrou d'abonnement prend le relais.
    }
    window.location.assign("/gestion");
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5 py-10">
      <ThemeToggle className="fixed right-4 top-4" />
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
            {pricingSection.plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Nombre de tables"
          required
          hint="Un Cachet imprimé par table, compris dans votre commande de démarrage."
        >
          <input
            type="number"
            min={1}
            value={tableCount}
            onChange={(event) => setTableCount(event.target.value)}
            required
            className={inputClass}
          />
        </Field>

        <AcceptTerms
          contract={contract}
          checked={accepted}
          onChange={setAccepted}
          trainingOptOut={trainingOptOut}
          onTrainingOptOut={setTrainingOptOut}
          disabled={busy}
        />

        {(error || contractError) && (
          <p className="text-sm text-ember-3">{error ?? contractError}</p>
        )}

        <button
          type="submit"
          disabled={busy || !accepted || !contract}
          className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
        >
          Créer mon établissement
        </button>
      </form>
    </div>
  );
}
