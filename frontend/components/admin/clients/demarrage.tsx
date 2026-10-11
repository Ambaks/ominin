"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/admin/format";
import { compose, describeAnswers, parseAnswers, type Answers } from "@/lib/composer";
import { starterKit } from "@/lib/landing-data";
import { formatPrice } from "@/lib/menu-data";
import { createClient } from "@/lib/supabase/client";

/*
 * Ce que le client a répondu au composeur Connect à son inscription, et la
 * commande qui en découle : de quoi préparer l'envoi sans le rappeler.
 */
interface Setup {
  answers: Answers;
  createdAt: string;
  notifiedAt: string | null;
}

export function ClientDemarrage({ etablissementId }: { etablissementId: string }) {
  const toast = useToast();
  const [setup, setSetup] = useState<Setup | null | undefined>(undefined);

  useEffect(() => {
    createClient()
      .from("starter_setups")
      .select("answers, created_at, notified_at")
      .eq("etablissement_id", etablissementId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          toast.error(error.message);
          return;
        }
        const answers = data && parseAnswers(data.answers);
        setSetup(
          answers ? { answers, createdAt: data.created_at, notifiedAt: data.notified_at } : null
        );
      });
    // toast est stable (contexte).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etablissementId]);

  if (setup === undefined) {
    return <div aria-busy className="shimmer h-64 rounded-2xl" />;
  }

  if (setup === null) {
    return (
      <EmptyState
        title="Pas de composeur"
        body="Ce client s'est inscrit sans passer par le composeur Connect : aucune réponse enregistrée."
      />
    );
  }

  const composition = compose(setup.answers);

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <section className="flex flex-col gap-4 rounded-2xl border border-hairline bg-surface p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-lg font-medium">Sa salle</h2>
          <p className="text-xs text-faint">Répondu le {formatDate(setup.createdAt)}</p>
        </div>
        <dl className="flex flex-col gap-2.5 text-sm">
          {describeAnswers(setup.answers).map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4">
              <dt className="text-muted">{label}</dt>
              <dd className="text-right font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        <ul className="flex flex-col gap-2 border-t border-hairline pt-4 text-[13px] leading-relaxed text-muted">
          {composition.notes.map((note) => (
            <li key={note.text} className="flex gap-2.5">
              <span
                className={`mt-[7px] size-1.5 shrink-0 rounded-full ${note.tone === "ok" ? "bg-ember-1" : "border border-ember-3"}`}
                aria-hidden
              />
              {note.text}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-hairline bg-surface p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-lg font-medium">Sa commande</h2>
          <p className="text-xs text-faint">
            {setup.notifiedAt ? `Réglée le ${formatDate(setup.notifiedAt)}` : "Pas encore réglée"}
          </p>
        </div>
        <dl className="flex flex-col gap-2.5 text-sm">
          {composition.lines.map((line) => (
            <div key={line.id} className="flex items-baseline justify-between gap-4">
              <dt className="text-muted">
                {line.label}
                {line.detail && <span className="block text-xs text-faint">{line.detail}</span>}
              </dt>
              <dd className={line.amount === null ? "text-xs italic text-faint" : "font-medium"}>
                {line.amount === null ? "sur devis" : formatPrice(line.amount)}
              </dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {[starterKit.printer, starterKit.ethernetCable]
            .filter((item) => composition.lines.some((line) => line.id === item.id))
            .map((item) => (
              <a
                key={item.id}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted underline decoration-hairline underline-offset-4 hover:text-foreground"
              >
                Acheter : {item.model} ↗
              </a>
            ))}
        </div>
      </section>
    </div>
  );
}
