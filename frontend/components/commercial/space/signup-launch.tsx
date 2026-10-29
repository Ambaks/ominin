"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { QrCode } from "@/components/pitch/qr-code";
import { SIGNUP_FOLLOW_POLL_MS, type LinkState, type SignupProgress } from "@/lib/commercial/signup-form";
import { commercialPrefix, commercialSiteUrl } from "@/lib/site";
import { spaceHref } from "./shell";
import { ErrorNote, PageTitle, Skeleton, cardClass, errorMessage, ghostButton, primaryButton } from "./ui";

const LINK_LABELS: Record<LinkState, string> = { done: "Branché", later: "Plus tard", todo: "À faire" };

/*
 * Lancer l'inscription : le commercial la fait sur son téléphone, ou montre
 * le QR au gérant et suit chaque étape en direct.
 */
export function SignupLaunch({ restaurantId, restaurantName }: { restaurantId: string; restaurantName: string }) {
  const [id, setId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [progress, setProgress] = useState<SignupProgress | null>(null);

  useEffect(() => {
    void fetch("/api/commercial/inscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId }),
    })
      .then(async (response) => {
        const result = (await response.json()) as { id?: string; error?: string };
        if (!response.ok || !result.id) throw new Error(result.error ?? "Inscription impossible.");
        setId(result.id);
      })
      .catch((cause: unknown) => setError(errorMessage(cause)));
  }, [restaurantId]);

  useEffect(() => {
    if (!id || !showQr) return;
    const read = () =>
      void fetch(`/api/commercial/inscription/${id}`)
        .then((response) => (response.ok ? (response.json() as Promise<SignupProgress>) : null))
        .then((result) => result && setProgress(result));
    read();
    const timer = setInterval(read, SIGNUP_FOLLOW_POLL_MS);
    return () => clearInterval(timer);
  }, [id, showQr]);

  if (error) return <ErrorNote message={error} />;
  if (!id) return <Skeleton />;

  const path = `/inscription/${id}`;
  return (
    <div className="flex flex-col gap-6">
      <PageTitle sub="Avec le gérant, sur place.">Inscrire {restaurantName}</PageTitle>
      {!showQr ? (
        <div className="flex flex-col gap-3">
          <Link href={`${commercialPrefix}${path}`} className={`${primaryButton} min-h-16 flex-col gap-0.5`}>
            Sur mon téléphone
            <span className="text-xs font-normal">Tu remplis avec le gérant, ou tu lui tends le téléphone</span>
          </Link>
          <button type="button" onClick={() => setShowQr(true)} className={`${ghostButton} min-h-16 flex-col gap-0.5`}>
            Montrer le QR au gérant
            <span className="text-xs font-normal">Il remplit sur son téléphone, tu suis ici</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5">
          <div className="rounded-2xl bg-white p-4 text-black">
            <QrCode value={`${commercialSiteUrl}${path}`} label={`Inscription de ${restaurantName}`} className="size-60" />
          </div>
          {progress && (
            <dl className={`${cardClass} flex w-full flex-col gap-2 text-sm`}>
              {[
                ["Compte créé", progress.accountCreated ? "Oui" : "Pas encore"],
                ["Stripe", LINK_LABELS[progress.stripe]],
                ["HubRise", LINK_LABELS[progress.hubrise]],
                ["Photos du menu", String(progress.photos)],
                ["Inscription", progress.finished ? "Terminée" : "En cours"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-muted">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}
          {progress?.finished && (
            <Link href={spaceHref("/carte")} className={primaryButton}>
              Retour à la carte
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
