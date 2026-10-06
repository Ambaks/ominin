"use client";

import Link from "next/link";
import { Suspense, useSyncExternalStore } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ToastProvider } from "@/components/ui/toast";
import {
  ApercuIcon,
  LogoutIcon,
  type IconProps,
} from "@/components/gestion/icons";
import {
  adminHref,
  adminLoginPath,
  useAdminBasePath,
} from "@/lib/admin/base-path";
import { useProductAdmin } from "@/lib/admin/filters";
import {
  PRODUCTS,
  PRODUCT_LABELS,
  prospectsLabel,
  type Product,
} from "@/lib/admin/products";
import { selectTasksDueBadge } from "@/lib/admin/selectors";
import { SOCIAL_PRODUCTS } from "@/lib/admin/social";
import { retryLoad, useAdminLoadError } from "@/lib/admin/store";
import { createClient } from "@/lib/supabase/client";
import {
  BotIcon,
  CalendarIcon,
  ChartIcon,
  FlagIcon,
  MapPinIcon,
  PullRequestIcon,
  PulseIcon,
  ShareIcon,
  SlidersIcon,
  StoreIcon,
  TaskIcon,
} from "./icons";
import { LeadPanelHost } from "./lead/lead-panel-host";

interface NavItem {
  /** Chemin local (sans racine ni produit). */
  href: string;
  label: string | ((product: Product | null) => string);
  icon: React.ComponentType<IconProps>;
  /** Produits où l'écran a un sens ; absent : tous. */
  products?: readonly Product[];
  /** Écrans rattachés, sans entrée propre. */
  subPaths?: readonly string[];
  /** Actif sur son seul chemin : ses sous-chemins sont d'autres entrées. */
  exact?: boolean;
}

interface Section {
  id: string;
  label: string;
  items: NavItem[];
}

/*
 * Trois questions, trois onglets. Marketing va chercher des restaurants ;
 * Clients regarde ceux qui ont signé ; Projet dit ce qu'on construit, lu
 * depuis GitHub. L'écran des fiches de prospection (crm_restaurants) prend le
 * nom de qui l'on prospecte pour le produit (Restaurants, Boutiques,
 * Clippeurs, Entreprises) ; côté Clients, ce sont des établissements.
 *
 * Sous les onglets, la barre produit : la vue d'ensemble montre tout, la vue
 * d'un produit ne garde que les écrans qui le concernent, filtrés sur lui.
 *
 * Un seul groupe de routes porte le tout, sinon changer d'onglet ou de
 * produit démonterait AdminShell et rechargerait le store à chaque bascule.
 */
const SECTIONS: Section[] = [
  {
    id: "marketing",
    label: "Marketing",
    items: [
      { href: "/", label: "Aperçu", icon: ApercuIcon },
      { href: "/carte", label: "Carte", icon: MapPinIcon },
      {
        href: "/restaurants",
        label: prospectsLabel,
        icon: StoreIcon,
        subPaths: ["/import"],
      },
      {
        href: "/prospection",
        label: "Prospection",
        icon: BotIcon,
        // Léa ne vend que la digitalisation du menu.
        products: ["menu"],
      },
      {
        href: "/reseaux",
        label: "Réseaux",
        icon: ShareIcon,
        products: SOCIAL_PRODUCTS,
      },
      { href: "/agenda", label: "Agenda", icon: CalendarIcon },
    ],
  },
  {
    id: "clients",
    label: "Clients",
    // La synthèse existe par offre (Menu, Shop, Clip, Agents) ; l'activité
    // suit le menu QR, propre à Menu. Les capacités s'ouvrent aussi avec Collect.
    items: [
      {
        href: "/clients",
        label: "Synthèse",
        icon: ChartIcon,
        products: ["menu", "shop", "clip", "agents"],
      },
      {
        href: "/activite",
        label: "Activité",
        icon: PulseIcon,
        products: ["menu"],
      },
      {
        href: "/capacites",
        label: "Capacités",
        icon: SlidersIcon,
        products: ["menu", "collect"],
      },
    ],
  },
  {
    id: "projet",
    label: "Projet",
    items: [
      { href: "/projet", label: "Planning", icon: FlagIcon, exact: true },
      { href: "/projet/taches", label: "Tâches", icon: TaskIcon },
      {
        href: "/projet/pull-requests",
        label: "Pull requests",
        icon: PullRequestIcon,
      },
    ],
  },
];

function isActive(localPath: string, item: NavItem): boolean {
  if (item.href === "/" || item.exact) return localPath === item.href;
  return [item.href, ...(item.subPaths ?? [])].some(
    (path) => localPath === path || localPath.startsWith(`${path}/`),
  );
}

/** L'onglet suit l'URL : rien à mémoriser, un lien profond ouvre le bon. */
function sectionOf(localPath: string): Section {
  return (
    SECTIONS.find(
      (section) =>
        section.id !== "marketing" &&
        section.items.some((item) => isActive(localPath, item)),
    ) ?? SECTIONS[0]
  );
}

function labelOf(item: NavItem, product: Product | null): string {
  return typeof item.label === "string" ? item.label : item.label(product);
}

function availableIn(item: NavItem, product: Product | null): boolean {
  return !product || !item.products || item.products.includes(product);
}

/** L'écran existe-t-il dans la vue de ce produit ? (l'Aperçu y renvoie) */
export function screenOpen(href: string, product: Product | null): boolean {
  const item = SECTIONS.flatMap((section) => section.items).find(
    (candidate) => candidate.href === href,
  );
  return item !== undefined && availableIn(item, product);
}

/** Premier écran d'une section ouvert au produit, à défaut le premier tout court. */
function landingOf(section: Section, product: Product | null): NavItem {
  return (
    section.items.find((item) => availableIn(item, product)) ?? section.items[0]
  );
}

/** La carte occupe tout l'espace restant, sans conteneur ni marges. */
const FULL_BLEED_PATHS = new Set(["/carte"]);

async function signOut() {
  await createClient().auth.signOut();
  // Navigation complète : purge le store et repasse par le proxy.
  window.location.assign(adminLoginPath());
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
      <h1 className="font-display text-xl font-medium">
        Chargement impossible
      </h1>
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

const subscribeNever = () => () => {};

/*
 * Les pages de l'admin sont prérendues : servies par réécriture (/carte,
 * /menu/carte), leur HTML a été produit pour /admin/carte. Tout ce que le
 * shell déduit du chemin — liens, onglet et produit actifs, écrans proposés —
 * attend donc la fin de l'hydratation, sans quoi React garderait les
 * attributs du serveur. Le contenu, lui, attend déjà le store.
 */
function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}

const ACTION_LINK =
  "ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const state = useProductAdmin();
  const loadError = useAdminLoadError();
  const hydrated = useHydrated();
  const { rootPath, basePath, localPath, product } = useAdminBasePath();
  const section = sectionOf(localPath);
  const current = section.items.find((item) => isActive(localPath, item));
  const items = section.items.filter((item) => availableIn(item, product));
  const fullBleed = state != null && FULL_BLEED_PATHS.has(localPath);
  const tasksDue = state ? selectTasksDueBadge(state.tasks) : 0;
  const pendingDrafts = state?.pendingDrafts ?? 0;

  /** Changer de produit garde l'écran courant s'il le concerne. */
  const productHref = (target: Product | null) => {
    const screen =
      current && availableIn(current, target)
        ? localPath
        : landingOf(section, target).href;
    return adminHref(target ? `${rootPath}/${target}` : rootPath, screen);
  };

  const badgeCount = (item: NavItem) =>
    item.href === "/agenda"
      ? tasksDue
      : item.href === "/prospection"
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

  const unavailable = (screen: NavItem, target: Product) => {
    const fallback = items[0];
    return fallback ? (
      <EmptyState
        title={`${labelOf(screen, product)} ne concerne pas ${PRODUCT_LABELS[target]}`}
        action={
          <Link
            href={adminHref(basePath, fallback.href)}
            className={ACTION_LINK}
          >
            {labelOf(fallback, product)}
          </Link>
        }
      />
    ) : (
      <EmptyState
        title={`Rien côté ${section.label} pour ${PRODUCT_LABELS[target]}`}
        body="Aucun écran de cette section ne suit encore ce produit."
        action={
          <Link href={productHref(null)} className={ACTION_LINK}>
            Vue d&apos;ensemble
          </Link>
        }
      />
    );
  };

  const content = !state ? (
    loadError ? (
      <LoadError message={loadError} />
    ) : (
      <ShellSkeleton />
    )
  ) : current && product && !availableIn(current, product) ? (
    unavailable(current, product)
  ) : (
    children
  );

  return (
    <ToastProvider>
      <div className="flex min-h-dvh w-full flex-col">
        <header className="sticky top-0 z-40 border-b border-hairline bg-background/85 backdrop-blur-md">
          <div
            className={`w-full px-5 ${
              fullBleed ? "lg:px-6" : "mx-auto max-w-2xl lg:max-w-6xl lg:px-10"
            }`}
          >
            <div className="flex items-center justify-between gap-4 py-3">
              <div className="flex min-w-0 flex-col gap-1.5">
                <p className="truncate font-display text-lg font-medium leading-none">
                  Ominin Admin
                </p>
                <nav className="flex h-6.5 gap-1">
                  {hydrated &&
                    SECTIONS.map((item) => {
                      const active = item.id === section.id;
                      return (
                        <Link
                          key={item.id}
                          href={adminHref(
                            basePath,
                            landingOf(item, product).href,
                          )}
                          aria-current={active ? "page" : undefined}
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                            active
                              ? "ember-gradient text-background"
                              : "border border-hairline text-muted hover:border-ember-2/40 hover:text-foreground"
                          }`}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                </nav>
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
            <nav
              aria-label="Produit"
              className="no-scrollbar -mx-5 -mb-px flex h-7.5 gap-5 overflow-x-auto px-5 lg:mx-0 lg:px-0"
            >
              {hydrated &&
                [null, ...PRODUCTS].map((target) => {
                  const active = target === product;
                  return (
                    <Link
                      key={target ?? "ensemble"}
                      href={productHref(target)}
                      aria-current={active ? "page" : undefined}
                      className={`shrink-0 border-b-2 pb-2 text-sm font-medium transition-colors ${
                        active
                          ? "border-ember-1 text-foreground"
                          : "border-transparent text-muted hover:text-foreground"
                      }`}
                    >
                      {target ? PRODUCT_LABELS[target] : "Vue d'ensemble"}
                    </Link>
                  );
                })}
            </nav>
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
            className={`sticky top-28 hidden w-44 shrink-0 flex-col gap-1 pt-10 lg:flex ${
              fullBleed ? "ml-6" : ""
            }`}
          >
            {hydrated &&
              items.map((item) => {
                const active = item === current;
                return (
                  <Link
                    key={item.href}
                    href={adminHref(basePath, item.href)}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "border border-hairline bg-surface text-foreground"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    <item.icon
                      className={`size-4.5 ${active ? "text-ember-1" : ""}`}
                    />
                    {labelOf(item, product)}
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

        {hydrated && items.length > 0 && (
          <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-background/90 backdrop-blur-md lg:hidden">
            <div className="mx-auto flex max-w-2xl items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
              {items.map((item) => {
                const active = item === current;
                return (
                  <Link
                    key={item.href}
                    href={adminHref(basePath, item.href)}
                    className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${
                      active ? "text-ember-1" : "text-faint"
                    }`}
                  >
                    <item.icon className="size-5" />
                    {labelOf(item, product)}
                    {badge(item, true)}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </ToastProvider>
  );
}
