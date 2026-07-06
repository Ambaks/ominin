"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ToastProvider } from "@/components/ui/toast";
import { hasFeature } from "@/lib/gestion/permissions";
import { useGestion } from "@/lib/gestion/store";
import type { Feature } from "@/lib/gestion/types";
import { DemoSwitcher } from "./demo-switcher";
import {
  ApercuIcon,
  CommandesIcon,
  FormulesIcon,
  MenuIcon,
  TablesIcon,
  type IconProps,
} from "./icons";

interface NavItem {
  href: string;
  label: string;
  feature: Feature | null;
  icon: React.ComponentType<IconProps>;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/gestion", label: "Aperçu", feature: null, icon: ApercuIcon },
  { href: "/gestion/commandes", label: "Commandes", feature: "commandes", icon: CommandesIcon },
  { href: "/gestion/tables", label: "Tables", feature: "tables", icon: TablesIcon },
  { href: "/gestion/menu", label: "Menu", feature: null, icon: MenuIcon },
  { href: "/gestion/formules", label: "Formules", feature: null, icon: FormulesIcon },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/gestion" ? pathname === href : pathname.startsWith(href);
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

export function GestionShell({ children }: { children: React.ReactNode }) {
  const state = useGestion();
  const pathname = usePathname();

  const offre = state?.etablissement.offre;
  const items = NAV_ITEMS.filter(
    (item) => !item.feature || (offre && hasFeature(offre, item.feature))
  );
  const pendingCount =
    state?.orders.filter((order) => order.status === "en_attente").length ?? 0;

  return (
    <ToastProvider>
      <div className="flex min-h-dvh w-full flex-col">
        <header className="sticky top-0 z-40 border-b border-hairline bg-background/85 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 px-5 py-3 lg:max-w-5xl lg:px-10">
            <div className="min-w-0">
              <p className="ember-text text-[10px] font-semibold uppercase tracking-[0.28em]">
                Espace de gestion
              </p>
              <p className="truncate font-display text-lg font-medium">
                {state?.etablissement.name ?? "Ominin"}
              </p>
            </div>
            {state && (
              <DemoSwitcher etablissement={state.etablissement} role={state.role} />
            )}
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-2xl flex-1 items-start gap-10 px-5 lg:max-w-5xl lg:px-10">
          <aside className="sticky top-20 hidden w-44 shrink-0 flex-col gap-1 pt-10 lg:flex">
            {items.map((item) => {
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
                  {item.feature === "commandes" && pendingCount > 0 && (
                    <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-ember-3 text-[10px] font-bold text-background">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </aside>

          <main className="w-full min-w-0 flex-1 pb-28 pt-6 lg:pb-16 lg:pt-10">
            {state ? children : <ShellSkeleton />}
          </main>
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-background/90 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-2xl items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
            {items.map((item) => {
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
                  {item.feature === "commandes" && pendingCount > 0 && (
                    <span className="absolute right-1/2 top-1 -mr-6 flex size-4 items-center justify-center rounded-full bg-ember-3 text-[9px] font-bold text-background">
                      {pendingCount}
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
