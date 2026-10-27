"use client";

import { Wordmark } from "@/components/brand/wordmark";
import { LogoutIcon } from "@/components/gestion/icons";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { createClient } from "@/lib/supabase/client";
import { commercialPrefix } from "@/lib/site";

async function signOut() {
  await createClient().auth.signOut();
  // Navigation complète : repasse par le proxy, qui garde l'espace.
  window.location.assign(`${commercialPrefix}/connexion`);
}

/** En-tête de l'espace commercial : marque, adresse connectée, déconnexion. */
export function CommercialShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[68ch] px-4 pb-24 sm:px-6 print:max-w-none print:px-0">
      <header className="flex items-center justify-between gap-3 py-4 print:hidden">
        <div className="flex min-w-0 flex-col">
          <Wordmark suffix="Commercial" />
          <span className="truncate text-xs text-faint">{email}</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => void signOut()}
            title="Se déconnecter"
            aria-label="Se déconnecter"
            className="rounded-full border border-hairline p-2 text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
          >
            <LogoutIcon className="size-3.5" />
          </button>
        </div>
      </header>
      <main className="mt-6">{children}</main>
    </div>
  );
}
