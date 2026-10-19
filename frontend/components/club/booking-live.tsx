"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useSkyPause } from "@/components/club/club-sky";
import { TablePayment } from "@/components/club/table-payment";
import { CLUB_BURST, CLUB_TIMING } from "@/components/club/timing";
import { clubToken, prefersReducedMotion } from "@/lib/club/media";
import type { Club } from "@/lib/club/types";

/*
 * Ce qui vit sur la page de réservation : le statut relu à intervalle (payée
 * à l'instant, arrivée scannée à la porte, remboursée par le club) et, tant
 * que la table est tenue, le compte à rebours et le paiement repris (le
 * ciel se fige le temps de payer). Puis le passe : QR code à agrandir,
 * partage du lien.
 */

export function BookingWatch({ live }: { live: boolean }) {
  const router = useRouter();
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
  paymentId,
  provider,
  totalCents,
  remainingMs,
  recap,
}: {
  paymentId: string;
  provider: Club["paymentProvider"];
  /** null : montant d'une part, inconnu ici (le serveur le relit). */
  totalCents: number | null;
  remainingMs: number;
  recap: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  useSkyPause(true);
  const onPaid = useCallback(() => router.replace(`${pathname}?paye=1`, { scroll: false }), [router, pathname]);
  const onExpired = useCallback(() => router.refresh(), [router]);
  return (
    <div className="club-resume">
      <TablePayment
        provider={provider}
        paymentId={paymentId}
        totalCents={totalCents}
        remainingMs={remainingMs}
        recap={recap}
        onPaid={onPaid}
        onExpired={onExpired}
      />
    </div>
  );
}

/*
 * Au retour du paiement, une fois : quand l'élément visé s'est posé (le QR
 * code, la place d'un ami), il s'éclaire d'un anneau d'or, une
 * constellation en jaillit (dans une couche fixe, au-dessus de ce qui la
 * rognerait), puis l'étape « Payée » s'allume s'il y en a une. Le paramètre
 * d'URL qui l'a déclenchée est retiré : un rechargement ne la rejoue pas.
 */
export function PaidBurst({
  target = ".club-qr-plate",
  param = "paye",
  scroll = false,
}: {
  target?: string;
  param?: string;
  /** L'élément visé est d'abord amené au centre de l'écran ; la gerbe part quand le défilement s'est posé. */
  scroll?: boolean;
}) {
  const layer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete(param);
    window.history.replaceState(window.history.state, "", url);
    const host = layer.current;
    const plate = document.querySelector<HTMLElement>(target);
    const step = document.querySelector<HTMLElement>(".club-track [data-step='payee']");
    if (!host || !plate) return;
    const reduced = prefersReducedMotion();
    if (scroll) plate.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
    if (reduced) return;

    const animations: Animation[] = [];
    let timer = 0;
    let started = false;
    const fire = () => {
      const box = plate.getBoundingClientRect();
      host.style.setProperty("--x", `${box.left + box.width / 2}px`);
      host.style.setProperty("--y", `${box.top + box.height / 2}px`);
      plate.setAttribute("data-flash", "");
      const [near, far] = CLUB_BURST.reach;
      const ease = clubToken("--c-ease");
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
          { duration: CLUB_TIMING.burst, delay: Math.random() * CLUB_BURST.jitterMs, easing: ease, fill: "both" }
        );
        animation.onfinish = () => star.remove();
        animations.push(animation);
      }
      step?.setAttribute("data-lit", "");
    };
    const start = () => {
      if (started) return;
      started = true;
      timer = window.setTimeout(fire, CLUB_TIMING.burstDelay);
    };
    // Sans défilement à faire, scrollend ne vient pas : le délai de repli prend le relais.
    const fallback = scroll ? window.setTimeout(start, CLUB_TIMING.scrollSettle) : 0;
    if (scroll) window.addEventListener("scrollend", start, { once: true });
    else start();
    return () => {
      clearTimeout(timer);
      clearTimeout(fallback);
      window.removeEventListener("scrollend", start);
      animations.forEach((animation) => animation.cancel());
    };
  }, [target, param, scroll]);
  return <div ref={layer} className="club-burst" aria-hidden />;
}

/* Le QR code, à toucher pour l'afficher en grand et plus lumineux devant la porte. */
export function QrZoom({ label, arrived, children }: { label: string; arrived: boolean; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        className="club-qr-plate"
        data-arrived={arrived || undefined}
        onClick={() => dialog.current?.showModal()}
        aria-label={`${label} : afficher en grand`}
      >
        {children}
      </button>
      <dialog
        ref={dialog}
        className="club-qr-dialog"
        aria-label={label}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="club-qr-dialog-plate">{children}</div>
        <p>Montrez ce code à l&rsquo;entrée</p>
        <button type="button" className="club-button club-button-secondary" onClick={() => dialog.current?.close()}>
          Fermer
        </button>
      </dialog>
    </>
  );
}

/* Partager la réservation (feuille de partage du téléphone), sinon copier son lien. */
export function PassActions({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), CLUB_TIMING.copied);
    return () => clearTimeout(timer);
  }, [copied]);
  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title, url }).catch(() => {});
      return;
    }
    await navigator.clipboard?.writeText(url).then(() => setCopied(true), () => {});
  };
  return (
    <button type="button" onClick={() => void share()}>
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M12 15V4M8 8l4-4 4 4M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
      </svg>
      {copied ? "Lien copié" : "Envoyer mon billet"}
      <span className="sr-only" aria-live="polite">
        {copied ? "Le lien de la réservation est copié." : ""}
      </span>
    </button>
  );
}
