"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useSelectedLayoutSegment } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import "@/components/club/tokens.css";
import "@/components/gestion/soirees/soirees.css";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Modal } from "@/components/ui/modal";
import { ToastProvider } from "@/components/ui/toast";
import { clubFonts } from "@/lib/club/fonts";
import { collectBrand } from "@/lib/collect-landing-data";
import * as api from "@/lib/gestion/api";
import type { GestionLogo } from "@/lib/menu-data";
import { bullesTabName, OFFRE_LABELS } from "@/lib/gestion/constants";
import { can } from "@/lib/gestion/permissions";
import {
  activeProducts,
  awaitsAcknowledgement,
  cardCount,
  isClub,
  isClubOnly,
  isPickupShop,
  needsAttention,
  offreFeeDue,
  pickupLater,
  roleLabels,
} from "@/lib/gestion/selectors";
import { retryLoad, useGestion, useGestionLoadError } from "@/lib/gestion/store";
import type { Feature, GestionState, Role } from "@/lib/gestion/types";
import {
  playChime,
  useChimeArmed,
  useChimeEnabled,
  useOrderChime,
} from "@/lib/gestion/use-order-chime";
import { useGestionTheme } from "@/lib/gestion/use-gestion-theme";
import { VISITE_IDS, visiteFor, type VisiteId } from "@/lib/gestion/visites";
import { clubSiteUrl, collectSiteUrl, menuSiteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/client";
import {
  ApercuIcon,
  BagIcon,
  BellIcon,
  BullesIcon,
  ClockIcon,
  CommandesIcon,
  ExternalLinkIcon,
  GiftIcon,
  PaymentsIcon,
  GearIcon,
  HelpIcon,
  LogoutIcon,
  MenuIcon,
  PrinterIcon,
  ProductsIcon,
  ScanIcon,
  SoireesIcon,
  TablesIcon,
  TeamIcon,
  XIcon,
  type IconProps,
} from "./icons";
import { AdminLockButton } from "./admin-lock-button";
import { hasProviderReturn } from "./payment-settings";
import { ReacceptanceGate } from "@/components/legal/reacceptance-gate";
import { SubscriptionGate } from "./subscription-gate";
import { Chip, GlassButton, Mesh, Notice, Shimmer } from "./ui";
import { VisiteGuidee } from "./visite-guidee";

interface NavItem {
  href: string;
  label: string;
  feature: Feature | null;
  icon: React.ComponentType<IconProps>;
  /** Entrée réservée au gérant : retirée de la navigation des employés. */
  gerantOnly?: boolean;
  excludeRoles?: Role[];
  /** Entrée ouverte au serveur seulement si cette capacité l'est aussi. */
  serveurFeature?: Feature;
}

/**
 * Toutes les pages de l'espace, aux mots du métier (UX-SIMPLICITÉ § 3.2) ;
 * les URL ne bougent pas. La navigation en retient quatre par rôle et par
 * mode (§ 3.1), le reste va dans « Plus ».
 */
const NAV_ITEMS: NavItem[] = [
  // Le serveur n'a d'aperçu que si Ominin le lui ouvre ; sinon sa page
  // d'accueil est le service lui-même (voir app/menu/gestion/page.tsx).
  { href: "/gestion", label: "Aujourd’hui", feature: "apercu", icon: ApercuIcon, serveurFeature: "apercu_serveur" },
  { href: "/gestion/commandes", label: "Commandes", feature: "commandes", icon: CommandesIcon },
  { href: "/gestion/soirees", label: "Soirées", feature: "soirees", icon: SoireesIcon },
  { href: "/gestion/bulles", label: "Réservations", feature: "bulles", icon: BullesIcon, excludeRoles: ["cuisinier"] },
  { href: "/gestion/retraits", label: "Retraits", feature: "retraits", icon: BagIcon },
  { href: "/gestion/paiements", label: "Paiements", feature: "paiements", icon: PaymentsIcon, gerantOnly: true },
  { href: "/gestion/tables", label: "Tables", feature: "tables", icon: TablesIcon, excludeRoles: ["cuisinier"] },
  // Le gérant pointe et planifie depuis Équipe, qui porte aussi le planning
  // et le journal.
  { href: "/gestion/badgeage", label: "Pointage", feature: "badgeage", icon: ClockIcon, excludeRoles: ["gerant"] },
  // La carte ne se retire pas : sans elle, aucun produit ne sert à rien.
  { href: "/gestion/menu", label: "Carte", feature: null, icon: MenuIcon },
  { href: "/gestion/equipe", label: "Équipe", feature: "roles", icon: TeamIcon, gerantOnly: true },
  { href: "/gestion/terminaux", label: "Imprimantes", feature: "terminaux", icon: PrinterIcon, gerantOnly: true },
  { href: "/gestion/fidelite", label: "Fidélité", feature: "fidelite", icon: GiftIcon, gerantOnly: true },
  // Les alertes suivent les commandes : sans service, rien à signaler.
  { href: "/gestion/notifications", label: "Alertes", feature: "commandes", icon: BellIcon },
  // Les réglages sont ceux d'un restaurant (horaires, tablette, encaissement).
  { href: "/gestion/etablissement", label: "Réglages", feature: null, icon: GearIcon, gerantOnly: true },
  // L'abonnement est fermé au serveur — ni offre à souscrire ni droits à
  // arbitrer — et Ominin peut le fermer à tout le monde (capacité produits).
  { href: "/gestion/produits", label: "Abonnement", feature: "produits", icon: ProductsIcon, excludeRoles: ["serveur"] },
];

/** Quatre places fixes dans la barre, le reste dans « Plus » (UX § 3.1). */
const PRIMARY_SLOTS = 4;

/** Ce que compte la pastille d'une entrée, au survol. */
const BADGE_HINTS: Record<string, string> = {
  "/gestion/commandes": "Additions à encaisser et commandes à emporter du jour à prendre en charge",
  "/gestion/retraits": "Commandes du site pour un jour à venir, à prendre en charge",
};

/** Boutique à emporter seule : tout se prend en charge depuis Retraits. */
const PICKUP_BADGE_HINTS: Record<string, string> = {
  "/gestion/retraits": "Commandes du site à prendre en charge, tous jours confondus",
};

/*
 * L'entrée (.g-rise) ne se joue qu'une fois l'espace vu : monté dans un
 * onglet caché, il se présente tel quel et entre au premier affichage.
 */
let entrancePlayed = false;
const subscribeVisibility = (onChange: () => void) => {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
};
const entranceSnapshot = () =>
  entrancePlayed || (entrancePlayed = document.visibilityState === "visible");

async function signOut() {
  await createClient().auth.signOut();
  // Navigation complète : purge le store et repasse par le proxy.
  window.location.assign("/connexion");
}

function isActive(pathname: string, href: string): boolean {
  return href === "/gestion" ? pathname === href : pathname.startsWith(href);
}

/**
 * Les quatre entrées de la barre, par rôle et par mode (UX § 3.1, décision
 * n° 2 d'Ambaka) : celles-ci d'abord si elles sont ouvertes, puis les
 * suivantes dans l'ordre des pages jusqu'à remplir les places.
 */
function primaryHrefs(state: GestionState, pickupShop: boolean, clubOnly: boolean): string[] {
  if (state.role === "gerant") {
    if (clubOnly) return ["/gestion/soirees", "/gestion/paiements", "/gestion/equipe", "/gestion/bulles"];
    if (pickupShop) return ["/gestion", "/gestion/retraits", "/gestion/menu", "/gestion/paiements"];
    if (state.etablissement.serviceMode === "fast_food") {
      return ["/gestion", "/gestion/commandes", "/gestion/menu", "/gestion/paiements"];
    }
    return ["/gestion", "/gestion/commandes", "/gestion/tables", "/gestion/menu"];
  }
  if (pickupShop) return ["/gestion/retraits", "/gestion/commandes", "/gestion/badgeage", "/gestion/menu"];
  if (state.role === "cuisinier") return ["/gestion", "/gestion/commandes", "/gestion/badgeage", "/gestion/menu"];
  return ["/gestion/commandes", "/gestion/tables", "/gestion/badgeage", "/gestion/menu"];
}

/** L'accueil du cuisinier est l'écran de la cuisine : épuisés et fermetures. */
function navLabel(item: NavItem, state: GestionState): string {
  if (item.href === "/gestion/bulles") return bullesTabName(state.etablissement.slug);
  return item.href === "/gestion" && state.role === "cuisinier" ? "Cuisine" : item.label;
}

/** Repère de visite d'une entrée : la carte et les réglages sont ciblés. */
function navVisite(item: NavItem): string | undefined {
  if (item.href === "/gestion/menu") return "nav-menu";
  if (item.href === "/gestion/etablissement") return "etablissement";
  return undefined;
}

function ShellSkeleton() {
  return (
    <div aria-busy className="grid gap-g-gap">
      <Shimmer className="h-10 w-44" />
      <div className="grid gap-g-gap sm:grid-cols-2">
        <Shimmer className="h-36" />
        <Shimmer className="h-36" />
      </div>
      <Shimmer className="h-44" />
    </div>
  );
}

function LoadError({ message }: { message: string }) {
  return (
    <Notice
      title="Chargement impossible"
      text={message}
      action={<GlassButton onClick={() => retryLoad()}>Réessayer</GlassButton>}
    />
  );
}

/**
 * Le scanner du retrait au bar, chargé au premier usage : seuls ceux qui
 * scannent téléchargent la caméra et la remise. Le chargement a sa propre
 * limite de Suspense (loading) : l'espace derrière ne disparaît pas.
 */
const Scanner = dynamic(() => import("./remise/scanner").then((m) => m.Scanner), {
  loading: () => null,
});

/*
 * Le code de retrait scanné à l'appareil photo du téléphone (/gestion/remise/…)
 * a sa propre page, sans l'espace : chaque scan ouvre un onglet neuf, et
 * l'espace y chargeait un mois de commandes avant de remettre la sienne.
 */
export function GestionShell({
  children,
  logos,
}: {
  children: React.ReactNode;
  logos: Record<string, GestionLogo>;
}) {
  return useSelectedLayoutSegment() === "remise" ? children : <GestionSpace logos={logos}>{children}</GestionSpace>;
}

function VenueLogo({ logo, name }: { logo?: GestionLogo; name: string }) {
  if (!logo) {
    return (
      <span aria-hidden className="g-venue-logo font-display">
        {name.charAt(0).toUpperCase()}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- actif local de marque, en SVG ou PNG selon l'établissement
    <img
      src={logo.src}
      alt=""
      className={`g-venue-logo ${logo.background ? "g-venue-logo-inset" : ""}`}
      style={{ background: logo.background }}
    />
  );
}

function Brand({ product, small = false }: { product: string; small?: boolean }) {
  return (
    <Link href="/gestion" className={`g-brand ${small ? "g-brand-sm" : ""}`} title="Aujourd’hui">
      <span className="ember-text font-display font-semibold">Ominin</span>
      <small className={small ? "max-sm:hidden" : ""}>{product}</small>
    </Link>
  );
}

function Count({ value, hint }: { value: number; hint?: string }) {
  return value > 0 ? (
    <span className="g-count" title={hint}>
      {value}
    </span>
  ) : null;
}

/** Feuille « Plus » : le reste des pages et les gestes transverses. */
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

function GestionSpace({
  children,
  logos,
}: {
  children: React.ReactNode;
  logos: Record<string, GestionLogo>;
}) {
  const state = useGestion();
  const loadError = useGestionLoadError();
  const pathname = usePathname();
  const entrance = useSyncExternalStore(subscribeVisibility, entranceSnapshot, () => false);
  // Carillon des nouvelles commandes, actif sur tout l'espace (l'onglet
  // ouvert en cuisine sonne quelle que soit la page affichée).
  useOrderChime();
  const chimeOn = useChimeEnabled();
  const chimeArmed = useChimeArmed();

  const products = activeProducts(state);
  // Le click & collect seul ouvre l'espace : la garde porte sur les produits
  // payés, plus sur le seul abonnement à l'offre. Un club ne s'abonne pas :
  // Ominin se paie sur ses tables vendues, l'espace s'ouvre avec ses soirées.
  const club = isClub(state);
  const clubOnly = isClubOnly(state);
  const { themeAttribute } = useGestionTheme();
  const subscribed = products.offre != null || products.collect || clubOnly;
  const pickupShop = isPickupShop(state);
  const items = NAV_ITEMS.filter(
    (item) =>
      (!item.feature || (state?.features[item.feature] ?? false)) &&
      (!item.gerantOnly || state?.role === "gerant") &&
      (!item.serveurFeature ||
        state?.role !== "serveur" ||
        (state.features[item.serveurFeature] ?? false)) &&
      (!item.excludeRoles || !state || !item.excludeRoles.includes(state.role)) &&
      // Un club n'a ni carte ni réglages de restaurant.
      ((item.href !== "/gestion/menu" && item.href !== "/gestion/etablissement") || !clubOnly) &&
      (item.href !== "/gestion/etablissement" || !state || can(state.role, "etablissement.edit")) &&
      // En boutique à emporter seule, l'aperçu de l'équipe renvoie à Retraits.
      (item.feature !== "apercu" || state?.role === "gerant" || !pickupShop)
  );
  const preferred = state ? primaryHrefs(state, pickupShop, clubOnly) : [];
  const primary = preferred
    .map((href) => items.find((item) => item.href === href))
    .filter((item): item is NavItem => item !== undefined);
  for (const item of items) {
    if (primary.length >= PRIMARY_SLOTS) break;
    if (!primary.includes(item)) primary.push(item);
  }
  const more = items.filter((item) => !primary.includes(item));
  // La page que voient les clients : pour une boutique à emporter seule, sa
  // page de commande en ligne — elle n'a pas de menu QR.
  const voirClient = club
    ? "Voir ma page club"
    : pickupShop
      ? "Voir ma boutique en ligne"
      : "Voir mon menu";
  const clientUrl = state
    ? club
      ? `${clubSiteUrl}/${state.etablissement.slug}`
      : pickupShop
        ? `${collectSiteUrl}/${state.etablissement.slug}`
        : `${menuSiteUrl}/m/${state.etablissement.slug}`
    : "";
  // Pastilles : ce qui attend un geste, là où il se fait — les commandes du
  // site pour un jour à venir se prennent en charge depuis Retraits. En
  // boutique à emporter seule, Retraits les compte toutes, aujourd'hui compris :
  // Commandes n'en porte pas, pour ne pas les compter deux fois.
  const badges: Record<string, number> = !state
    ? {}
    : pickupShop
      ? { "/gestion/retraits": state.orders.filter(awaitsAcknowledgement).length }
      : {
          "/gestion/commandes": cardCount(state.orders.filter(needsAttention)),
          "/gestion/retraits": state.orders.filter(
            (order) => awaitsAcknowledgement(order) && pickupLater(order)
          ).length,
        };
  const badgeHints = pickupShop ? PICKUP_BADGE_HINTS : BADGE_HINTS;
  // La pastille d'une page rangée dans « Plus » remonte sur « Plus ».
  const moreBadge = more.reduce((sum, item) => sum + (badges[item.href] ?? 0), 0);
  // Une barre du bas à un seul onglet (un club : Soirées) ne mène nulle part
  // de plus : elle laisse la place aux barres collées des écrans.
  const mobileNav = items.length > 1;
  // Même règle à gauche : un seul onglet, la page prend toute la largeur.
  const rail = !state || items.length > 1;
  // Retrait au bar : qui remet les commandes scanne leurs codes depuis
  // « Plus » (ou le rail), sans quitter l'application.
  const canScan =
    state?.etablissement.serviceMode === "fast_food" &&
    state.etablissement.barPickup &&
    can(state.role, "orders.setStatus:servie");
  // Le bouton qui a ouvert le scanner : le focus y revient à sa fermeture.
  const [scanFrom, setScanFrom] = useState<HTMLElement | null>(null);
  const closeScanner = useCallback(() => setScanFrom(null), []);
  const [moreOpen, setMoreOpen] = useState(false);
  const closeMore = useCallback(() => setMoreOpen(false), []);
  // Déconnexion : sur une tablette protégée par un code, elle ferme l'espace
  // à toute l'équipe — on demande confirmation (décision n° 8 d'Ambaka).
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const askSignOut = () => {
    setMoreOpen(false);
    if (state?.etablissement.adminPinSet) setConfirmSignOut(true);
    else void signOut();
  };
  // Bas de la barre haute collée, pour ce qui se colle dessous (onglets d'un
  // écran) : elle est posée à --g-frame-margin du haut de l'écran.
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = header.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      document.documentElement.style.setProperty(
        "--gestion-entete",
        `${entry.borderBoxSize[0].blockSize + parseFloat(getComputedStyle(element).top)}px`
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  // Visite de la page, ouverte à tous les rôles depuis le « ? » (décision
  // n° 3 d'Ambaka). Elle s'ouvre d'elle-même au premier passage d'un gérant
  // inscrit — sauf la visite d'accueil, que la carte « Avant votre premier
  // service » de l'Aperçu remplace (UX § 3.3) —, sauf au retour d'un
  // onboarding Stripe ou Square (la page y affiche son résultat), ou à la
  // demande, par le « ? ». L'ouverture d'elle-même se décide à l'arrivée sur
  // la page : la carte qui se remplit sous la visite « menu vide » n'ouvre
  // pas celle du menu par-dessus la feuille des catégories, qui attendra le
  // passage suivant — le « ? » relance, lui, la visite du moment.
  // Les visites présentent la carte et le service : un club n'en a pas.
  const visite = state && !clubOnly ? visiteFor(pathname, state) : undefined;
  // L'abonnement compte dans l'arrivée : revenu de Stripe Checkout avant le
  // webhook, le gérant arrive sur l'écran d'activation, et la visite s'ouvre
  // quand l'espace se déverrouille.
  const arrivalKey = `${pathname} ${state?.role ?? ""} ${subscribed}`;
  const [arrival, setArrival] = useState<{ key: string; id?: VisiteId } | null>(null);
  const [replay, setReplay] = useState<VisiteId | null>(null);
  if (state && arrival?.key !== arrivalKey) {
    setArrival({ key: arrivalKey, id: visite?.id });
    // Une visite relancée puis quittée par le bouton retour du navigateur ne
    // se rouvre pas au passage suivant.
    setReplay(null);
  }
  const arrivedWith = arrival?.key === arrivalKey ? arrival.id : undefined;
  const [providerReturn] = useState(() =>
    typeof window !== "undefined" && hasProviderReturn(window.location.search)
      ? window.location.pathname
      : null
  );
  // Fermée sans être vue, jusqu'à la prochaine ouverture de l'espace : son
  // geste a été fait depuis la carte, ou l'accueil a été remis d'une croix.
  const [later, setLater] = useState<VisiteId[]>([]);
  // Visite dont une étape au moins est à l'écran : le « ? » n'apparaît
  // qu'alors.
  const [shownVisite, setShownVisite] = useState<VisiteId | null>(null);
  const visiteAuto = Boolean(
    visite &&
      visite.id !== "bienvenue" &&
      state?.role === "gerant" &&
      visite.id === arrivedWith &&
      pathname !== providerReturn &&
      !later.includes(visite.id) &&
      state.visitesVues &&
      !state.visitesVues.includes(visite.id)
  );
  // La visite dont une étape est à l'écran : le « ? » la relance.
  const helpVisite = visite && shownVisite === visite.id ? visite : undefined;
  const product = state
    ? club
      ? "Club"
      : state.etablissement.offre
        ? OFFRE_LABELS[state.etablissement.offre]
        : collectBrand.replace(/^Ominin\s+/, "")
    : "";
  const activeHref = items.find((item) => isActive(pathname, item.href))?.href;
  const activeIndex = [...primary, ...more].findIndex((item) => item.href === activeHref);
  // La pilule active glisse d'une entrée du rail à l'autre : sa position se
  // calcule en jetons (hauteur d'entrée, gouttière, rangée « Plus »).
  const pillStyle =
    activeIndex >= 0
      ? ({
          "--g-nav-y": `calc(${activeIndex} * (var(--g-nav-h) + var(--g-nav-gap))${
            activeIndex >= primary.length ? " + var(--g-nav-group-h) + var(--g-nav-gap)" : ""
          })`,
        } as CSSProperties)
      : undefined;

  const railLink = (item: NavItem, index: number) => (
    <Link
      key={item.href}
      href={item.href}
      aria-current={activeHref === item.href ? "page" : undefined}
      data-visite={navVisite(item)}
      className="g-nav-item g-rise"
      style={{ "--g-i": index } as CSSProperties}
    >
      <item.icon />
      {state ? navLabel(item, state) : item.label}
      <Count value={badges[item.href] ?? 0} hint={badgeHints[item.href]} />
    </Link>
  );

  return (
    <ToastProvider placement={club ? "top" : "bottom"}>
      <Mesh />
      <div
        // Un club parle la langue de ses soirées sur tout l'espace : leurs
        // jetons, leurs polices et leur allure (.soirees), en-tête compris.
        className={`g-shell ${club ? `club-tokens club-espace soirees ${clubFonts}` : ""}`}
        data-entrance={entrance ? undefined : "off"}
        // Un club garde l'allure de ses soirées : pas de thème.
        data-g-theme={club ? undefined : themeAttribute}
        style={
          {
            "--gestion-barre-bas": mobileNav
              ? "calc(var(--g-tab-h) + 2 * var(--g-tabbar-pad-y) + var(--g-tabbar-bottom) + var(--g-gap))"
              : "1rem",
          } as CSSProperties
        }
      >
        {rail && (
          <aside className="g-rail g-glass">
            <Brand product={product} />
            <nav data-visite="nav" aria-label="Sections" className="g-nav">
              {activeIndex >= 0 && <span className="g-nav-pill" style={pillStyle} aria-hidden />}
              {primary.map(railLink)}
              {more.length > 0 && (
                <div className="g-nav-group">
                  <span className="g-eyebrow">Plus</span>
                </div>
              )}
              {more.map((item, index) => railLink(item, primary.length + 1 + index))}
              {canScan && (
                // Une action, pas une page : pleine, à l'inverse du fond.
                <GlassButton
                  variant="primary"
                  className="mt-3"
                  onClick={(event) => setScanFrom(event.currentTarget)}
                >
                  <ScanIcon />
                  Scanner un code
                </GlassButton>
              )}
            </nav>
            {state && (
              <div className="mt-auto grid gap-2 pt-3">
                <button type="button" onClick={askSignOut} className="g-nav-item">
                  <LogoutIcon />
                  Se déconnecter
                </button>
              </div>
            )}
          </aside>
        )}

        <div className="g-col">
          <header ref={header} data-visite-bord="haut" className="g-topbar g-glass">
            <div className="g-who">
              {state && <VenueLogo logo={logos[state.etablissement.slug]} name={state.etablissement.name} />}
              <b className="truncate font-display text-g-name">
                {state?.etablissement.name ?? "Espace de gestion"}
              </b>
              {state && (
                <span className="max-sm:hidden">
                  <Chip>{roleLabels(state)[state.role]}</Chip>
                </span>
              )}
            </div>
            {state && (
              <>
                {helpVisite && (
                  <GlassButton
                    variant="icon"
                    data-visite="aide"
                    onClick={() => setReplay(helpVisite.id)}
                    title="Visite guidée de cette page"
                    aria-label="Visite guidée de cette page"
                  >
                    <HelpIcon />
                  </GlassButton>
                )}
                <AdminLockButton />
                <ThemeToggle />
                <a
                  href={clientUrl}
                  data-visite="voir-menu"
                  target="_blank"
                  rel="noopener"
                  title={voirClient}
                  aria-label={voirClient}
                  className="g-btn g-btn-secondary g-btn-collapse g-press"
                >
                  <ExternalLinkIcon />
                  <span>{voirClient}</span>
                </a>
                <span className="lg:hidden max-sm:hidden">
                  <Brand product={product} small />
                </span>
              </>
            )}
          </header>

          {/* Tablette posée sans être touchée : le navigateur garde le son
              fermé jusqu'au premier geste — on le demande, en sonnant. */}
          {state?.features.commandes && chimeOn && !chimeArmed && (
            <button
              type="button"
              onClick={() => void playChime()}
              className="g-plate g-orders mx-[var(--g-topbar-mx-sm)] mt-3 px-5 py-2.5 text-center text-g-label font-medium lg:mx-[var(--g-topbar-mx)] print:hidden"
            >
              Touchez l&rsquo;écran pour activer le carillon des commandes
            </button>
          )}

          <main className="w-full min-w-0 flex-1 px-[var(--g-topbar-mx-sm)] pb-[var(--gestion-barre-bas)] pt-6 lg:px-[var(--g-topbar-mx)] lg:pb-16">
            {!state ? (
              loadError ? (
                <LoadError message={loadError} />
              ) : (
                <ShellSkeleton />
              )
            ) : subscribed ? (
              // Le contrat prime sur l'abonnement : un espace ouvert sur des
              // conditions non signées facturerait sans accord. La visite
              // attend que le verrou soit tranché ouvert : elle ne s'affiche
              // pas pour disparaître sous la demande d'accord.
              <ReacceptanceGate
                scope="etablissement"
                unlocked={
                  visite && (
                    <VisiteGuidee
                      key={visite.id}
                      visite={visite}
                      state={state}
                      open={visiteAuto || replay === visite.id}
                      auto={visiteAuto}
                      onShown={setShownVisite}
                      onClose={(fin) => {
                        setReplay(null);
                        if (fin === "plus-tard") setLater((ids) => [...ids, visite.id]);
                        else void api.markVisitesVues(fin === "toutes" ? VISITE_IDS : [visite.id]);
                      }}
                    />
                  )
                }
              >
                {children}
              </ReacceptanceGate>
            ) : (
              <SubscriptionGate
                etablissementId={state.etablissement.id}
                role={state.role}
                offre={state.etablissement.offre}
                tableCount={state.tables.length}
                feeDue={offreFeeDue(state)}
              />
            )}
          </main>
        </div>

        {mobileNav && state && (
          <nav
            data-visite="nav"
            data-visite-bord="bas"
            aria-label="Sections"
            className="g-tabbar g-glass"
            style={{ "--g-tabs": primary.length + 1 } as CSSProperties}
          >
            {primary.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={activeHref === item.href ? "page" : undefined}
                data-visite={navVisite(item)}
                className="g-tab"
              >
                <item.icon />
                <span>{navLabel(item, state)}</span>
                <Count value={badges[item.href] ?? 0} hint={badgeHints[item.href]} />
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
              <Count value={moreBadge} />
            </button>
          </nav>
        )}

        {moreOpen && state && (
          <PlusSheet onClose={closeMore}>
            <div className="flex items-center justify-between gap-3 pl-2">
              <h2 className="font-display text-g-h2">Plus</h2>
              <GlassButton variant="icon" aria-label="Fermer" onClick={closeMore}>
                <XIcon />
              </GlassButton>
            </div>
            {canScan && (
              <GlassButton
                variant="primary"
                onClick={(event) => {
                  setScanFrom(event.currentTarget);
                  setMoreOpen(false);
                }}
              >
                <ScanIcon />
                Scanner un code
              </GlassButton>
            )}
            {more.length > 0 && (
              <div className="g-sheet-grid">
                {more.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={activeHref === item.href ? "page" : undefined}
                    data-visite={navVisite(item)}
                    onClick={closeMore}
                    className="g-sheet-item"
                  >
                    <item.icon />
                    <span>{navLabel(item, state)}</span>
                    <Count value={badges[item.href] ?? 0} hint={badgeHints[item.href]} />
                  </Link>
                ))}
              </div>
            )}
            <div className="grid">
              <a
                href={clientUrl}
                target="_blank"
                rel="noopener"
                onClick={closeMore}
                className="g-sheet-row"
              >
                <ExternalLinkIcon />
                {voirClient}
              </a>
              {helpVisite && (
                <button
                  type="button"
                  className="g-sheet-row"
                  onClick={() => {
                    setMoreOpen(false);
                    setReplay(helpVisite.id);
                  }}
                >
                  <HelpIcon />
                  Visite guidée de cette page
                </button>
              )}
              <button type="button" className="g-sheet-row" onClick={askSignOut}>
                <LogoutIcon />
                Se déconnecter
              </button>
            </div>
          </PlusSheet>
        )}

        {confirmSignOut && (
          <Modal
            title="Se déconnecter ?"
            onClose={() => setConfirmSignOut(false)}
            footer={
              <>
                <GlassButton onClick={() => setConfirmSignOut(false)}>Annuler</GlassButton>
                <GlassButton variant="primary" onClick={() => void signOut()}>
                  Se déconnecter
                </GlassButton>
              </>
            }
          >
            <p className="text-g-body text-muted">
              Cette tablette est protégée par un code : la déconnexion ferme l&rsquo;espace pour
              toute l&rsquo;équipe, jusqu&rsquo;à une nouvelle connexion avec le compte du restaurant.
            </p>
          </Modal>
        )}

        {scanFrom && state && (
          <Scanner venueId={state.etablissement.id} returnTo={scanFrom} onClose={closeScanner} />
        )}
      </div>
    </ToastProvider>
  );
}
