"use client";

import Link from "next/link";
import {
  Fragment,
  Suspense,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ToastProvider } from "@/components/ui/toast";
import {
  ApercuIcon,
  LogoutIcon,
  XIcon,
  type IconProps,
} from "@/components/gestion/icons";
import { Chip, GlassButton, Mesh, Plate, Shimmer } from "@/components/gestion/ui";
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
import { SOCIAL_PRODUCTS } from "@/lib/admin/social";
import { retryLoad, useAdminLoadError } from "@/lib/admin/store";
import { createClient } from "@/lib/supabase/client";
import {
  BotIcon,
  CalendarIcon,
  ChartIcon,
  FlagIcon,
  NoteIcon,
  PulseIcon,
  ShareIcon,
  SlidersIcon,
  StoreIcon,
  UserIcon,
} from "./icons";
import { LeadPanelHost } from "./lead/lead-panel-host";
import { NotificationsButton } from "./notifications";

interface NavItem {
  /** Chemin local (sans racine ni produit). */
  href: string;
  label: string | ((product: Product | null) => string);
  icon: React.ComponentType<IconProps>;
  /** Produits où l'écran a un sens ; absent : tous. */
  products?: readonly Product[];
  /** Écrans rattachés, sans entrée propre. */
  subPaths?: readonly string[];
}

interface Section {
  id: string;
  label: string;
  items: NavItem[];
}

/*
 * Quatre questions, quatre groupes du rail. Marketing va chercher des
 * restaurants ; Clients regarde ceux qui ont signé ; Projet suit ce qui reste
 * pour finir les offres (Tâches) et les clients à interfacer (Intégration) ;
 * Entreprise tient ce qui concerne Ominin elle-même, tous produits confondus
 * (Comptes, Finances, Prestataires, Échéances, Documents), d'où l'absence de
 * barre produit. L'écran des fiches de prospection (crm_restaurants) prend le
 * nom de qui l'on prospecte pour le produit (Restaurants, Boutiques,
 * Clippeurs, Entreprises) ; côté Clients, ce sont des établissements.
 *
 * Sous la barre haute, les produits : la vue d'ensemble montre tout, la vue
 * d'un produit ne garde que les écrans qui le concernent, filtrés sur lui.
 *
 * Un seul groupe de routes porte le tout, sinon changer de section ou de
 * produit démonterait AdminShell et rechargerait le store à chaque bascule.
 */
const SECTIONS: Section[] = [
  {
    id: "marketing",
    label: "Marketing",
    items: [
      { href: "/", label: "Aperçu", icon: ApercuIcon },
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
      { href: "/commerciaux", label: "Commerciaux", icon: UserIcon },
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
      { href: "/taches", label: "Tâches", icon: FlagIcon },
      { href: "/projet", label: "Intégration", icon: StoreIcon },
    ],
  },
  {
    id: "entreprise",
    label: "Entreprise",
    items: [
      { href: "/comptes", label: "Comptes", icon: UserIcon },
      { href: "/finances", label: "Finances", icon: ChartIcon },
      { href: "/prestataires", label: "Prestataires", icon: ShareIcon },
      { href: "/echeances", label: "Échéances", icon: CalendarIcon },
      { href: "/documents", label: "Documents", icon: NoteIcon },
    ],
  },
];

/** Places fixes de la barre d'onglets ; le reste de la section et les autres sections vont dans « Plus ». */
const PRIMARY_SLOTS = 4;

function isActive(localPath: string, item: NavItem): boolean {
  if (item.href === "/") return localPath === item.href;
  return [item.href, ...(item.subPaths ?? [])].some(
    (path) => localPath === path || localPath.startsWith(`${path}/`),
  );
}

/** La section suit l'URL : rien à mémoriser, un lien profond ouvre la bonne. */
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

async function signOut() {
  await createClient().auth.signOut();
  // Navigation complète : purge le store et repasse par le proxy.
  window.location.assign(adminLoginPath());
}

function ShellSkeleton() {
  return (
    <div aria-busy className="grid gap-g-gap">
      <Shimmer className="h-10 w-44" />
      <div className="grid gap-g-gap sm:grid-cols-2 lg:grid-cols-4">
        <Shimmer className="h-28" />
        <Shimmer className="h-28" />
        <Shimmer className="h-28" />
        <Shimmer className="h-28" />
      </div>
      <Shimmer className="h-44" />
    </div>
  );
}

function LoadError({ message }: { message: string }) {
  return (
    <Plate className="mx-auto flex max-w-md flex-col items-center gap-4 p-8 text-center">
      <p className="g-eyebrow g-problem text-g-entity">Erreur</p>
      <h1 className="font-display text-g-h2">Chargement impossible</h1>
      <p className="text-g-body text-muted">{message}</p>
      <GlassButton variant="primary" onClick={() => retryLoad()}>
        Réessayer
      </GlassButton>
    </Plate>
  );
}

function Brand({ href, small = false }: { href: string; small?: boolean }) {
  return (
    <Link href={href} className={`g-brand ${small ? "g-brand-sm" : ""}`} title="Aperçu">
      <span className="ember-text font-display font-semibold">Ominin</span>
      <small className={small ? "max-sm:hidden" : ""}>Admin</small>
    </Link>
  );
}

function Count({ value }: { value: number }) {
  return value > 0 ? <span className="g-count">{value}</span> : null;
}

/** Feuille « Plus » : les autres écrans, toutes sections confondues. */
function PlusSheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label="Plus"
      className="g-sheet g-glass"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="g-sheet-body">{children}</div>
    </dialog>
  );
}

const subscribeNever = () => () => {};

/*
 * Les pages de l'admin sont prérendues : servies par réécriture (/restaurants,
 * /menu/restaurants), leur HTML a été produit pour /admin/restaurants. Tout ce que le
 * shell déduit du chemin — liens, section et produit actifs, écrans proposés —
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

export function AdminShell({ children }: { children: React.ReactNode }) {
  const state = useProductAdmin();
  const loadError = useAdminLoadError();
  const hydrated = useHydrated();
  const { rootPath, basePath, localPath, product } = useAdminBasePath();
  const [moreOpen, setMoreOpen] = useState(false);
  const section = sectionOf(localPath);
  const current = section.items.find((item) => isActive(localPath, item));
  const items = section.items.filter((item) => availableIn(item, product));
  const pendingDrafts = state?.pendingDrafts ?? 0;
  const primary = items.slice(0, PRIMARY_SLOTS);
  const closeMore = () => setMoreOpen(false);

  /** Changer de produit garde l'écran courant s'il le concerne. */
  const productHref = (target: Product | null) => {
    const screen =
      current && availableIn(current, target)
        ? localPath
        : landingOf(section, target).href;
    return adminHref(target ? `${rootPath}/${target}` : rootPath, screen);
  };

  const badgeCount = (item: NavItem) =>
    item.href === "/prospection" ? pendingDrafts : 0;

  /*
   * Le rail liste toutes les sections ouvertes au produit, chacune sous son
   * surtitre ; la pilule active glisse d'une entrée à l'autre, sa position
   * se calcule en jetons (hauteur d'entrée, gouttière, rangée de groupe).
   */
  const groups = SECTIONS.map((group) => ({
    ...group,
    items: group.items.filter((item) => availableIn(item, product)),
  })).filter((group) => group.items.length > 0);
  let railRows = 0;
  let railGroups = 0;
  let pillStyle: CSSProperties | undefined;
  const rail = groups.map((group) => {
    railGroups += 1;
    const links = group.items.map((item) => {
      const index = railRows++;
      if (item === current) {
        pillStyle = {
          "--g-nav-y": `calc(${index} * (var(--g-nav-h) + var(--g-nav-gap)) + ${railGroups} * (var(--g-nav-group-h) + var(--g-nav-gap)))`,
        } as CSSProperties;
      }
      return (
        <Link
          key={item.href}
          href={adminHref(basePath, item.href)}
          aria-current={item === current ? "page" : undefined}
          className="g-nav-item g-rise"
          style={{ "--g-i": index } as CSSProperties}
        >
          <item.icon />
          {labelOf(item, product)}
          <Count value={badgeCount(item)} />
        </Link>
      );
    });
    return (
      <Fragment key={group.id}>
        <div className="g-nav-group">
          <span className="g-eyebrow">{group.label}</span>
        </div>
        {links}
      </Fragment>
    );
  });

  const unavailable = (screen: NavItem, target: Product) => {
    const fallback = items[0];
    return fallback ? (
      <EmptyState
        title={`${labelOf(screen, product)} ne concerne pas ${PRODUCT_LABELS[target]}`}
        action={
          <GlassButton variant="primary" href={adminHref(basePath, fallback.href)}>
            {labelOf(fallback, product)}
          </GlassButton>
        }
      />
    ) : (
      <EmptyState
        title={`Rien côté ${section.label} pour ${PRODUCT_LABELS[target]}`}
        body="Aucun écran de cette section ne suit encore ce produit."
        action={
          <GlassButton variant="primary" href={productHref(null)}>
            Vue d&apos;ensemble
          </GlassButton>
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

  const home = adminHref(basePath, "/");

  return (
    <ToastProvider>
      <Mesh />
      <div className="g-shell g-titres">
        <aside className="g-rail g-glass">
          <Brand href={home} />
          <nav aria-label="Sections" className="g-nav">
            {hydrated && pillStyle && <span className="g-nav-pill" style={pillStyle} aria-hidden />}
            {hydrated && rail}
          </nav>
          <div className="mt-auto grid gap-2 pt-3">
            <button type="button" onClick={() => void signOut()} className="g-nav-item">
              <LogoutIcon />
              Se déconnecter
            </button>
          </div>
        </aside>

        <div className="g-col">
          <header className="g-topbar g-glass">
            <div className="g-who">
              <b className="truncate font-display text-g-name">
                {hydrated ? section.label : "Admin"}
              </b>
              {hydrated && product && (
                <span className="max-sm:hidden">
                  <Chip>{PRODUCT_LABELS[product]}</Chip>
                </span>
              )}
            </div>
            <NotificationsButton />
            <ThemeToggle />
            <span className="lg:hidden max-sm:hidden">
              <Brand href={home} small />
            </span>
          </header>

          {hydrated && section.id !== "entreprise" && (
            <nav
              aria-label="Produit"
              className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-[var(--g-topbar-mx-sm)] lg:px-[var(--g-topbar-mx)]"
            >
              {[null, ...PRODUCTS].map((target) => {
                const active = target === product;
                return (
                  <Link
                    key={target ?? "ensemble"}
                    href={productHref(target)}
                    aria-current={active ? "page" : undefined}
                    className={`g-btn ${active ? "g-btn-primary" : "g-btn-secondary"} g-press shrink-0`}
                  >
                    {target ? PRODUCT_LABELS[target] : "Vue d'ensemble"}
                  </Link>
                );
              })}
            </nav>
          )}

          <main className="w-full min-w-0 flex-1 px-[var(--g-topbar-mx-sm)] pb-[calc(var(--g-tab-h)+2*var(--g-tabbar-pad-y)+var(--g-tabbar-bottom)+var(--g-gap))] pt-6 lg:px-[var(--g-topbar-mx)] lg:pb-16">
            {content}
          </main>
        </div>

        {state && (
          <Suspense>
            <LeadPanelHost />
          </Suspense>
        )}

        {hydrated && (
          <nav
            aria-label="Sections"
            className="g-tabbar g-glass"
            style={{ "--g-tabs": primary.length + 1 } as CSSProperties}
          >
            {primary.map((item) => (
              <Link
                key={item.href}
                href={adminHref(basePath, item.href)}
                aria-current={item === current ? "page" : undefined}
                className="g-tab"
              >
                <item.icon />
                <span>{labelOf(item, product)}</span>
                <Count value={badgeCount(item)} />
              </Link>
            ))}
            <button
              type="button"
              aria-expanded={moreOpen}
              aria-haspopup="dialog"
              onClick={() => setMoreOpen(true)}
              className="g-tab"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <circle cx="6" cy="12" r="1.6" />
                <circle cx="12" cy="12" r="1.6" />
                <circle cx="18" cy="12" r="1.6" />
              </svg>
              <span>Plus</span>
            </button>
          </nav>
        )}

        {moreOpen && (
          <PlusSheet onClose={closeMore}>
            <div className="flex items-center justify-between gap-3 pl-2">
              <h2 className="font-display text-g-h2">Plus</h2>
              <GlassButton variant="icon" aria-label="Fermer" onClick={closeMore}>
                <XIcon />
              </GlassButton>
            </div>
            {groups.map((group) => (
              <Fragment key={group.id}>
                <p className="g-eyebrow pl-2">{group.label}</p>
                <div className="g-sheet-grid">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={adminHref(basePath, item.href)}
                      aria-current={item === current ? "page" : undefined}
                      onClick={closeMore}
                      className="g-sheet-item"
                    >
                      <item.icon />
                      <span>{labelOf(item, product)}</span>
                      <Count value={badgeCount(item)} />
                    </Link>
                  ))}
                </div>
              </Fragment>
            ))}
            <div className="grid">
              <button type="button" className="g-sheet-row" onClick={() => void signOut()}>
                <LogoutIcon />
                Se déconnecter
              </button>
            </div>
          </PlusSheet>
        )}
      </div>
    </ToastProvider>
  );
}
