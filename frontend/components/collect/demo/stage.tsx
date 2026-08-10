"use client";

import { useState } from "react";
import { BrowserFrame } from "@/components/landing/browser-frame";
import { IphoneFrame } from "@/components/landing/iphone-frame";
import { COLLECT_DEMO } from "@/lib/collect/demo/data";
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

/** Puce guide : nomme la prochaine action ; propose la bascule en mobile. */
function DemoHint({
  side,
  onSwitch,
}: {
  side?: Side;
  onSwitch?: (side: Side) => void;
}) {
  const demo = useCollectDemo();
  const target = nextActionSide(demo.step);
  const needsSwitch = side && onSwitch && target && target !== side;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span
        aria-hidden
        className="flex items-center gap-2 rounded-full border border-hairline bg-surface px-4 py-2 text-xs text-muted"
      >
        <span className="size-1.5 animate-pulse rounded-full bg-ember-2" />
        {COLLECT_DEMO.hints[demo.step]}
      </span>
      {needsSwitch && (
        <button
          type="button"
          onClick={() => onSwitch(target)}
          className="ember-gradient rounded-full px-4 py-2 text-xs font-semibold text-background"
        >
          Passer{" "}
          {target === "client" ? demoSection.customerLabel.toLowerCase() : demoSection.restaurantLabel.toLowerCase()}{" "}
          →
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

function DualStage() {
  return (
    <div className="grid items-center gap-6 lg:grid-cols-[24rem_5rem_minmax(0,1fr)] lg:gap-0">
      <section aria-label="Démo — le téléphone de votre client">
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

  return (
    <div className="flex flex-col gap-5">
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
              side === value
                ? "ember-gradient text-background"
                : "text-muted hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={side === "client" ? "" : "hidden"}>
        <section
          aria-label="Démo — le téléphone de votre client"
          className="mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-hairline bg-background shadow-2xl shadow-black/30"
        >
          <CustomerPane framed={false} />
        </section>
      </div>
      <div className={side === "restaurant" ? "" : "hidden"}>
        <section aria-label="Démo — votre espace de gestion">
          <BrowserFrame url={dashboardUrl}>
            <RestaurantPane />
          </BrowserFrame>
        </section>
      </div>

      <DemoHint side={side} onSwitch={setSide} />
      <LiveRegion />
    </div>
  );
}

export function CollectDemoStage({ variant }: { variant: "dual" | "switch" }) {
  return (
    <CollectDemoProvider>
      {variant === "dual" ? (
        <div className="flex flex-col gap-6">
          <DualStage />
          <DemoHint />
          <LiveRegion />
        </div>
      ) : (
        <SwitchStage />
      )}
    </CollectDemoProvider>
  );
}
