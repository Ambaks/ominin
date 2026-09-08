"use client";

import { useState } from "react";
import { useShop } from "./context";
import { Button, HeartDivider } from "./ui";

export function NewsletterForm() {
  const { slug } = useShop();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<{ ok?: boolean; message?: string }>({});
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const response = await fetch("/api/shop/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, email }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setState(response.ok ? { ok: true, message: "Merci, c'est noté. À très vite dans ta boîte mail." } : { ok: false, message: body.error ?? "Impossible d'enregistrer ton adresse." });
    setBusy(false);
  };

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <HeartDivider />
      <h2 className="text-[26px] leading-tight md:text-[34px]">Reçois nos nouveautés et petites attentions</h2>
      <p className="max-w-lg text-sm leading-relaxed text-shop-ink-soft md:text-[15px]">Nouveautés, éditions limitées et petits mots doux. Jamais plus d&apos;un e-mail par mois.</p>
      {state.ok ? (
        <p className="rounded-full bg-shop-ok-soft px-5 py-3 text-sm font-medium text-shop-ok" role="status">
          {state.message}
        </p>
      ) : (
        <form onSubmit={onSubmit} className="flex w-full max-w-lg flex-col gap-2.5 sm:flex-row">
          <label htmlFor="newsletter-email" className="sr-only">
            Ton adresse e-mail
          </label>
          <input id="newsletter-email" type="email" required autoComplete="email" placeholder="Ton adresse e-mail" value={email} onChange={(e) => setEmail(e.target.value)} className="shop-input h-[50px] flex-1 rounded-full px-5" />
          <Button type="submit" variant="dark" className="h-[50px] px-7" loading={busy}>
            Je m&apos;inscris
          </Button>
        </form>
      )}
      {state.ok === false && (
        <p className="text-xs text-shop-error" role="alert">
          {state.message}
        </p>
      )}
    </div>
  );
}
