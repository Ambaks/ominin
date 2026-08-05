"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { COLLECT_DEMO } from "@/lib/collect/demo/data";
import { useCollectDemo } from "@/lib/collect/demo/provider";
import { formatTime } from "@/lib/gestion/format";
import { formatPrice, type MenuItem } from "@/lib/menu-data";

/*
 * Volet téléphone de la démo Collect : mini-parcours de commande calqué sur
 * le vrai collect-experience (menu → récap → paiement → suivi), réduit à
 * l'essentiel pour se jouer en 30 secondes dans un écran de 384 px.
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
    <div className="flex items-center gap-3 rounded-2xl border border-hairline bg-surface p-3">
      {item.image && (
        <Image
          src={item.image}
          alt=""
          width={48}
          height={48}
          className="size-12 shrink-0 rounded-lg object-cover"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-medium">{item.name}</p>
        <p className="font-display text-xs text-ember-1">
          {formatPrice(item.price)}
        </p>
      </div>
      {quantity === 0 ? (
        <button
          type="button"
          onClick={() => demo.addItem(item.id)}
          className={`ember-gradient shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold text-background ${
            pulseAdd ? "soft-pulse" : ""
          }`}
        >
          + Ajouter
        </button>
      ) : (
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => demo.removeItem(item.id)}
            aria-label={`Retirer ${item.name}`}
            className="flex size-7 items-center justify-center rounded-full border border-hairline text-sm text-muted transition-colors hover:border-ember-2/40"
          >
            −
          </button>
          <span className="w-4 text-center text-sm font-semibold tabular-nums">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => demo.addItem(item.id)}
            aria-label={`Ajouter ${item.name}`}
            className="flex size-7 items-center justify-center rounded-full border border-hairline text-sm text-muted transition-colors hover:border-ember-2/40"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}

function MenuView() {
  const demo = useCollectDemo();
  const count = Object.values(demo.cart).reduce((sum, n) => sum + n, 0);
  const total = demo.menu.reduce(
    (sum, item) => sum + (demo.cart[item.id] ?? 0) * item.price,
    0
  );

  return (
    <>
      <header className="px-5 pb-3">
        <p className="font-display text-lg font-medium">
          {COLLECT_DEMO.restaurant.name}
        </p>
        <p className="text-xs text-muted">{COLLECT_DEMO.restaurant.tagline}</p>
      </header>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 pb-3">
        {demo.menu.map((item, index) => (
          <DishRow
            key={item.id}
            item={item}
            quantity={demo.cart[item.id] ?? 0}
            pulseAdd={demo.hintActive && count === 0 && index === 0}
          />
        ))}
      </div>
      <div className="px-4 pb-6 pt-1">
        {count > 0 ? (
          <button
            type="button"
            onClick={demo.openCheckout}
            className={`ember-gradient flex w-full items-center justify-between rounded-full px-5 py-3 text-sm font-semibold text-background ${
              demo.hintActive ? "soft-pulse" : ""
            }`}
          >
            <span>
              Commander · {count} article{count > 1 ? "s" : ""}
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

function CheckoutView() {
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
      <header className="flex items-center gap-3 px-5 pb-3">
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
        <ul className="flex flex-col gap-1.5 rounded-2xl border border-hairline bg-surface p-4">
          {lines.map((line) => (
            <li
              key={line.item.id}
              className="flex items-baseline justify-between gap-3 text-sm"
            >
              <span className="min-w-0 truncate">
                <span className="tabular-nums text-muted">
                  {line.quantity}×
                </span>{" "}
                {line.item.name}
              </span>
              <span className="shrink-0 tabular-nums text-muted">
                {formatPrice(line.quantity * line.item.price)}
              </span>
            </li>
          ))}
          <li className="mt-1.5 flex items-baseline justify-between border-t border-hairline pt-2.5">
            <span className="text-sm font-semibold">Total</span>
            <span className="font-display text-ember-1">
              {formatPrice(total)}
            </span>
          </li>
        </ul>
        <div className="flex flex-wrap gap-1.5">
          {[
            COLLECT_DEMO.customer.name,
            COLLECT_DEMO.customer.phone,
            "Dès que possible",
          ].map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-hairline px-3 py-1 text-xs text-muted"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2 px-5 pb-6 pt-1">
        <button
          type="button"
          onClick={demo.pay}
          className={`ember-gradient w-full rounded-full py-3 text-sm font-semibold text-background ${
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
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5">
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

function TrackingView() {
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
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-6">
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

  return (
    <div
      className={`flex h-140 w-full flex-col bg-background text-left ${
        framed ? "pt-14" : "pt-5"
      }`}
    >
      {demo.step === "menu" && <MenuView />}
      {demo.step === "checkout" && <CheckoutView />}
      {demo.step === "paiement" && <PayingView />}
      {tracking && demo.order && <TrackingView />}
    </div>
  );
}
