"use client";

import { useEffect, useState } from "react";
import { LinkIcon } from "@/components/clip/espace/icons";
import { useToast } from "@/components/ui/toast";
import { useClipData } from "@/lib/clip/context";
import { PLATFORM_LABELS } from "@/lib/clip/constants";
import { CLIP_PLATFORMS } from "@/lib/clip/provider/types";

/*
 * Comptes sociaux connectés. La connexion passe par la page hébergée du
 * prestataire (nouvel onglet) ; au retour — et à chaque refocus de la
 * fenêtre — la liste est relue pour refléter les liaisons faites là-bas.
 */
export default function ComptesPage() {
  const { state, actions } = useClipData();
  const toast = useToast();
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const onFocus = () => {
      actions.refreshAccounts().catch(() => {
        // Silencieux : la liste actuelle reste affichée.
      });
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [actions]);

  if (!state) return null;

  const connected = new Map(
    state.accounts.map((account) => [account.platform, account])
  );

  const connect = () => {
    setConnecting(true);
    actions
      .connectAccounts()
      .catch((error: Error) => toast.error(error.message))
      .finally(() => setConnecting(false));
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">
            Comptes
          </h1>
          <p className="mt-1 text-sm text-muted">
            Les réseaux reliés à votre espace — vos clips y seront publiés.
          </p>
        </div>
        <button
          type="button"
          disabled={connecting}
          onClick={connect}
          className="ember-gradient flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-background transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          <LinkIcon className="size-4" />
          {connecting ? (
            <span className="animate-pulse">Connexion…</span>
          ) : (
            "Connecter mes comptes"
          )}
        </button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {CLIP_PLATFORMS.map((platform, index) => {
          const account = connected.get(platform);
          return (
            <div
              key={platform}
              style={{ animationDelay: `${60 + index * 60}ms` }}
              className={`rise flex flex-col gap-1.5 rounded-2xl border p-5 ${
                account ? "border-hairline bg-surface" : "border-dashed border-hairline"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">
                  {PLATFORM_LABELS[platform]}
                </p>
                {account?.reauthRequired && (
                  <span className="rounded-full border border-ember-3/40 bg-ember-3/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ember-3">
                    Reconnexion requise
                  </span>
                )}
              </div>
              {account ? (
                <>
                  <p className="truncate font-display text-lg font-medium">
                    {account.displayName}
                  </p>
                  <p className="truncate text-xs text-muted">@{account.handle}</p>
                </>
              ) : (
                <p className="text-sm text-faint">Non connecté</p>
              )}
              {platform === "instagram" && !account && (
                <p className="text-xs text-faint">
                  Compte professionnel Instagram requis.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
