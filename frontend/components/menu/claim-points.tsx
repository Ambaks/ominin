"use client";

import { useState } from "react";
import { maskContact } from "@/lib/menu/loyalty";
import { useLoyaltyMember } from "@/lib/menu/loyalty-member";
import { createClient } from "@/lib/supabase/client";

/*
 * Sur l'écran « Commande envoyée », pour une commande partie sans carte :
 * « Cette commande vaut 22 points. On les garde ? ». Un champ, et les points
 * de la commande qui vient de partir sont mis de côté (loyalty_claim_order) —
 * crédités tout de suite si elle est déjà réglée, sinon à l'encaissement. Le
 * téléphone peut être retenu au passage, comme depuis le panier.
 */

type ClaimState = "idle" | "saving" | "done";

export function ClaimPoints({
  orderId,
  points,
  paid,
}: {
  orderId: string;
  points: number;
  /** La commande est déjà réglée (en ligne) : les points sont là tout de suite. */
  paid: boolean;
}) {
  const loyaltyMember = useLoyaltyMember();
  const [contact, setContact] = useState("");
  const [firstName, setFirstName] = useState("");
  const [remember, setRemember] = useState(true);
  const [state, setState] = useState<ClaimState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [claimed, setClaimed] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = contact.trim();
    if (!value || state === "saving") return;
    setState("saving");
    setError(null);
    const { error: rpcError } = await createClient().rpc("loyalty_claim_order", {
      p_order_id: orderId,
      p_contact: value,
    });
    if (rpcError) {
      setState("idle");
      setError(rpcError.message);
      return;
    }
    if (remember && loyaltyMember.enabled) {
      // Les points sont acquis ; un téléphone non retenu se rattrapera à la
      // prochaine commande.
      await loyaltyMember.remember(value, firstName.trim() || undefined).catch(() => {});
    }
    setClaimed(value);
    setState("done");
  };

  if (state === "done") {
    return (
      <div
        role="status"
        className="loyalty-claim-done flex w-full flex-col items-center gap-2 rounded-2xl border border-ember-1/35 bg-linear-to-b from-ember-1/10 to-transparent px-4 py-5"
      >
        <span className="loyalty-claim-chip rounded-full bg-linear-to-r from-ember-1 to-ember-2 px-4 py-1 font-display text-2xl text-background">
          +{points}
        </span>
        <p className="font-display text-lg">
          {points} {points === 1 ? "point mis" : "points mis"} de côté
        </p>
        <p className="text-xs leading-relaxed text-muted">
          {paid
            ? `Ils sont sur votre carte (${maskContact(claimed.replace(/\s/g, ""))}).`
            : `Ils arrivent sur votre carte (${maskContact(claimed.replace(/\s/g, ""))}) dès l’encaissement.`}
          {remember && loyaltyMember.enabled && " Ce téléphone s’en souviendra."}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="loyalty-claim flex w-full flex-col gap-3 rounded-2xl border border-ember-1/30 bg-linear-to-b from-ember-1/10 to-transparent p-4 text-left"
    >
      <div>
        <p className="font-display text-lg leading-snug">
          Cette commande vaut{" "}
          <span className="text-ember-1">
            {points} {points === 1 ? "point" : "points"}
          </span>
          .
        </p>
        <p className="text-xs leading-relaxed text-muted">
          On les garde&nbsp;? Laissez votre numéro ou votre email, ils vont sur
          votre carte de fidélité.
        </p>
      </div>
      <input
        type="text"
        inputMode="email"
        autoComplete="email"
        value={contact}
        onChange={(event) => setContact(event.target.value)}
        placeholder="Téléphone ou email"
        aria-label="Téléphone ou email pour garder vos points"
        className="rounded-xl border border-hairline bg-background px-3 py-2.5 text-base outline-none transition-colors focus:border-ember-2/50"
      />
      {loyaltyMember.enabled && (
        <label className="flex items-center gap-2.5 text-xs">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="size-4 shrink-0 accent-ember-1"
          />
          <span>
            Se souvenir de ce téléphone{" "}
            <span className="text-faint">· plus rien à taper la prochaine fois</span>
          </span>
        </label>
      )}
      {loyaltyMember.enabled && remember && contact.trim() && (
        <input
          type="text"
          autoComplete="given-name"
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
          placeholder="Prénom (facultatif)"
          aria-label="Prénom, pour vous saluer à votre retour"
          className="rounded-xl border border-hairline bg-background px-3 py-2.5 text-base outline-none transition-colors focus:border-ember-2/50"
        />
      )}
      {error && <p className="text-xs text-ember-3">{error}</p>}
      <button
        type="submit"
        disabled={!contact.trim() || state === "saving"}
        className="min-h-11 rounded-full border border-ember-1 bg-ember-1/10 px-5 text-sm font-semibold text-ember-1 transition-colors hover:bg-ember-1/20 disabled:opacity-50"
      >
        {state === "saving" ? "…" : "Garder mes points"}
      </button>
    </form>
  );
}
