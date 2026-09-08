"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ToastProvider } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import type { ShopMemberRole } from "@/lib/shop/types";
import {
  DashboardIcon,
  ExternalLinkIcon,
  FileIcon,
  GiftIcon,
  LogoutIcon,
  MessageIcon,
  PackageIcon,
  SettingsIcon,
  SlidersIcon,
  TagIcon,
  TruckIcon,
  UsersIcon,
  type IconProps,
} from "../icons";

/*
 * Coquille de l'espace de gestion d'une boutique : même structure que
 * l'espace restaurant (en-tête, barre latérale, barre mobile), aux couleurs
 * d'Ominin — le thème de la boutique ne s'applique qu'à son site public.
 */

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<IconProps>;
  ownerOnly?: boolean;
  /** Onglet réservé à la barre latérale (la barre mobile garde l'essentiel). */
  sidebarOnly?: boolean;
  badge?: "toPrepare" | "unread";
}

const NAV_ITEMS: NavItem[] = [
  { href: "/gestion", label: "Aperçu", icon: DashboardIcon },
  { href: "/gestion/commandes", label: "Commandes", icon: PackageIcon, badge: "toPrepare" },
  { href: "/gestion/produits", label: "Produits", icon: GiftIcon },
  { href: "/gestion/messages", label: "Messages", icon: MessageIcon, badge: "unread" },
  { href: "/gestion/options", label: "Options", icon: SlidersIcon, sidebarOnly: true },
  { href: "/gestion/livraisons", label: "Livraisons", icon: TruckIcon, sidebarOnly: true },
  { href: "/gestion/clientes", label: "Clientes", icon: UsersIcon, sidebarOnly: true },
  { href: "/gestion/codes-promo", label: "Codes promo", icon: TagIcon, ownerOnly: true, sidebarOnly: true },
  { href: "/gestion/contenu", label: "Contenu", icon: FileIcon, sidebarOnly: true },
  { href: "/gestion/boutique", label: "Boutique", icon: SettingsIcon, ownerOnly: true },
];

const ROLE_LABELS: Record<ShopMemberRole, string> = { proprietaire: "Propriétaire", equipe: "Équipe" };

async function signOut() {
  await createClient().auth.signOut();
  window.location.assign("/connexion");
}

const isActive = (pathname: string, href: string) => (href === "/gestion" ? pathname === href : pathname.startsWith(href));

export function ShopGestionShell({
  shopName,
  shopSlug,
  role,
  counts,
  children,
}: {
  shopName: string;
  shopSlug: string;
  role: ShopMemberRole;
  counts: { toPrepare: number; unread: number };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.ownerOnly || role === "proprietaire");
  const mobileItems = items.filter((item) => !item.sidebarOnly);

  const badge = (item: NavItem, compact?: boolean) => {
    const value = item.badge ? counts[item.badge] : 0;
    if (!value) return null;
    return (
      <span className={`flex items-center justify-center rounded-full bg-ember-3 font-bold text-background ${compact ? "absolute right-1/2 top-1 -mr-6 size-4 text-[9px]" : "ml-auto size-5 text-[10px]"}`}>
        {value}
      </span>
    );
  };

  return (
    <ToastProvider>
      <div className="flex min-h-dvh w-full flex-col">
        <header className="sticky top-0 z-40 border-b border-hairline bg-background/85 backdrop-blur-md print:hidden">
          <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3 lg:max-w-5xl lg:px-10 xl:max-w-7xl">
            <div className="min-w-0">
              <p className="ember-text truncate text-[10px] font-semibold uppercase tracking-[0.28em]">Ominin Shop · {ROLE_LABELS[role]}</p>
              <p className="truncate font-display text-lg font-medium">{shopName}</p>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              <ThemeToggle />
              <a href={`/${shopSlug}`} target="_blank" rel="noopener" title="Voir ma boutique" aria-label="Voir ma boutique" className="flex items-center gap-1.5 rounded-full border border-hairline p-2 text-xs font-medium text-muted transition-colors hover:border-ember-2/40 hover:text-foreground lg:px-3.5 lg:py-2">
                <ExternalLinkIcon className="size-3.5" />
                <span className="hidden lg:inline">Voir ma boutique</span>
              </a>
              <button type="button" onClick={() => void signOut()} title="Se déconnecter" aria-label="Se déconnecter" className="rounded-full border border-hairline p-2 text-muted transition-colors hover:border-ember-2/40 hover:text-foreground">
                <LogoutIcon className="size-3.5" />
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-2xl flex-1 items-start gap-10 px-5 lg:max-w-5xl lg:px-10 xl:max-w-7xl">
          <aside className="sticky top-20 hidden w-44 shrink-0 flex-col gap-1 pt-10 lg:flex print:hidden">
            {items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link key={item.href} href={item.href} className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${active ? "border border-hairline bg-surface text-foreground" : "text-muted hover:text-foreground"}`}>
                  <item.icon className={`size-4.5 ${active ? "text-ember-1" : ""}`} />
                  {item.label}
                  {badge(item)}
                </Link>
              );
            })}
          </aside>
          <main className="w-full min-w-0 flex-1 pb-28 pt-6 lg:pb-16 lg:pt-10">{children}</main>
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-background/90 backdrop-blur-md lg:hidden print:hidden">
          <div className="mx-auto flex max-w-2xl items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
            {mobileItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link key={item.href} href={item.href} className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${active ? "text-ember-1" : "text-faint"}`}>
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
