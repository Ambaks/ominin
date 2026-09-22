"use client";

import { useState } from "react";
import { AcceptTerms, useContract } from "@/components/legal/accept-terms";
import { Field, inputClass } from "@/components/ui/field";
import { startCheckout } from "@/lib/gestion/checkout";
import { collectOffer, pricingSection } from "@/lib/landing-data";
import { signContract } from "@/lib/legal/client";
import { collectProduct } from "@/lib/products";
import { createClient } from "@/lib/supabase/client";

/*
 * Inscription click & collect : nom, adresse, SIRET facultatif. Pas d'offre
 * menu & salle ni de nombre de tables — l'établissement vend à emporter, la
 * salle ne le concerne pas. L'adresse du menu (slug) est dérivée du nom
 * plutôt que demandée, pour tenir la promesse de trois champs.
 */

const SLUG_ATTEMPTS = 5;

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function CollectSignupForm() {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [siret, setSiret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { contract, contractError } = useContract();
  const [accepted, setAccepted] = useState(false);
  const [trainingOptOut, setTrainingOptOut] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    // Vérifié avant la création : un retour ici ne laisse aucun
    // établissement derrière lui.
    if (!contract) return;
    const base = slugify(name);
    if (!base) {
      setError("Ce nom ne permet pas de construire une adresse de commande.");
      return;
    }
    const digits = siret.replace(/\s/g, "");
    if (digits && !/^\d{14}$/.test(digits)) {
      setError("Le SIRET compte 14 chiffres.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    // Le slug vient du nom : en cas de collision on suffixe plutôt que de
    // renvoyer l'utilisateur à un champ qu'on a choisi de ne pas demander.
    let lastError = "";
    for (let attempt = 0; attempt < SLUG_ATTEMPTS; attempt++) {
      const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
      const { error } = await supabase.rpc("create_etablissement", {
        p_name: name.trim(),
        p_slug: slug,
        p_address: address.trim(),
        p_siret: digits || undefined,
      });
      if (!error) {
        // L'établissement existe : la collision d'un essai précédent n'a plus
        // rien à signaler, et la suite quitte la boucle sans message.
        lastError = "";
        // La signature référence l'établissement : elle ne peut venir
        // qu'après sa création, et doit précéder tout paiement.
        try {
          await signContract(contract.versions, {
            context: "onboarding",
            trainingOptOut,
          });
        } catch {
          // L'établissement est créé : le renvoyer au formulaire lui en
          // ferait créer un second, en « -2 ». On l'envoie à son espace, où
          // le verrou de contrat redemande la signature — et où le verrou
          // d'abonnement tient le paiement tant qu'elle manque.
          break;
        }
        // Enchaîne sur le paiement ; en cas d'échec, l'espace affiche
        // l'écran « Activer mon abonnement » pour le même produit.
        try {
          // false ⇒ redirection vers Stripe en cours ; true ⇒ rien à régler.
          if (
            !(await startCheckout(contract.versions, {
              product: collectProduct.id,
              trainingOptOut,
            }))
          ) {
            return;
          }
        } catch {
          // Le verrou d'abonnement prend le relais.
        }
        break;
      }
      // 23505 : slug déjà pris — on retente avec un suffixe.
      if (error.code !== "23505") {
        lastError = error.message;
        break;
      }
      lastError = "Cette adresse de commande est déjà prise.";
    }

    if (lastError) {
      setError(lastError);
      setBusy(false);
      return;
    }
    window.location.assign("/gestion");
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full max-w-md flex-col gap-5 rounded-2xl border border-hairline bg-surface p-6"
    >
      <Field label="Nom du restaurant" required>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          className={inputClass}
        />
      </Field>
      <Field
        label="Adresse"
        required
        hint="Affichée à vos clients pour venir retirer leur commande."
      >
        <input
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          required
          className={inputClass}
        />
      </Field>
      <Field label="SIRET" hint="Facultatif — 14 chiffres.">
        <input
          value={siret}
          onChange={(event) => setSiret(event.target.value)}
          inputMode="numeric"
          autoComplete="off"
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
        Continuer vers le paiement
      </button>
      <p className="text-center text-xs text-faint">
        {collectOffer.price} €{pricingSection.perMonth}, sans engagement.
      </p>
    </form>
  );
}
