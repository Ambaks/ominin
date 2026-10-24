"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useSelectedLayoutSegment } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import "@/components/club/tokens.css";
import "@/components/gestion/soirees/soirees.css";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ToastProvider } from "@/components/ui/toast";
import { clubFonts } from "@/lib/club/fonts";
import { collectBrand } from "@/lib/collect-landing-data";
import * as api from "@/lib/gestion/api";
import { OFFRE_LABELS } from "@/lib/gestion/constants";
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
import type { Feature, Role } from "@/lib/gestion/types";
import {
  playChime,
  useChimeArmed,
  useChimeEnabled,
  useOrderChime,
} from "@/lib/gestion/use-order-chime";
import { VISITE_IDS, visiteFor, type VisiteId } from "@/lib/gestion/visites";
import { clubSiteUrl, collectSiteUrl, menuSiteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/client";
import {
  ApercuIcon,
  BagIcon,
  BellIcon,
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
  type IconProps,
} from "./icons";
import { AdminLockButton } from "./admin-lock-button";
import { hasProviderReturn } from "./payment-settings";
import { ReacceptanceGate } from "@/components/legal/reacceptance-gate";
import { SubscriptionGate } from "./subscription-gate";
import { VisiteGuidee } from "./visite-guidee";

interface NavItem {
  href: string;
  label: string;
  feature: Feature | null;
  icon: React.ComponentType<IconProps>;
  /** Onglet réservé au gérant : retiré de la navigation des employés. */
  gerantOnly?: boolean;
  excludeRoles?: Role[];
  /** Onglet ouvert au serveur seulement si cette capacité l'est aussi. */
  serveurFeature?: Feature;
  /** Barre latérale seulement : la barre mobile n'a pas la place d'un
   *  onglet de plus, la page se rejoint depuis Établissement. */
  sidebarOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  // Le serveur n'a d'aperçu que si Ominin le lui ouvre ; sinon sa page
  // d'accueil est le service lui-même (voir app/menu/gestion/page.tsx).
  { href: "/gestion", label: "Aperçu", feature: "apercu", icon: ApercuIcon, serveurFeature: "apercu_serveur" },
  { href: "/gestion/commandes", label: "Commandes", feature: "commandes", icon: CommandesIcon },
  { href: "/gestion/soirees", label: "Soirées", feature: "soirees", icon: SoireesIcon },
  { href: "/gestion/retraits", label: "Retraits", feature: "retraits", icon: BagIcon },
  { href: "/gestion/paiements", label: "Paiements", feature: "paiements", icon: PaymentsIcon, gerantOnly: true },
  { href: "/gestion/tables", label: "Tables", feature: "tables", icon: TablesIcon, excludeRoles: ["cuisinier"] },
  // Le gérant badge et planifie depuis l'onglet Équipe, qui porte aussi le
  // planning et le journal : sa barre reste celle du service.
  { href: "/gestion/badgeage", label: "Badgeage", feature: "badgeage", icon: ClockIcon, excludeRoles: ["gerant"] },
  // Le menu ne se retire pas : sans carte, aucun produit ne sert à rien.
  { href: "/gestion/menu", label: "Menu", feature: null, icon: MenuIcon },
  { href: "/gestion/equipe", label: "Équipe", feature: "roles", icon: TeamIcon, gerantOnly: true },
  { href: "/gestion/terminaux", label: "Terminaux", feature: "terminaux", icon: PrinterIcon, gerantOnly: true },
  { href: "/gestion/fidelite", label: "Fidélité", feature: "fidelite", icon: GiftIcon, gerantOnly: true, sidebarOnly: true },
];

/**
 * Onglet compte : barre latérale uniquement, et fermé au serveur — il n'a ni
 * offre à souscrire ni droits à arbitrer. La barre mobile est celle du
 * service — y ajouter un neuvième onglet la rendrait illisible ; sur mobile,
 * la pastille offre · rôle de l'en-tête mène à la même page. Ominin peut le
 * fermer à tout le monde (capacité produits) : sur la tablette partagée d'un
 * restaurant, le catalogue n'a rien à faire.
 */
const PRODUITS_ITEM: NavItem = {
  href: "/gestion/produits",
  label: "Produits",
  feature: "produits",
  icon: ProductsIcon,
};

/** Ce que compte la pastille d'un onglet, au survol. */
const BADGE_HINTS: Record<string, string> = {
  "/gestion/commandes": "Additions à encaisser et commandes à emporter du jour à prendre en charge",
  "/gestion/retraits": "Commandes du site pour un jour à venir, à prendre en charge",
};

/** Boutique à emporter seule : tout se prend en charge depuis Retraits. */
const PICKUP_BADGE_HINTS: Record<string, string> = {
  "/gestion/retraits": "Commandes du site à prendre en charge, tous jours confondus",
};

/** Commandes de l'en-tête : une cible de 44 px au doigt, 36 px à la souris. */
const HEADER_ICON_CLASS =
  "flex size-11 items-center justify-center rounded-full border border-hairline text-muted transition-colors hover:border-ember-2/40 hover:text-foreground lg:pointer-fine:size-9";

/** Surtitre offre · rôle de l'en-tête, lien ou simple texte. */
const SURTITRE_CLASS =
  "ember-text truncate text-[10px] font-semibold uppercase tracking-[0.28em]";

async function signOut() {
  await createClient().auth.signOut();
  // Navigation complète : purge le store et repasse par le proxy.
  window.location.assign("/connexion");
}

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
export function GestionShell({ children }: { children: React.ReactNode }) {
  return useSelectedLayoutSegment() === "remise" ? children : <GestionSpace>{children}</GestionSpace>;
}

function GestionSpace({ children }: { children: React.ReactNode }) {
  const state = useGestion();
  const loadError = useGestionLoadError();
  const pathname = usePathname();
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
      // Un club n'a pas de carte : le menu, qui ne se retire jamais d'un
      // restaurant, n'a rien à y faire.
      (item.href !== "/gestion/menu" || !clubOnly) &&
      // En boutique à emporter seule, l'aperçu de l'équipe renvoie à Retraits.
      (item.feature !== "apercu" || state?.role === "gerant" || !pickupShop)
  );
  // La page que voient les clients : pour une boutique à emporter seule, sa
  // page de commande en ligne — elle n'a pas de menu QR.
  const voirClient = club
    ? "Voir ma page club"
    : pickupShop
      ? "Voir ma boutique en ligne"
      : "Voir mon menu";
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
  // Une barre du bas à un seul onglet (un club : Soirées) ne mène nulle part
  // de plus : elle laisse la place aux barres collées des écrans.
  const mobileItems = items.filter((item) => !item.sidebarOnly);
  const mobileNav = mobileItems.length > 1;
  // Retrait au bar : qui remet les commandes scanne leurs codes depuis la
  // barre du bas (ou la colonne), sans quitter l'application.
  const canScan =
    state?.etablissement.serviceMode === "fast_food" &&
    state.etablissement.barPickup &&
    can(state.role, "orders.setStatus:servie");
  // Le bouton qui a ouvert le scanner : le focus y revient à sa fermeture.
  const [scanFrom, setScanFrom] = useState<HTMLElement | null>(null);
  const closeScanner = useCallback(() => setScanFrom(null), []);
  // Hauteur de l'en-tête collé, pour ce qui se colle dessous (onglets d'un
  // écran) : elle change avec la largeur, l'en-tête passant sur deux lignes.
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = header.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      document.documentElement.style.setProperty(
        "--gestion-entete",
        `${entry.borderBoxSize[0].blockSize}px`
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const showProduits =
    state != null && state.role !== "serveur" && state.features.produits;
  const sidebarItems = showProduits ? [...items, PRODUITS_ITEM] : items;
  // Même règle à gauche : un seul onglet, la page prend toute la largeur.
  const sidebar = !state || sidebarItems.length > 1;
  // Visite de la page, pour le gérant (la vue salle d'une tablette
  // verrouillée se présente en serveur : elle n'en voit aucune). Elle s'ouvre
  // d'elle-même au premier passage d'un gérant inscrit, sauf au retour d'un
  // onboarding Stripe ou Square (la page y affiche son résultat), ou à la
  // demande, par le bouton « ? ». L'ouverture d'elle-même se décide à
  // l'arrivée sur la page : la carte qui se remplit sous la visite « menu
  // vide » n'ouvre pas celle du menu par-dessus la feuille des catégories,
  // qui attendra le passage suivant — le « ? » relance, lui, la visite du
  // moment.
  // Les visites présentent la carte et le service : un club n'en a pas.
  const visite =
    state?.role === "gerant" && !clubOnly ? visiteFor(pathname, state) : undefined;
  // L'abonnement compte dans l'arrivée : revenu de Stripe Checkout avant le
  // webhook, le gérant arrive sur l'écran d'activation, et l'accueil s'ouvre
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
      visite.id === arrivedWith &&
      pathname !== providerReturn &&
      !later.includes(visite.id) &&
      state?.visitesVues &&
      !state.visitesVues.includes(visite.id)
  );
  const surtitre = state
    ? `${
        club
          ? "Ominin Club"
          : state.etablissement.offre
            ? `Ominin ${OFFRE_LABELS[state.etablissement.offre]}`
            : collectBrand
      } · ${roleLabels(state)[state.role]}`
    : "Espace de gestion";

  return (
    <ToastProvider placement={club ? "top" : "bottom"}>
      <div
        // Un club parle la langue de ses soirées sur tout l'espace : leurs
        // jetons, leurs polices et leur allure (.soirees), en-tête compris.
        className={`flex min-h-dvh w-full flex-col ${club ? `club-tokens club-espace soirees ${clubFonts}` : ""}`}
        style={{ "--gestion-barre-bas": mobileNav ? "5rem" : "1rem" } as React.CSSProperties}
      >
        <header
          ref={header}
          data-visite-bord="haut"
          className="sticky top-0 z-40 border-b border-hairline bg-background/85 backdrop-blur-md print:hidden"
        >
          <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3 lg:max-w-5xl lg:px-10">
            <div className="min-w-0">
              {/* Produit et rôle en surtitre : nomme l'espace où l'on est
                  (« Ominin Connect », face à Ominin Collect ou Ominin Clip),
                  tient dans la place du libellé qu'il remplace, et mène à la
                  page Produits — seul chemin vers elle sur mobile, où la
                  barre du bas est réservée au service. Le serveur, qui n'y a
                  pas accès, le lit sans lien. */}
              {showProduits ? (
                <Link
                  href={PRODUITS_ITEM.href}
                  title="Votre produit et votre rôle"
                  className={`inline-block transition-opacity hover:opacity-80 ${SURTITRE_CLASS}`}
                >
                  {surtitre}
                </Link>
              ) : (
                <p className={SURTITRE_CLASS}>{surtitre}</p>
              )}
              <p className="truncate font-display text-lg font-medium">
                {state?.etablissement.name ?? "Ominin"}
              </p>
            </div>
            {state && (
              // Le bouton Admin du code de tablette et le « ? » ensemble
              // tiennent sur un téléphone de 375 px en resserrant la rangée ;
              // plus étroit, elle passe à la ligne plutôt que de déborder.
              <div className="ml-auto flex max-w-full shrink-0 flex-wrap items-center justify-end gap-1 sm:gap-1.5">
                {visite && shownVisite === visite.id && (
                  <button
                    type="button"
                    data-visite="aide"
                    onClick={() => setReplay(visite.id)}
                    title="Visite guidée de cette page"
                    aria-label="Visite guidée de cette page"
                    className={HEADER_ICON_CLASS}
                  >
                    <HelpIcon className="size-4" />
                  </button>
                )}
                <AdminLockButton />
                <ThemeToggle />
                <a
                  href={
                    club
                      ? `${clubSiteUrl}/${state.etablissement.slug}`
                      : pickupShop
                        ? `${collectSiteUrl}/${state.etablissement.slug}`
                        : `${menuSiteUrl}/m/${state.etablissement.slug}`
                  }
                  data-visite="voir-menu"
                  target="_blank"
                  rel="noopener"
                  title={voirClient}
                  aria-label={voirClient}
                  className="flex min-h-11 items-center gap-1.5 rounded-full border border-hairline px-3 text-xs font-medium text-muted transition-colors hover:border-ember-2/40 hover:text-foreground lg:px-3.5 lg:pointer-fine:min-h-9"
                >
                  <ExternalLinkIcon className="size-4" />
                  <span className="hidden lg:inline">{voirClient}</span>
                </a>
                {(state?.features.commandes ?? false) && (
                  <Link
                    href="/gestion/notifications"
                    title="Notifications"
                    aria-label="Notifications"
                    className={HEADER_ICON_CLASS}
                  >
                    <BellIcon className="size-4" />
                  </Link>
                )}
                {/* Les réglages de l'établissement sont ceux d'un restaurant
                    (horaires, tablette de salle, encaissement) : rien pour un club. */}
                {can(state.role, "etablissement.edit") && !clubOnly && (
                  <Link
                    href="/gestion/etablissement"
                    data-visite="etablissement"
                    title="Établissement"
                    aria-label="Établissement"
                    className={HEADER_ICON_CLASS}
                  >
                    <GearIcon className="size-4" />
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => void signOut()}
                  title="Se déconnecter"
                  aria-label="Se déconnecter"
                  className={HEADER_ICON_CLASS}
                >
                  <LogoutIcon className="size-4" />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Tablette posée sans être touchée : le navigateur garde le son
            fermé jusqu'au premier geste — on le demande, en sonnant. */}
        {state?.features.commandes && chimeOn && !chimeArmed && (
          <button
            type="button"
            onClick={() => void playChime()}
            className="w-full bg-ember-2/15 px-5 py-2.5 text-center text-sm font-medium print:hidden"
          >
            Touchez l&rsquo;écran pour activer le carillon des commandes
          </button>
        )}

        <div className="mx-auto flex w-full max-w-2xl flex-1 items-start gap-10 px-5 lg:max-w-5xl lg:px-10">
          {sidebar && (
            <aside className="sticky top-20 hidden w-44 shrink-0 pt-10 lg:block print:hidden">
              <div data-visite="nav" className="flex flex-col gap-1 rounded-2xl">
                {sidebarItems.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-visite={item.href === "/gestion/menu" ? "nav-menu" : undefined}
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
                      {(badges[item.href] ?? 0) > 0 && (
                        <span
                          title={badgeHints[item.href]}
                          className="ml-auto flex size-5 items-center justify-center rounded-full bg-ember-3 text-[10px] font-bold text-background"
                        >
                          {badges[item.href]}
                        </span>
                      )}
                    </Link>
                  );
                })}
                {canScan && (
                  // Une action, pas une page : pleine, à l'inverse du fond.
                  <button
                    type="button"
                    onClick={(event) => setScanFrom(event.currentTarget)}
                    className="mt-3 flex items-center gap-2.5 rounded-xl bg-foreground px-3 py-2.5 text-sm font-semibold text-background"
                  >
                    <ScanIcon className="size-4.5" />
                    Scanner un code
                  </button>
                )}
              </div>
            </aside>
          )}

          <main className="w-full min-w-0 flex-1 pb-28 pt-6 lg:pb-16 lg:pt-10">
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

        {mobileNav && (
          <nav
            data-visite="nav"
            data-visite-bord="bas"
            className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-background/90 backdrop-blur-md lg:hidden print:hidden"
          >
            <div className="mx-auto flex max-w-2xl items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
              {mobileItems.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-visite={item.href === "/gestion/menu" ? "nav-menu" : undefined}
                    className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${
                      active ? "text-ember-1" : "text-faint"
                    }`}
                  >
                    <item.icon className="size-5" />
                    {/* Sept onglets sur 320 px : le libellé se resserre plutôt que de toucher son voisin. */}
                    <span className="max-w-full truncate px-0.5 max-[359px]:text-[9px] max-[359px]:tracking-tight">
                      {item.label}
                    </span>
                    {(badges[item.href] ?? 0) > 0 && (
                      <span
                        title={badgeHints[item.href]}
                        className="absolute right-1/2 top-1 -mr-6 flex size-4 items-center justify-center rounded-full bg-ember-3 text-[9px] font-bold text-background"
                      >
                        {badges[item.href]}
                      </span>
                    )}
                  </Link>
                );
              })}
              {canScan && (
                // Une action, pas un onglet : l'icône dans une pastille pleine,
                // le libellé neutre — jamais pris pour l'onglet ouvert.
                <button
                  type="button"
                  onClick={(event) => setScanFrom(event.currentTarget)}
                  className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold text-foreground"
                >
                  <span className="flex size-6 items-center justify-center rounded-full bg-foreground text-background">
                    <ScanIcon className="size-4" />
                  </span>
                  <span className="max-w-full truncate px-0.5 max-[359px]:text-[9px] max-[359px]:tracking-tight">
                    Scanner
                  </span>
                </button>
              )}
            </div>
          </nav>
        )}
        {scanFrom && state && (
          <Scanner venueId={state.etablissement.id} returnTo={scanFrom} onClose={closeScanner} />
        )}
      </div>
    </ToastProvider>
  );
}
