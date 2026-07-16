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
import { retryLoad, useClip, useClipLoadError } from "@/lib/clip/store";
import { createClient } from "@/lib/supabase/client";
import { LinkIcon, ListIcon, UploadIcon } from "./icons";

/*
 * Chrome de l'espace clipper, calqué sur components/gestion/shell.tsx :
 * en-tête sticky, sidebar desktop + barre d'onglets mobile — mais sans
 * memberships, rôles ni gate d'abonnement (onboarding manuel des clients).
 */

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<IconProps>;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/espace", label: "Publier", icon: UploadIcon },
  { href: "/espace/publications", label: "Publications", icon: ListIcon },
  { href: "/espace/comptes", label: "Comptes", icon: LinkIcon },
  { href: "/espace/analytique", label: "Analytique", icon: ChartIcon },
];

async function signOut() {
  await createClient().auth.signOut();
  // Navigation complète : purge le store et repasse par le proxy.
  window.location.assign("/login");
}

function isActive(pathname: string, href: string): boolean {
  return href === "/espace" ? pathname === href : pathname.startsWith(href);
}

function ShellSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-4">
      <div className="shimmer h-9 w-44 rounded-xl" />
      <div className="shimmer h-44 rounded-2xl" />
      <div className="shimmer h-28 rounded-2xl" />
    </div>
  );
}

function LoadError({ message }: { message: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-hairline bg-surface p-8 text-center">
      <p className="ember-text text-[10px] font-semibold uppercase tracking-[0.28em]">
        Erreur
      </p>
      <h1 className="font-display text-xl font-medium">Chargement impossible</h1>
      <p className="text-sm text-muted">{message}</p>
      <button
        type="button"
        onClick={() => retryLoad()}
        className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background"
      >
        Réessayer
      </button>
    </div>
  );
}

export function ClipShell({ children }: { children: React.ReactNode }) {
  const state = useClip();
  const loadError = useClipLoadError();
  const pathname = usePathname();

  return (
    <ToastProvider>
      <div className="flex min-h-dvh w-full flex-col">
        <header className="sticky top-0 z-40 border-b border-hairline bg-background/85 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3 lg:max-w-5xl lg:px-10">
            <div className="min-w-0">
              <p className="ember-text truncate text-[10px] font-semibold uppercase tracking-[0.28em]">
                Votre espace
              </p>
              <ClipWordmark className="text-lg" />
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              {state && (
                <span className="hidden max-w-48 truncate text-xs text-muted lg:inline">
                  {state.email}
                </span>
              )}
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
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-2xl flex-1 items-start gap-10 px-5 lg:max-w-5xl lg:px-10">
          <aside className="sticky top-20 hidden w-44 shrink-0 flex-col gap-1 pt-10 lg:flex">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
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
                <LoadError message={loadError} />
              ) : (
                <ShellSkeleton />
              )
            ) : (
              children
            )}
          </main>
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-background/90 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-2xl items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
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
