"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { COLLECT_DEMO } from "@/lib/collect/demo/data";
import { formatSlotTime, useCollectDemo } from "@/lib/collect/demo/provider";
import { formatTime } from "@/lib/gestion/format";
import { formatPrice, type MenuItem } from "@/lib/menu-data";

/*
 * Volet téléphone de la démo Collect : le parcours de commande dans une
 * version resserrée mais premium — couverture photo, rail de catégories
 * collant, cartes de plats, paiement simulé, suivi animé. Calqué sur la
 * grammaire du vrai collect-experience, jouable en 30 secondes.
 */

/** Horloge du compte à rebours — un tic par seconde tant que monté. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(
      () => setNow(Date.now()),
      COLLECT_DEMO.timings.countdownTickMs
    );
    return () => clearInterval(id);
  }, []);
  return now;
}

function DishRow({
  item,
  quantity,
  pulseAdd,
}: {
  item: MenuItem;
  quantity: number;
  pulseAdd: boolean;
}) {
  const demo = useCollectDemo();
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-hairline bg-surface p-3 transition-colors hover:border-ember-2/40">
      {item.image && (
        <Image
          src={item.image}
          alt=""
          width={64}
          height={64}
          className="size-16 shrink-0 rounded-xl object-cover"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-medium">{item.name}</p>
        {item.description && (
          <p className="mt-0.5 line-clamp-1 text-[11px] leading-relaxed text-faint">
            {item.description}
          </p>
        )}
        <p className="mt-0.5 font-display text-xs text-ember-1">
          {formatPrice(item.price)}
        </p>
      </div>
      {quantity === 0 ? (
        <button
          type="button"
          onClick={() => demo.addItem(item.id)}
          aria-label={`Ajouter ${item.name}`}
          className={`ember-gradient flex size-8 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-background transition-transform active:scale-90 ${
            pulseAdd ? "soft-pulse" : ""
          }`}
        >
          +
        </button>
      ) : (
        <div className="flex shrink-0 items-center gap-1 rounded-full border border-hairline bg-background/60 p-0.5">
          <button
            type="button"
            onClick={() => demo.removeItem(item.id)}
            aria-label={`Retirer ${item.name}`}
            className="flex size-6.5 items-center justify-center rounded-full text-sm text-muted transition-colors hover:text-foreground"
          >
            −
          </button>
          <span
            key={quantity}
            className="pop w-4 text-center text-sm font-semibold tabular-nums"
          >
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => demo.addItem(item.id)}
            aria-label={`Ajouter ${item.name}`}
            className="ember-gradient flex size-6.5 items-center justify-center rounded-full text-sm font-semibold text-background transition-transform active:scale-90"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}

function MenuView({ framed }: { framed: boolean }) {
  const demo = useCollectDemo();
  const [activeCategory, setActiveCategory] = useState(demo.sections[0]?.id);
  // La barre collante ne dégage la Dynamic Island qu'une fois réellement
  // collée : une sentinelle en tête de défilement pilote l'état.
  const [scrolled, setScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const stickyBarRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { root: scrollRef.current, threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);
  const count = Object.values(demo.cart).reduce((sum, n) => sum + n, 0);
  const total = demo.menu.reduce(
    (sum, item) => sum + (demo.cart[item.id] ?? 0) * item.price,
    0
  );

  // Défilement borné au volet : scrollIntoView remonterait aussi la page
  // hôte (tous les ancêtres défilables), inacceptable au milieu de la landing.
  // L'offset est mesuré sur la barre : si sa transition pt-3 → pt-12 se joue
  // pendant le défilement, contenu et barre glissent du même delta — le
  // calcul pré-transition reste juste.
  const scrollToCategory = (id: string) => {
    setActiveCategory(id);
    const container = scrollRef.current;
    const section = sectionRefs.current.get(id);
    if (!container || !section) return;
    container.scrollTo({
      top:
        section.getBoundingClientRect().top -
        container.getBoundingClientRect().top +
        container.scrollTop -
        (stickyBarRef.current?.offsetHeight ?? 0),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };

  return (
    <>
      <div ref={scrollRef} className="flex flex-1 flex-col overflow-y-auto">
        {/* Couverture pleine largeur, fondue vers le fond — file sous l'île */}
        <div className="relative h-28 shrink-0">
          {COLLECT_DEMO.restaurant.coverImage && (
            <Image
              src={COLLECT_DEMO.restaurant.coverImage}
              alt=""
              fill
              sizes="384px"
              className="object-cover"
            />
          )}
          <div
            className="absolute inset-0 bg-linear-to-t from-background via-background/25 to-background/30"
            aria-hidden
          />
        </div>

        {/* La sentinelle précède la barre : elle sort du cadre pile quand la
            barre atteint le haut et se colle. */}
        <div ref={sentinelRef} aria-hidden />
        {/* Barre collante : nom + rail de catégories sous la Dynamic Island */}
        <div
          ref={stickyBarRef}
          className={`sticky top-0 z-10 flex flex-col gap-2 bg-background/90 px-4 pb-2.5 backdrop-blur-md transition-[padding] duration-300 motion-reduce:transition-none ${
            framed && scrolled ? "pt-12" : "pt-3"
          }`}
        >
          <div className="px-1">
            <p className="font-display text-lg font-medium leading-tight">
              {COLLECT_DEMO.restaurant.name}
            </p>
            <p className="text-[11px] text-muted">
              {COLLECT_DEMO.restaurant.tagline}
            </p>
          </div>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {demo.sections.map((section) => (
              <button
                key={section.id}
                type="button"
                aria-current={activeCategory === section.id ? "true" : undefined}
                onClick={() => scrollToCategory(section.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                  activeCategory === section.id
                    ? "ember-gradient text-background"
                    : "border border-hairline text-muted hover:text-foreground"
                }`}
              >
                {section.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 px-4 pb-4 pt-1">
          {demo.sections.map((section, sectionIndex) => (
            <section
              key={section.id}
              ref={(node) => {
                if (node) sectionRefs.current.set(section.id, node);
                else sectionRefs.current.delete(section.id);
              }}
              aria-label={section.name}
            >
              <div className="mb-2 flex items-center gap-2.5">
                <h4 className="font-display text-base font-medium">
                  {section.name}
                </h4>
                <span
                  aria-hidden
                  className="ember-gradient h-px flex-1 opacity-30"
                />
              </div>
              <div className="flex flex-col gap-2">
                {section.items.map((item, itemIndex) => (
                  <DishRow
                    key={item.id}
                    item={item}
                    quantity={demo.cart[item.id] ?? 0}
                    pulseAdd={
                      demo.hintActive &&
                      count === 0 &&
                      sectionIndex === 0 &&
                      itemIndex === 0
                    }
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <div className="px-4 pb-6 pt-2">
        {count > 0 ? (
          <button
            type="button"
            onClick={demo.openCheckout}
            className={`ember-gradient flex w-full items-center justify-between rounded-full px-4 py-3 text-sm font-semibold text-background shadow-[0_8px_24px_rgba(226,118,75,0.25)] transition-transform active:scale-[0.98] ${
              demo.hintActive ? "soft-pulse" : ""
            }`}
          >
            <span className="flex items-center gap-2.5">
              <span
                key={count}
                className="pop flex size-6 items-center justify-center rounded-full bg-background/25 text-xs font-bold tabular-nums"
              >
                {count}
              </span>
              Commander
            </span>
            <span className="tabular-nums">{formatPrice(total)}</span>
          </button>
        ) : (
          <p className="text-center text-[11px] text-faint">
            Ajoutez un plat pour commander
          </p>
        )}
      </div>
    </>
  );
}

function CheckoutView({ topPad }: { topPad: string }) {
  const demo = useCollectDemo();
  const lines = demo.menu
    .filter((item) => (demo.cart[item.id] ?? 0) > 0)
    .map((item) => ({ item, quantity: demo.cart[item.id] }));
  const total = lines.reduce(
    (sum, line) => sum + line.quantity * line.item.price,
    0
  );

  return (
    <>
      <header className={`flex items-center gap-3 px-5 pb-3 ${topPad}`}>
        <button
          type="button"
          onClick={demo.backToMenu}
          aria-label="Retour au menu"
          className="flex size-7 items-center justify-center rounded-full border border-hairline text-sm text-muted transition-colors hover:border-ember-2/40"
        >
          ←
        </button>
        <p className="font-display text-lg font-medium">Votre commande</p>
      </header>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5">
        <ul className="flex flex-col gap-2.5 rounded-2xl border border-hairline bg-surface p-4">
          {lines.map((line) => (
            <li key={line.item.id} className="flex items-center gap-3">
              {line.item.image && (
                <Image
                  src={line.item.image}
                  alt=""
                  width={40}
                  height={40}
                  className="size-10 shrink-0 rounded-lg object-cover"
                />
              )}
              <span className="min-w-0 flex-1 truncate text-sm">
                <span className="tabular-nums text-muted">
                  {line.quantity}×
                </span>{" "}
                {line.item.name}
              </span>
              <span className="shrink-0 text-sm tabular-nums text-muted">
                {formatPrice(line.quantity * line.item.price)}
              </span>
            </li>
          ))}
          <li className="mt-0.5 flex items-baseline justify-between border-t border-hairline pt-2.5">
            <span className="text-sm font-semibold">Total</span>
            <span className="font-display text-ember-1">
              {formatPrice(total)}
            </span>
          </li>
        </ul>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-muted">
              Votre nom
            </label>
            <input
              value={demo.customerName}
              onChange={(e) => demo.setCustomerName(e.target.value)}
              placeholder="Votre nom"
              className="rounded-xl border border-hairline bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ember-2/50"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="rounded-full border border-hairline bg-surface px-3 py-1 text-xs text-muted">
              {COLLECT_DEMO.customer.phone}
            </span>
          </div>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-[11px] font-semibold text-muted">
              Retrait
            </legend>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => demo.setPickupSlot(null)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  demo.pickupSlot === null
                    ? "ember-gradient text-background"
                    : "border border-hairline text-muted hover:border-ember-2/40"
                }`}
              >
                Dès que possible
              </button>
              {Array.from(
                { length: COLLECT_DEMO.slots.count },
                (_, i) => {
                  const taken = COLLECT_DEMO.slots.takenBySlot[i] ?? 0;
                  const remaining = COLLECT_DEMO.slots.capacity - taken;
                  const full = remaining <= 0;
                  const selected = demo.pickupSlot === i;
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={full}
                      onClick={() => demo.setPickupSlot(i)}
                      className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        full
                          ? "border border-hairline text-faint opacity-50"
                          : selected
                            ? "ember-gradient text-background"
                            : "border border-hairline text-muted hover:border-ember-2/40"
                      }`}
                    >
                      {formatSlotTime(i)}
                      {!full && (
                        <span className={`text-[10px] ${selected ? "text-background/70" : "text-faint"}`}>
                          ({remaining})
                        </span>
                      )}
                      {full && (
                        <span className="text-[10px]">complet</span>
                      )}
                    </button>
                  );
                }
              )}
            </div>
          </fieldset>
        </div>
      </div>
      <div className="flex flex-col gap-2 px-5 pb-6 pt-1">
        <button
          type="button"
          onClick={demo.pay}
          className={`ember-gradient w-full rounded-full py-3 text-sm font-semibold text-background shadow-[0_8px_24px_rgba(226,118,75,0.25)] transition-transform active:scale-[0.98] ${
            demo.hintActive ? "soft-pulse" : ""
          }`}
        >
          Payer {formatPrice(total)}
        </button>
        <p className="text-center text-[11px] leading-relaxed text-faint">
          {COLLECT_DEMO.paymentNotice}
        </p>
      </div>
    </>
  );
}

function PayingView() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-5">
      {/* Carte bancaire stylisée */}
      <div
        className="flex w-56 flex-col gap-3 rounded-2xl border border-hairline bg-surface-raised p-4 shadow-lg shadow-black/20"
        aria-hidden
      >
        <div className="flex items-center justify-between">
          <span className="ember-gradient h-6 w-8 rounded-md opacity-80" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-faint">
            Carte
          </span>
        </div>
        <div className="shimmer h-2.5 w-36 rounded-full" />
        <div className="flex justify-between">
          <span className="shimmer h-2 w-16 rounded-full" />
          <span className="shimmer h-2 w-8 rounded-full" />
        </div>
      </div>
      <div className="h-1.5 w-40 overflow-hidden rounded-full bg-surface">
        <div className="loader-bar ember-gradient h-full w-1/3 rounded-full" />
      </div>
      <p className="text-sm text-muted">Paiement en cours…</p>
    </div>
  );
}

const TIMELINE = [
  { step: "en_attente", label: "Reçue" },
  { step: "en_preparation", label: "En préparation" },
  { step: "prete", label: "Prête" },
  { step: "retiree", label: "Retirée" },
] as const;

function ItineraryButton() {
  return (
    <a
      href={COLLECT_DEMO.itineraryUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-4 py-2 text-xs font-semibold text-ember-1 transition-colors hover:border-ember-2/40"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M3 11 21 3l-8 18-2.5-7.5L3 11z" />
      </svg>
      Itinéraire
    </a>
  );
}

/** Cloche fumante : la commande est en cuisine. */
function SteamingDish() {
  return (
    <span
      className="relative mb-1 flex h-12 w-16 items-end justify-center"
      aria-hidden
    >
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="steam absolute bottom-7 h-4 w-0.5 rounded-full bg-muted"
          style={{ left: `${37 + index * 15}%`, animationDelay: `${index * 0.5}s` }}
        />
      ))}
      <svg
        viewBox="0 0 48 26"
        className="h-6.5 w-13 text-ember-2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 22h40" />
        <path d="M8 22a16 16 0 0 1 32 0" />
        <path d="M24 6V4" />
      </svg>
    </span>
  );
}

function TrackingView({ topPad }: { topPad: string }) {
  const demo = useCollectDemo();
  const now = useNow();
  const order = demo.order!;
  const cancelled = demo.step === "annulee";
  const copy =
    COLLECT_DEMO.customerStatus[
      demo.step as keyof typeof COLLECT_DEMO.customerStatus
    ] ?? COLLECT_DEMO.customerStatus.en_attente;
  const currentIndex = TIMELINE.findIndex((entry) => entry.step === demo.step);

  const remainingMs = order.readyAt
    ? Math.max(0, Date.parse(order.readyAt) - now)
    : 0;
  const countdown = `${Math.floor(remainingMs / 60_000)}:${String(
    Math.floor((remainingMs % 60_000) / 1000)
  ).padStart(2, "0")}`;
  const progress = order.etaMinutes
    ? Math.min(1, 1 - remainingMs / (order.etaMinutes * 60_000))
    : 0;

  return (
    <div className={`flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-6 ${topPad}`}>
      {!cancelled && (
        <ol className="flex items-start justify-between" aria-label="Avancement">
          {TIMELINE.map((entry, index) => {
            const done = currentIndex > index;
            const active = currentIndex === index;
            return (
              <li
                key={entry.step}
                aria-current={active ? "step" : undefined}
                className="relative flex flex-1 flex-col items-center gap-1.5"
              >
                {index > 0 && (
                  <span
                    aria-hidden
                    className={`absolute right-1/2 top-1.25 h-px w-full ${
                      done || active ? "ember-gradient opacity-60" : "bg-hairline"
                    }`}
                  />
                )}
                <span
                  className={`relative z-10 size-2.5 rounded-full ${
                    done || active ? "ember-gradient" : "bg-faint/40"
                  } ${active ? "animate-pulse" : ""}`}
                />
                <span
                  className={`text-center text-[9px] leading-tight ${
                    active ? "font-semibold text-foreground" : "text-faint"
                  }`}
                >
                  {entry.label}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <div
        className={`flex flex-col items-center gap-1 rounded-2xl border bg-surface p-5 text-center ${
          cancelled ? "border-ember-3/40" : "border-hairline"
        }`}
      >
        {demo.step === "en_preparation" && <SteamingDish />}
        {demo.step === "prete" && (
          <span className="relative mb-2 flex size-12 items-center justify-center">
            <span
              aria-hidden
              className="pulse-ring absolute inset-0 rounded-full border-2 border-ember-1"
            />
            <span
              aria-hidden
              className="pulse-ring absolute inset-0 rounded-full border-2 border-ember-2"
              style={{ animationDelay: "0.45s" }}
            />
            <span className="ember-gradient flex size-10 items-center justify-center rounded-full text-background">
              <svg
                viewBox="0 0 24 24"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
            </span>
          </span>
        )}
        <p className="ember-text text-[10px] font-semibold uppercase tracking-[0.28em]">
          {order.customerName} · {formatTime(order.createdAt)}
        </p>
        <h3 className="font-display text-xl font-medium">{copy.title}</h3>
        <p className="text-xs leading-relaxed text-muted">{copy.hint}</p>

        {demo.step === "en_preparation" && order.readyAt && (
          <div className="mt-2 flex w-full flex-col items-center gap-1.5">
            <p className="font-display text-lg font-semibold">
              Prête vers {formatTime(order.readyAt)}
            </p>
            <p className="text-xs tabular-nums text-muted">
              {remainingMs > 0 ? `dans ${countdown}` : "Plus que quelques instants"}
            </p>
            <div className="h-1 w-full overflow-hidden rounded-full bg-background/70">
              <div
                className="ember-gradient h-full origin-left rounded-full transition-transform ease-linear motion-reduce:transition-none"
                style={{
                  transform: `scaleX(${progress})`,
                  transitionDuration: `${COLLECT_DEMO.timings.countdownTickMs}ms`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {(demo.step === "en_preparation" || demo.step === "prete") && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-hairline bg-surface p-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {COLLECT_DEMO.restaurant.name}
            </p>
            <p className="truncate text-xs text-muted">
              {COLLECT_DEMO.restaurant.address}
            </p>
          </div>
          <ItineraryButton />
        </div>
      )}

      {(demo.step === "retiree" || cancelled) && (
        <button
          type="button"
          onClick={demo.replay}
          className={`mx-auto rounded-full border border-hairline px-5 py-2.5 text-xs font-semibold text-foreground transition-colors hover:border-ember-2/40 ${
            demo.hintActive ? "soft-pulse" : ""
          }`}
        >
          Rejouer la démo
        </button>
      )}
    </div>
  );
}

export function CustomerPane({ framed = true }: { framed?: boolean }) {
  const demo = useCollectDemo();
  const tracking =
    demo.step !== "menu" && demo.step !== "checkout" && demo.step !== "paiement";
  // Le menu laisse sa couverture filer sous la Dynamic Island ; les autres
  // vues dégagent le haut de l'écran.
  const topPad = framed ? "pt-14" : "pt-5";

  return (
    <div className="flex h-140 w-full flex-col bg-background text-left">
      {demo.step === "menu" && <MenuView framed={framed} />}
      {demo.step === "checkout" && <CheckoutView topPad={topPad} />}
      {demo.step === "paiement" && <PayingView />}
      {tracking && demo.order && <TrackingView topPad={topPad} />}
    </div>
  );
}
