"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { openDocument } from "@/lib/admin/commerciaux";
import { formatDate } from "@/lib/admin/format";
import { displayName } from "@/lib/commercial/record";
import { SIGNUP_KINDS } from "@/lib/commercial/signup-form";
import { compose, describeAnswers, parseAnswers, type Answers } from "@/lib/composer";
import { starterKit } from "@/lib/landing-data";
import { formatPrice } from "@/lib/menu/format";
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

interface CommercialSignup {
  kind: string | null;
  manager_name: string | null;
  manager_phone: string | null;
  manager_email: string | null;
  photos: string[];
  finished_at: string | null;
  commerciaux: { email: string; first_name: string | null; last_name: string | null };
}

/* Inscrit pendant la visite d'un commercial : qui, le responsable à recontacter, les photos du menu. */
function CommercialSignupCard({ etablissementId, signup }: { etablissementId: string; signup: CommercialSignup }) {
  const toast = useToast();
  const [open, setOpen] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    createClient()
      .from("subscriptions")
      .select("status")
      .eq("etablissement_id", etablissementId)
      .eq("product", "offre")
      .maybeSingle()
      .then(({ data }) => setOpen(data?.status === "active"));
  }, [etablissementId]);

  const openSpace = async () => {
    setBusy(true);
    const response = await fetch("/api/admin/commerciaux/ouvrir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etablissementId }),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!response.ok) return toast.error(result.error ?? "Ouverture impossible.");
    setOpen(true);
    toast.success("Espace ouvert : le gérant accède à sa gestion.");
  };
  const rows: [string, string][] = [
    ["Commercial", displayName(signup.commerciaux)],
    ["Type", SIGNUP_KINDS.find((kind) => kind.id === signup.kind)?.label ?? "—"],
    ["Responsable", signup.manager_name ?? "—"],
    ["Contact", [signup.manager_phone, signup.manager_email].filter(Boolean).join(" · ") || "—"],
  ];
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-hairline bg-surface p-5 lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-medium">Inscrit avec un commercial</h2>
        {open === false && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void openSpace()}
            className="ember-gradient rounded-full px-4 py-2 text-sm font-semibold text-background disabled:opacity-60"
          >
            Menu créé : ouvrir son espace
          </button>
        )}
        {open && <span className="text-xs font-semibold text-ember-1">Espace ouvert</span>}
      </div>
      {open === false && (
        <p className="text-sm text-muted">Sa gestion affiche « Votre menu est en création » tant que l’espace n’est pas ouvert.</p>
      )}
      <dl className="flex flex-col gap-2.5 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-muted">{label}</dt>
            <dd className="text-right font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      {signup.photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {signup.photos.map((path, index) => (
            <button
              key={path}
              type="button"
              onClick={() => void openDocument(path).catch((cause: unknown) => toast.error(cause instanceof Error ? cause.message : "Photo illisible."))}
              className="rounded-full border border-hairline px-3 py-1.5 text-xs font-semibold text-muted hover:text-foreground"
            >
              Photo du menu {index + 1}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export function ClientDemarrage({ etablissementId }: { etablissementId: string }) {
  // undefined : en lecture ; null : inscrit seul.
  const [signup, setSignup] = useState<CommercialSignup | null | undefined>(undefined);
  useEffect(() => {
    createClient()
      .from("commercial_signups")
      .select("kind, manager_name, manager_phone, manager_email, photos, finished_at, commerciaux(email, first_name, last_name)")
      .eq("etablissement_id", etablissementId)
      .maybeSingle()
      .then(({ data }) => setSignup(data));
  }, [etablissementId]);
  if (signup === undefined) return <div aria-busy className="shimmer h-64 rounded-2xl" />;
  return (
    <div className="flex flex-col gap-6">
      {signup && <CommercialSignupCard etablissementId={etablissementId} signup={signup} />}
      <StarterSetup etablissementId={etablissementId} offered={signup !== null} />
    </div>
  );
}

/** offered : inscrit avec un commercial, le matériel est offert par Ominin (décision du 29/10) : la liste, sans montants. */
function StarterSetup({ etablissementId, offered }: { etablissementId: string; offered: boolean }) {
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
            {offered ? "Offerte par Ominin" : setup.notifiedAt ? `Réglée le ${formatDate(setup.notifiedAt)}` : "Pas encore réglée"}
          </p>
        </div>
        <dl className="flex flex-col gap-2.5 text-sm">
          {composition.lines.map((line) => (
            <div key={line.id} className="flex items-baseline justify-between gap-4">
              <dt className="text-muted">
                {line.label}
                {line.detail && <span className="block text-xs text-faint">{line.detail}</span>}
              </dt>
              {offered ? (
                <dd className="font-medium">× {line.quantity}</dd>
              ) : (
                <dd className={line.amount === null ? "text-xs italic text-faint" : "font-medium"}>
                  {line.amount === null ? "sur devis" : formatPrice(line.amount)}
                </dd>
              )}
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
