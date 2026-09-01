"use client";

import Link from "next/link";
import { Suspense } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ToastProvider } from "@/components/ui/toast";
import {
  ApercuIcon,
  LogoutIcon,
  type IconProps,
} from "@/components/gestion/icons";
import { adminLoginPath, useAdminBasePath } from "@/lib/admin/base-path";
import { selectTasksDueBadge } from "@/lib/admin/selectors";
import { retryLoad, useAdmin, useAdminLoadError } from "@/lib/admin/store";
import { createClient } from "@/lib/supabase/client";
import {
  BotIcon,
  CalendarIcon,
  ImportIcon,
  MapPinIcon,
  PipelineIcon,
  StoreIcon,
  TaskIcon,
} from "./icons";
import { LeadPanelHost } from "./lead/lead-panel-host";

interface NavItem {
  /** Chemin local (sans préfixe /admin du mode inerte). */
  href: string;
  label: string;
  icon: React.ComponentType<IconProps>;
}

/** Barre mobile : les écrans du terrain — E-mails inclus, car approuver un
 * brouillon de Léa depuis le téléphone est le geste le plus urgent du CRM. */
const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Aperçu", icon: ApercuIcon },
  { href: "/carte", label: "Carte", icon: MapPinIcon },
  { href: "/pipeline", label: "Pipeline", icon: PipelineIcon },
  { href: "/lea", label: "Agent Léa", icon: BotIcon },
  { href: "/taches", label: "Tâches", icon: TaskIcon },
  { href: "/rdv", label: "RDV", icon: CalendarIcon },
];

/** Barre latérale uniquement : écrans de bureau (table, import). */
const DESKTOP_ITEMS: NavItem[] = [
  { href: "/restaurants", label: "Restaurants", icon: StoreIcon },
  { href: "/import", label: "Import CSV", icon: ImportIcon },
];

/** La carte occupe tout l'espace restant, sans conteneur ni marges. */
const FULL_BLEED_PATHS = new Set(["/carte"]);

async function signOut() {
  await createClient().auth.signOut();
  // Navigation complète : purge le store et repasse par le proxy.
  window.location.assign(adminLoginPath());
}

function isActive(localPath: string, href: string): boolean {
  return href === "/" ? localPath === "/" : localPath.startsWith(href);
}

function ShellSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-4">
      <div className="shimmer h-9 w-44 rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="shimmer h-28 rounded-2xl" />
        <div className="shimmer h-28 rounded-2xl" />
        <div className="shimmer h-28 rounded-2xl" />
        <div className="shimmer h-28 rounded-2xl" />
      </div>
      <div className="shimmer h-44 rounded-2xl" />
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

export function AdminShell({ children }: { children: React.ReactNode }) {
  const state = useAdmin();
  const loadError = useAdminLoadError();
  const { basePath, localPath } = useAdminBasePath();
  const fullBleed = state != null && FULL_BLEED_PATHS.has(localPath);
  const tasksDue = state ? selectTasksDueBadge(state.tasks) : 0;
  const pendingDrafts = state?.pendingDrafts ?? 0;

  const badgeCount = (item: NavItem) =>
    item.href === "/taches"
      ? tasksDue
      : item.href === "/lea"
        ? pendingDrafts
        : 0;

  const badge = (item: NavItem, compact: boolean) => {
    const count = badgeCount(item);
    return count > 0 ? (
      <span
        className={
          compact
            ? "absolute right-1/2 top-1 -mr-6 flex size-4 items-center justify-center rounded-full bg-ember-3 text-[9px] font-bold text-background"
            : "ml-auto flex size-5 items-center justify-center rounded-full bg-ember-3 text-[10px] font-bold text-background"
        }
      >
        {count}
      </span>
    ) : null;
  };

  const content = !state ? (
    loadError ? (
      <LoadError message={loadError} />
    ) : (
      <ShellSkeleton />
    )
  ) : (
    children
  );

  return (
    <ToastProvider>
      <div className="flex min-h-dvh w-full flex-col">
        <header className="sticky top-0 z-40 border-b border-hairline bg-background/85 backdrop-blur-md">
          <div
            className={`flex w-full items-center justify-between gap-4 px-5 py-3 ${
              fullBleed ? "lg:px-6" : "mx-auto max-w-2xl lg:max-w-6xl lg:px-10"
            }`}
          >
            <div className="min-w-0">
              <p className="ember-text truncate text-[10px] font-semibold uppercase tracking-[0.28em]">
                CRM interne
              </p>
              <p className="truncate font-display text-lg font-medium">
                Ominin Admin
              </p>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
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

        <div
          className={
            fullBleed
              ? "flex w-full flex-1 items-stretch"
              : "mx-auto flex w-full max-w-2xl flex-1 items-start gap-10 px-5 lg:max-w-6xl lg:px-10"
          }
        >
          <aside
            className={`sticky top-20 hidden w-44 shrink-0 flex-col gap-1 pt-10 lg:flex ${
              fullBleed ? "ml-6" : ""
            }`}
          >
            {[...NAV_ITEMS, ...DESKTOP_ITEMS].map((item) => {
              const active = isActive(localPath, item.href);
              return (
                <Link
                  key={item.href}
                  href={`${basePath}${item.href}` || "/"}
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
                  {badge(item, false)}
                </Link>
              );
            })}
          </aside>

          {fullBleed ? (
            <main className="relative min-w-0 flex-1">
              <div className="absolute inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] top-0 lg:bottom-0">
                {content}
              </div>
            </main>
          ) : (
            <main className="w-full min-w-0 flex-1 pb-28 pt-6 lg:pb-16 lg:pt-10">
              {content}
            </main>
          )}
        </div>

        {state && (
          <Suspense>
            <LeadPanelHost />
          </Suspense>
        )}

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-background/90 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-2xl items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
            {NAV_ITEMS.map((item) => {
              const active = isActive(localPath, item.href);
              return (
                <Link
                  key={item.href}
                  href={`${basePath}${item.href}` || "/"}
                  className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${
                    active ? "text-ember-1" : "text-faint"
                  }`}
                >
                  <item.icon className="size-5" />
                  {item.label}
                  {badge(item, true)}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </ToastProvider>
  );
}
