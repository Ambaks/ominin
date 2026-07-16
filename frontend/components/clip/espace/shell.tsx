"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipWordmark } from "@/components/clip/wordmark";
import {
  ChartIcon,
  LogoutIcon,
  type IconProps,
} from "@/components/gestion/icons";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ToastProvider } from "@/components/ui/toast";
import { useClipData } from "@/lib/clip/context";
import { createClient } from "@/lib/supabase/client";
import { LinkIcon, ListIcon, UploadIcon } from "./icons";
import { ClipLoader } from "./loader";

/*
 * Chrome de l'espace clipper, calqué sur components/gestion/shell.tsx :
 * en-tête sticky, sidebar desktop + barre d'onglets mobile — mais sans
 * memberships, rôles ni gate d'abonnement (onboarding manuel des clients).
 * Sert aussi la démo publique (/demo) : la navigation est relative au
 * basePath du fournisseur, et le chrome de session laisse place à un CTA.
 */

interface NavItem {
  /** Suffixe de chemin, préfixé par le basePath du fournisseur. */
  href: string;
  label: string;
  icon: React.ComponentType<IconProps>;
  /** Sous-pages rattachées : l'onglet reste actif quand elles sont ouvertes. */
  also?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "", label: "Publier", icon: UploadIcon, also: ["/generateur"] },
  { href: "/publications", label: "Publications", icon: ListIcon },
  { href: "/comptes", label: "Comptes", icon: LinkIcon },
  { href: "/analytique", label: "Analytique", icon: ChartIcon },
];

async function signOut() {
  await createClient().auth.signOut();
  // Navigation complète : purge le store et repasse par le proxy.
  window.location.assign("/login");
}

function isActive(pathname: string, basePath: string, item: NavItem): boolean {
  return [item.href, ...(item.also ?? [])].some((suffix) =>
    suffix === ""
      ? pathname === basePath
      : pathname.startsWith(basePath + suffix)
  );
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-hairline bg-surface p-8 text-center">
      <p className="ember-text text-[10px] font-semibold uppercase tracking-[0.28em]">
        Erreur
      </p>
      <h1 className="font-display text-xl font-medium">Chargement impossible</h1>
      <p className="text-sm text-muted">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background"
      >
        Réessayer
      </button>
    </div>
  );
}

export function ClipShell({ children }: { children: React.ReactNode }) {
  const { state, loadError, retryLoad, demo, basePath } = useClipData();
  const pathname = usePathname();

  return (
    <ToastProvider>
      <div className="flex min-h-dvh w-full flex-col">
        <header className="sticky top-0 z-40 border-b border-hairline bg-background/85 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3 lg:max-w-5xl lg:px-10">
            <div className="min-w-0">
              <p className="ember-text truncate text-[10px] font-semibold uppercase tracking-[0.28em]">
                {demo ? "Démo de l'espace" : "Votre espace"}
              </p>
              <ClipWordmark className="text-lg" />
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              {demo ? (
                <Link
                  href="/login?inscription=1"
                  className="ember-gradient rounded-full px-4 py-2 text-xs font-semibold text-background transition-transform active:scale-[0.98]"
                >
                  Créer mon espace
                </Link>
              ) : (
                state && (
                  <span className="hidden max-w-48 truncate text-xs text-muted lg:inline">
                    {state.email}
                  </span>
                )
              )}
              <ThemeToggle />
              {!demo && (
                <button
                  type="button"
                  onClick={() => void signOut()}
                  title="Se déconnecter"
                  aria-label="Se déconnecter"
                  className="rounded-full border border-hairline p-2 text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
                >
                  <LogoutIcon className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-2xl flex-1 items-start gap-10 px-5 lg:max-w-5xl lg:px-10">
          <aside className="sticky top-20 hidden w-44 shrink-0 flex-col gap-1 pt-10 lg:flex">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, basePath, item);
              return (
                <Link
                  key={item.href}
                  href={`${basePath}${item.href}`}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "border border-hairline bg-surface text-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <item.icon
                    className={`size-4.5 ${active ? "text-ember-1" : ""}`}
                  />
                  {item.label}
                </Link>
              );
            })}
          </aside>

          <main className="w-full min-w-0 flex-1 pb-28 pt-6 lg:pb-16 lg:pt-10">
            {!state ? (
              loadError ? (
                <LoadError message={loadError} onRetry={retryLoad} />
              ) : (
                <ClipLoader />
              )
            ) : (
              children
            )}
          </main>
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-background/90 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-2xl items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, basePath, item);
              return (
                <Link
                  key={item.href}
                  href={`${basePath}${item.href}`}
                  className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${
                    active ? "text-ember-1" : "text-faint"
                  }`}
                >
                  <item.icon className="size-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </ToastProvider>
  );
}
