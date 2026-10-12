"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserFrame } from "@/components/landing/browser-frame";
import { IphoneFrame } from "@/components/landing/iphone-frame";
import { COLLECT_DEMO, demoSettings } from "@/lib/collect/demo/data";
import {
  CollectDemoProvider,
  nextActionSide,
  useCollectDemo,
} from "@/lib/collect/demo/provider";
import { demoSection } from "@/lib/collect-landing-data";
import { menuSiteUrl } from "@/lib/site";
import { CustomerPane } from "./customer-pane";
import { RestaurantPane } from "./restaurant-pane";

/** Barre d'adresse du faux navigateur : le vrai dashboard, sans protocole. */
const dashboardUrl = `${menuSiteUrl.replace(
  /^https?:\/\//,
  ""
)}/gestion/commandes`;

/*
 * Scène de la démo Collect. Deux variantes :
 * — « dual » (landing desktop) : téléphone et dashboard côte à côte, reliés
 *   par un connecteur où un point braise matérialise chaque échange ;
 * — « switch » (plein écran mobile) : un volet à la fois, bascule Côté
 *   client / Côté restaurant. Les deux volets restent montés pour que l'état
 *   et les minuteries survivent à la bascule.
 */

type Side = "client" | "restaurant";

/*
 * Vrai téléphone : la hauteur des deux écrans (--demo-pane-h, 35rem par
 * défaut) se règle sur celle de la fenêtre, pour que la puce guide et le
 * bouton de bascule restent visibles sur un laptop bas ou un téléphone ; le
 * retrait est la hauteur de ce qui les entoure, le plancher garde l'écran
 * lisible.
 */
const DUAL_PANE_HEIGHT = "[--demo-pane-h:clamp(28rem,calc(100dvh_-_14.5rem),35rem)]";
const SWITCH_PANE_HEIGHT = "[--demo-pane-h:clamp(26rem,calc(100dvh_-_22.75rem),35rem)]";

/** Point braise traversant le lien téléphone ↔ dashboard (décoratif). */
function RelayConnector() {
  const demo = useCollectDemo();
  return (
    <div className="relative hidden h-full items-center lg:flex" aria-hidden>
      <span className="ember-gradient h-px w-full opacity-40" />
      {demo.lastEvent && (
        <span
          key={demo.lastEvent.id}
          className="relay-dot ember-gradient absolute top-1/2 size-2 -translate-y-1/2 rounded-full"
          style={{
            left: demo.lastEvent.direction === "toRestaurant" ? 0 : "auto",
            right: demo.lastEvent.direction === "toRestaurant" ? "auto" : 0,
            ["--relay-distance" as string]:
              demo.lastEvent.direction === "toRestaurant" ? "4.5rem" : "-4.5rem",
          }}
        />
      )}
    </div>
  );
}

/** Puce guide : nomme la prochaine action ; propose la bascule en mobile.
 * Vrai téléphone, commande retirée : « Rejouer la démo » quitte le téléphone
 * pour la puce — dessous un volet à la fois, à côté en vue côte à côte
 * (dessous, il passerait sous le bas d'un laptop de 720 px). */
function DemoHint({
  side,
  onSwitch,
}: {
  side?: Side;
  onSwitch?: (side: Side) => void;
}) {
  const demo = useCollectDemo();
  // Payée mais pas encore à l'écran du restaurant : ni action, ni bascule.
  const arriving =
    (demo.step === "en_attente" || demo.step === "programmee") && !demo.orderVisible;
  const target = arriving ? null : nextActionSide(demo.step);
  const replay = demo.settings.realPhone && demo.step === "retiree";
  const needsSwitch = !replay && side && onSwitch && target && target !== side;
  // Vrai téléphone, un volet à la fois : la puce a la hauteur de deux lignes
  // et le bouton de bascule sa place dessous, rien ne saute quand ils changent.
  const fixed = side && demo.settings.realPhone;

  return (
    <div
      className={`flex items-center justify-center gap-2 ${
        fixed ? "min-h-26 flex-col justify-start" : "flex-wrap"
      }`}
    >
      <span
        aria-hidden
        className={`flex items-center gap-2 rounded-full border border-hairline bg-surface px-4 py-2 text-xs text-muted ${
          fixed ? "min-h-12.5" : ""
        }`}
      >
        <span className="size-1.5 animate-pulse rounded-full bg-ember-2" />
        {arriving
          ? COLLECT_DEMO.hints.arriving
          : demo.step === "menu" && demo.cart.length > 0
            ? COLLECT_DEMO.hints.menuReady
            : COLLECT_DEMO.hints[demo.step]}
      </span>
      {needsSwitch && (
        <button
          type="button"
          onClick={() => onSwitch(target)}
          className={`ember-gradient rounded-full px-4 py-2 text-xs font-semibold text-background ${
            demo.settings.realPhone ? "min-h-11" : ""
          }`}
        >
          Passer{" "}
          {target === "client" ? demoSection.customerLabel.toLowerCase() : demoSection.restaurantLabel.toLowerCase()}{" "}
          →
        </button>
      )}
      {replay && (
        <button
          type="button"
          data-demo-replay
          onClick={() => {
            demo.replay();
            // Un volet à la fois : la démo reprend côté client.
            if (side === "restaurant") onSwitch?.("client");
          }}
          className={`min-h-11 rounded-full border border-hairline bg-surface px-5 text-xs font-semibold text-foreground transition-colors hover:border-ember-2/40 ${
            demo.hintActive ? "soft-pulse" : ""
          }`}
        >
          Rejouer la démo
        </button>
      )}
    </div>
  );
}

/** Annonces d'état pour lecteurs d'écran — la seule voix de la démo. */
function LiveRegion() {
  const demo = useCollectDemo();
  return (
    <p aria-live="polite" className="sr-only">
      {COLLECT_DEMO.announcements[demo.step]}
    </p>
  );
}

/** Démo « vrai téléphone » : le thème de la carte sur le seul téléphone,
 * l'écran du restaurant reste celui d'Ominin, comme le vrai. Les autres
 * portent leur thème sur toute la page. */
function usePhoneTheme(): string {
  const demo = useCollectDemo();
  return demo.settings.realPhone
    ? `${demo.restaurant.themeClass ?? ""} text-foreground`
    : "";
}

function DualStage() {
  const phoneTheme = usePhoneTheme();
  return (
    <div className="grid items-center gap-6 lg:grid-cols-[24rem_5rem_minmax(0,1fr)] lg:gap-0">
      <section
        aria-label="Démo — le téléphone de votre client"
        data-demo-phone
        className={phoneTheme}
      >
        <IphoneFrame>
          <CustomerPane />
        </IphoneFrame>
      </section>
      <RelayConnector />
      <section aria-label="Démo — votre espace de gestion">
        <BrowserFrame url={dashboardUrl}>
          <RestaurantPane />
        </BrowserFrame>
      </section>
    </div>
  );
}

function SwitchStage() {
  const [side, setSide] = useState<Side>("client");
  const phoneTheme = usePhoneTheme();
  const { realPhone } = useCollectDemo().settings;
  // « Passer côté … » disparaît une fois la bascule faite : le focus va à la
  // prochaine action du volet ouvert, sinon à son titre.
  const panes = useRef<Record<Side, HTMLDivElement | null>>({ client: null, restaurant: null });
  const passed = useRef(false);
  const pass = (target: Side) => {
    passed.current = true;
    setSide(target);
  };
  useEffect(() => {
    if (!passed.current) return;
    passed.current = false;
    const pane = panes.current[side];
    (
      pane?.querySelector<HTMLElement>("[data-action]") ??
      pane?.querySelector<HTMLElement>('[tabindex="-1"], button')
    )?.focus({ preventScroll: true });
  }, [side]);

  return (
    <div
      data-demo-stage
      className={`flex flex-col gap-5 ${realPhone ? SWITCH_PANE_HEIGHT : ""}`}
    >
      <div
        role="group"
        aria-label="Choix du volet de la démo"
        className="mx-auto flex rounded-full border border-hairline bg-surface p-1"
      >
        {(
          [
            ["client", demoSection.customerLabel],
            ["restaurant", demoSection.restaurantLabel],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={side === value}
            onClick={() => setSide(value)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
              realPhone ? "min-h-11" : ""
            } ${
              side === value
                ? "ember-gradient text-background"
                : "text-muted hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        ref={(node) => {
          panes.current.client = node;
        }}
        className={side === "client" ? "" : "hidden"}
      >
        <section
          aria-label="Démo — le téléphone de votre client"
          data-demo-phone
          className={`${phoneTheme} mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-hairline bg-background shadow-2xl shadow-black/30`}
        >
          <CustomerPane framed={false} />
        </section>
      </div>
      <div
        ref={(node) => {
          panes.current.restaurant = node;
        }}
        className={side === "restaurant" ? "" : "hidden"}
      >
        <section
          aria-label="Démo — votre espace de gestion"
          // Vrai téléphone : l'écran du restaurant cède la barre du navigateur
          // (h-10), les deux volets ont la même taille.
          className={
            realPhone
              ? "mx-auto w-full max-w-md [--demo-restaurant-h:calc(var(--demo-pane-h)_-_2.5rem)]"
              : ""
          }
        >
          <BrowserFrame url={dashboardUrl}>
            <RestaurantPane />
          </BrowserFrame>
        </section>
      </div>

      <DemoHint side={side} onSwitch={pass} />
      <LiveRegion />
    </div>
  );
}

export function CollectDemoStage({
  variant,
  slug,
}: {
  /** « responsive » : un volet à la fois sous lg, côte à côte au-delà — un
   * seul état pour les deux, la démo survit au passage de lg (fenêtre
   * redimensionnée, tablette tournée). */
  variant: "dual" | "switch" | "responsive";
  /** Slug du restaurant joué (défaut : la Trattoria de la landing). */
  slug?: string;
}) {
  const dual = (
    // Vrai téléphone : sur un écran bas (laptop 768), la puce guide reste visible.
    <div
      data-demo-stage
      className={`flex flex-col gap-6 ${
        demoSettings(slug).realPhone ? `${DUAL_PANE_HEIGHT} [@media(max-height:50rem)]:gap-3` : ""
      }`}
    >
      <DualStage />
      <DemoHint />
      <LiveRegion />
    </div>
  );
  return (
    <CollectDemoProvider slug={slug}>
      {variant === "dual" ? (
        dual
      ) : variant === "switch" ? (
        <SwitchStage />
      ) : (
        <>
          <div className="lg:hidden">
            <SwitchStage />
          </div>
          <div className="hidden lg:block">{dual}</div>
        </>
      )}
    </CollectDemoProvider>
  );
}
