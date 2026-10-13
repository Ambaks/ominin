"use client";

import { useState } from "react";
import { Arrow, buttonClass } from "@/components/button";
import { Choices, Field } from "@/components/form";
import { clientTypes, projectTypes, responseTime, surfaceRanges, timings } from "@/lib/devis";

type Status = "idle" | "sending" | "sent" | "error";

export function QuoteForm() {
  const [status, setStatus] = useState<Status>("idle");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const res = await fetch("/api/devis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).catch(() => null);
    setStatus(res?.ok ? "sent" : "error");
  }

  if (status === "sent") {
    return (
      <div role="status" className="flex flex-col gap-6 border-t border-line pt-10">
        <p className="display display-m">
          Demande <em>reçue.</em>
        </p>
        <p className="lead max-w-lg text-muted">
          Nous revenons vers vous sous {responseTime}. Vous pourrez répondre à notre e-mail avec des photos du chantier.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-10">
      <Choices legend="Vous êtes" name="client" options={clientTypes} />
      <Choices legend="Type d'ouvrage" name="type" options={projectTypes} />
      <Choices legend="Surface estimée" name="surface" options={surfaceRanges} />
      <Choices legend="Délai souhaité" name="delai" options={timings} />
      <div className="grid gap-10 sm:grid-cols-2">
        <Field label="Nom" name="nom" required autoComplete="name" />
        <Field label="Ville du chantier" name="ville" required autoComplete="address-level2" />
        <Field label="E-mail" name="email" type="email" required autoComplete="email" />
        <Field label="Téléphone" name="telephone" type="tel" autoComplete="tel" />
      </div>
      <Field label="Le chantier en quelques mots" name="message" multiline placeholder="Support, couche à retirer, accès, délai souhaité…" />
      <div aria-hidden className="absolute -left-[9999px]">
        <label>
          Site web
          <input name="site" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <button
          type="submit"
          disabled={status === "sending"}
          className={`${buttonClass()} disabled:opacity-60`}
        >
          <span aria-hidden className="absolute inset-0 translate-y-full bg-fg transition-transform duration-500 ease-out group-hover/btn:translate-y-0" />
          <span className="relative">{status === "sending" ? "Envoi…" : "Envoyer la demande"}</span>
          <Arrow className="relative transition-transform duration-500 ease-out group-hover/btn:translate-x-1" />
        </button>
        <p className="text-[0.9rem] text-muted">Devis gratuit, sans engagement. Réponse sous {responseTime}.</p>
      </div>
      {status === "error" && (
        <p role="alert" className="text-accent-text">
          L&apos;envoi n&apos;a pas abouti. Vérifiez les champs obligatoires et réessayez dans un instant.
        </p>
      )}
    </form>
  );
}
