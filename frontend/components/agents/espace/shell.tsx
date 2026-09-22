"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MailIcon, SearchIcon } from "@/components/admin/icons";
import { AgentsWordmark } from "@/components/agents/wordmark";
import {
  ApercuIcon,
  CheckIcon,
  GearIcon,
  LogoutIcon,
  type IconProps,
} from "@/components/gestion/icons";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ToastProvider } from "@/components/ui/toast";
import { useAgents } from "@/lib/agents/context";
import { createClient } from "@/lib/supabase/client";

/*
 * Chrome de l'espace Agents, calqué sur l'espace Clip : en-tête sticky,
 * sidebar desktop + barre d'onglets mobile. Le badge « À valider » compte
 * les brouillons qui attendent le client — le seul appel à l'action récurrent.
 */

const BASE = "/espace";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<IconProps>;
  badge?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "", label: "Aperçu", icon: ApercuIcon },
  { href: "/validation", label: "À valider", icon: CheckIcon, badge: true },
  { href: "/emails", label: "E-mails", icon: MailIcon },
  { href: "/prospects", label: "Prospects", icon: SearchIcon },
  { href: "/reglages", label: "Réglages", icon: GearIcon },
];

async function signOut() {
  await createClient().auth.signOut();
  window.location.assign("/connexion");
}

function isActive(pathname: string, href: string): boolean {
  return href === "" ? pathname === BASE : pathname.startsWith(BASE + href);
}

function Loader() {
  return (
    <div
      aria-busy
      className="relative flex min-h-[50dvh] flex-col items-center justify-center overflow-hidden rounded-2xl border border-hairline bg-surface px-6 py-16 text-center"
    >
      <div
        className="agents-radar-motif absolute inset-0 [mask-image:radial-gradient(ellipse_70%_80%_at_50%_40%,black,transparent)]"
        aria-hidden
      />
      <div className="ember-glow absolute inset-0" aria-hidden />
      <div className="relative flex flex-col items-center gap-4">
        <AgentsWordmark className="text-2xl" />
        <p className="text-sm text-muted">Chargement de votre espace…</p>
        <div className="h-1.5 w-56 overflow-hidden rounded-full bg-background/70">
          <div className="loader-bar ember-gradient h-full w-1/3 rounded-full" />
        </div>
      </div>
    </div>
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

function Badge({ count, active }: { count: number; active: boolean }) {
  if (count === 0) return null;
  return (
    <span
      className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
        active ? "ember-gradient text-background" : "bg-ember-2/15 text-ember-2"
      }`}
    >
      {count}
    </span>
  );
}

export function AgentsShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const { state, loadError, reload } = useAgents();
  const pathname = usePathname();
  const pending = state?.stats.pending ?? 0;

  return (
    <ToastProvider>
      <div className="flex min-h-dvh w-full flex-col">
        <header className="sticky top-0 z-40 border-b border-hairline bg-background/85 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 px-5 py-3 lg:max-w-5xl lg:px-10">
            <div className="min-w-0">
              <p className="ember-text truncate text-[10px] font-semibold uppercase tracking-[0.28em]">
                {state?.profile.company_name || "Votre agent"}
              </p>
              <AgentsWordmark className="text-lg" />
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              <span className="hidden max-w-48 truncate text-xs text-muted lg:inline">
                {email}
              </span>
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
                  href={`${BASE}${item.href}`}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "border border-hairline bg-surface text-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className={`size-4.5 ${active ? "text-ember-1" : ""}`} />
                  {item.label}
                  {item.badge && <Badge count={pending} active={active} />}
                </Link>
              );
            })}
          </aside>

          <main className="w-full min-w-0 flex-1 pb-28 pt-6 lg:pb-16 lg:pt-10">
            {state ? (
              children
            ) : loadError ? (
              <LoadError message={loadError} onRetry={reload} />
            ) : (
              <Loader />
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
                  href={`${BASE}${item.href}`}
                  className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${
                    active ? "text-ember-1" : "text-faint"
                  }`}
                >
                  <item.icon className="size-5" />
                  {item.label}
                  {item.badge && pending > 0 && (
                    <span className="ember-gradient absolute right-[calc(50%-1.25rem)] top-1.5 min-w-4 rounded-full px-1 text-[9px] font-semibold leading-4 text-background tabular-nums">
                      {pending}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </ToastProvider>
  );
}
