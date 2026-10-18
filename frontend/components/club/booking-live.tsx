"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { HoldCountdown } from "@/components/club/hold-countdown";
import { TablePayment } from "@/components/club/table-payment";
import { CLUB_BURST, CLUB_EASE, CLUB_TIMING } from "@/components/club/timing";
import { TABLE_HOLD_S } from "@/lib/club/hold";
import type { Club } from "@/lib/club/types";

/*
 * Ce qui vit sur la page de réservation : le statut relu à intervalle (payée
 * à l'instant, arrivée scannée à la porte, remboursée par le club) et, tant
 * que la table est tenue, le compte à rebours et le paiement repris.
 */

export function BookingWatch() {
  const router = useRouter();
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) router.refresh();
    };
    const timer = window.setInterval(onVisible, CLUB_TIMING.refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);
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
      <div className="club-paystep-head">
        <HoldCountdown remainingMs={remainingMs} totalMs={TABLE_HOLD_S * 1000} onExpire={onExpired} />
        <p>
          <strong>Table tenue pour vous.</strong> Réglez avant la fin du compte à rebours.
        </p>
      </div>
      <TablePayment
        provider={provider}
        bookingId={bookingId}
        totalCents={totalCents}
        onPaid={onPaid}
        onExpired={onExpired}
      />
    </div>
  );
}

/* La constellation qui éclate autour du billet, une seule fois, au retour du paiement. */
export function PaidBurst() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("paye");
    window.history.replaceState(window.history.state, "", url);
    const host = ref.current;
    if (!host || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const [near, far] = CLUB_BURST.reach;
    const animations = Array.from({ length: CLUB_BURST.stars }, (_, index) => {
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
      return animation;
    });
    return () => animations.forEach((animation) => animation.cancel());
  }, []);
  return <div ref={ref} className="club-burst" aria-hidden />;
}
