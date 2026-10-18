"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { useSkyPause } from "@/components/club/club-sky";
import { TablePayment } from "@/components/club/table-payment";
import { CLUB_BURST, CLUB_EASE, CLUB_TIMING } from "@/components/club/timing";
import type { Club } from "@/lib/club/types";

/*
 * Ce qui vit sur la page de réservation : le statut relu à intervalle (payée
 * à l'instant, arrivée scannée à la porte, remboursée par le club) et, tant
 * que la table est tenue, le compte à rebours et le paiement repris. Le
 * ciel s'y fige : le billet passe devant.
 */

export function BookingWatch({ live }: { live: boolean }) {
  const router = useRouter();
  useSkyPause(true);
  useEffect(() => {
    if (!live) return;
    const onVisible = () => {
      if (!document.hidden) router.refresh();
    };
    const timer = window.setInterval(onVisible, CLUB_TIMING.refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, live]);
  return null;
}

export function ResumePayment({
  bookingId,
  provider,
  totalCents,
  remainingMs,
}: {
  bookingId: string;
  provider: Club["paymentProvider"];
  totalCents: number;
  remainingMs: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const onPaid = useCallback(() => router.replace(`${pathname}?paye=1`, { scroll: false }), [router, pathname]);
  const onExpired = useCallback(() => router.refresh(), [router]);
  return (
    <div className="club-resume">
      <TablePayment
        provider={provider}
        bookingId={bookingId}
        totalCents={totalCents}
        remainingMs={remainingMs}
        onPaid={onPaid}
        onExpired={onExpired}
      />
    </div>
  );
}

/*
 * Au retour du paiement, une fois : quand le QR code s'est posé, sa plaque
 * s'éclaire d'un anneau d'or, une constellation en jaillit (dans une couche
 * fixe, au-dessus du billet qui la rognerait), puis l'étape « Payée »
 * s'allume.
 */
export function PaidBurst() {
  const layer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("paye");
    window.history.replaceState(window.history.state, "", url);
    const host = layer.current;
    const plate = document.querySelector<HTMLElement>(".club-qr-plate");
    const step = document.querySelector<HTMLElement>(".club-track [data-step='payee']");
    if (!host || !plate || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const animations: Animation[] = [];
    const timer = window.setTimeout(() => {
      const box = plate.getBoundingClientRect();
      host.style.setProperty("--x", `${box.left + box.width / 2}px`);
      host.style.setProperty("--y", `${box.top + box.height / 2}px`);
      plate.setAttribute("data-flash", "");
      const [near, far] = CLUB_BURST.reach;
      for (let index = 0; index < CLUB_BURST.stars; index++) {
        const star = document.createElement("span");
        star.className = "club-burst-star";
        host.appendChild(star);
        const angle = (index / CLUB_BURST.stars) * Math.PI * 2 + Math.random() * 0.3;
        const reach = near + Math.random() * (far - near);
        const animation = star.animate(
          [
            { transform: "translate(-50%, -50%) scale(0.2)", opacity: 0 },
            { opacity: 1, offset: 0.2 },
            {
              transform: `translate(calc(-50% + ${Math.cos(angle) * reach}px), calc(-50% + ${Math.sin(angle) * reach}px)) scale(1)`,
              opacity: 0,
            },
          ],
          { duration: CLUB_TIMING.burst, delay: Math.random() * CLUB_TIMING.stagger * 2, easing: CLUB_EASE, fill: "both" }
        );
        animation.onfinish = () => star.remove();
        animations.push(animation);
      }
      step?.setAttribute("data-lit", "");
    }, CLUB_TIMING.burstDelay);
    return () => {
      clearTimeout(timer);
      animations.forEach((animation) => animation.cancel());
    };
  }, []);
  return <div ref={layer} className="club-burst" aria-hidden />;
}
