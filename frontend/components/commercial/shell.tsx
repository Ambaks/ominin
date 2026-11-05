"use client";

import { Wordmark } from "@/components/brand/wordmark";
import { LogoutIcon } from "@/components/gestion/icons";
import { GlassButton, Mesh } from "@/components/gestion/ui";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { createClient } from "@/lib/supabase/client";
import { commercialPrefix } from "@/lib/site";

export async function signOut() {
  await createClient().auth.signOut();
  // Navigation complète : repasse par le proxy, qui garde l'espace.
  window.location.assign(`${commercialPrefix}/connexion`);
}

/** En-tête de l'espace commercial avant l'outil : marque, adresse connectée, déconnexion. */
export function CommercialShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Mesh />
      <div className="g-titres relative z-1 mx-auto flex min-h-dvh w-full max-w-[68ch] flex-col pb-24 print:max-w-none print:pb-0">
        <header className="g-topbar g-glass print:hidden">
          <div className="g-who flex-col items-start gap-0">
            <Wordmark suffix="Commercial" />
            <span className="max-w-full truncate text-g-meta text-faint">{email}</span>
          </div>
          <ThemeToggle />
          <GlassButton variant="icon" title="Se déconnecter" aria-label="Se déconnecter" onClick={() => void signOut()}>
            <LogoutIcon />
          </GlassButton>
        </header>
        <main className="mt-6 px-[var(--g-topbar-mx-sm)] sm:px-[var(--g-topbar-mx)] print:px-0">{children}</main>
      </div>
    </>
  );
}
