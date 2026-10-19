"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { OrderTracking, STEPS } from "@/components/collect/order-confirmation";
import { COLLECT_DEMO } from "@/lib/collect/demo/data";
import {
  collectHref,
  previewOrderKey,
  type PreviewCollectOrder,
} from "@/lib/collect/shared";
import { useHostAwareHref } from "@/lib/collect/use-host-href";

/*
 * Suivi d'aperçu (/collect/demo/<slug>/suivi) : la commande passée sur
 * l'aperçu de la carte, relue dans l'onglet, et ses étapes jouées à la main
 * — en vrai, c'est le restaurant qui la fait avancer depuis son espace.
 */

const noSubscription = () => () => {};

function readOrder(slug: string): string | null {
  try {
    return sessionStorage.getItem(previewOrderKey(slug));
  } catch {
    return null;
  }
}

// Une entrée d'une autre version de l'aperçu ne doit pas casser la page.
function parseOrder(raw: string | null): PreviewCollectOrder | null {
  if (!raw) return null;
  try {
    const order = JSON.parse(raw) as PreviewCollectOrder;
    const lines = Array.isArray(order.lines) && order.lines.every(
      (line) =>
        typeof line.name === "string" &&
        Number.isFinite(line.quantity) &&
        Number.isFinite(line.amount) &&
        Array.isArray(line.details) &&
        line.details.every((detail) => typeof detail === "string")
    );
    return lines &&
      Number.isFinite(order.total) &&
      typeof order.customerName === "string" &&
      typeof order.createdAt === "string" &&
      !Number.isNaN(Date.parse(order.createdAt))
      ? order
      : null;
  } catch {
    return null;
  }
}

export function PreviewTracking({
  slug,
  restaurantName,
  address,
  phone,
}: {
  slug: string;
  restaurantName: string;
  address: string;
  phone: string;
}) {
  // undefined au rendu serveur et à l'hydratation : rien ne s'affiche avant
  // la lecture de l'onglet, au lieu d'un « aucune commande » fugace.
  const raw = useSyncExternalStore(noSubscription, () => readOrder(slug), () => undefined);
  const order = useMemo(() => (raw === undefined ? undefined : parseOrder(raw)), [raw]);
  const menuHref = useHostAwareHref(
    () => `${collectHref(`demo/${slug}`)}/commande`,
    `/collect/demo/${slug}/commande`
  );
  const [step, setStep] = useState(0);
  // Horloge du « prête vers » : posée au clic, comme le restaurant la pose en
  // lançant la préparation.
  const [clock, setClock] = useState<{ now: number; readyAt: string | null }>({
    now: 0,
    readyAt: null,
  });

  if (order === undefined) return null;
  if (!order) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-hairline bg-surface p-8 text-center">
        <p className="text-sm text-muted">
          Aperçu&nbsp;: passez d&apos;abord une commande depuis la carte pour en
          voir le suivi.
        </p>
        <a
          href={menuHref}
          className="ember-gradient mt-2 rounded-full px-6 py-2.5 text-sm font-semibold text-background"
        >
          Voir la carte
        </a>
      </div>
    );
  }

  const last = step === STEPS.length - 1;
  const advance = () => {
    const now = Date.now();
    setClock((current) => ({
      now,
      readyAt:
        STEPS[step + 1]?.status === "en_preparation"
          ? new Date(now + COLLECT_DEMO.slots.prepMinutes * 60_000).toISOString()
          : current.readyAt,
    }));
    setStep(step + 1);
  };

  return (
    <OrderTracking
      order={{
        status: STEPS[step].status,
        createdAt: order.createdAt,
        pickupAt: order.pickupAt,
        estimatedReadyAt: clock.readyAt,
        customerName: order.customerName,
        total: order.total,
        note: order.note,
        settlement: "payee",
      }}
      lines={order.lines}
      now={clock.now}
      restaurantName={restaurantName}
      address={address}
      phone={phone}
      back={{ href: menuHref }}
    >
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-hairline px-4 py-4 text-center">
        <p className="text-xs leading-relaxed text-muted">
          Aperçu&nbsp;: rien n&apos;a été envoyé ni payé. En service, le
          restaurant fait avancer la commande depuis son espace et cette page
          suit toute seule.
        </p>
        <button
          type="button"
          onClick={last ? () => setStep(0) : advance}
          className="min-h-11 rounded-full border border-hairline px-5 text-xs font-semibold text-ember-1 transition-colors hover:border-ember-2/40"
        >
          {last ? "Aperçu : revoir depuis le début" : "Aperçu : étape suivante"}
        </button>
      </div>
    </OrderTracking>
  );
}
