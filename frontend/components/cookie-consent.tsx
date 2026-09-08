"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/*
 * Mesure d'audience et consentement. Rien n'est chargé ni déposé tant que le
 * visiteur n'a pas accepté : c'est ce que demande la CNIL, et c'est plus
 * simple à tenir qu'un mode « consentement dégradé ». Le choix est partagé
 * entre les produits par un cookie de .ominin.com, comme le thème — la
 * bannière ne réapparaît pas d'un sous-domaine à l'autre.
 *
 * Deux surfaces restent hors mesure : les espaces authentifiés (l'outil de
 * travail d'une équipe n'a pas à être mesuré) et les menus QR (on
 * n'interrompt pas un client attablé pour une bannière qui ne le sert pas).
 */

type Choice = "granted" | "denied";

const CONSENT_COOKIE = "ominin-consent";
/** Six mois : au-delà, le choix se redemande (recommandation CNIL). */
const CONSENT_MAX_AGE_S = 15_552_000;

const UNMEASURED_PATHS = [
  "/gestion",
  "/menu/gestion",
  "/admin",
  "/clip/espace",
  "/shop/gestion",
  "/m/",
  "/menu/m/",
];

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function readChoice(): Choice | null {
  const match = document.cookie.match(/(?:^|; )ominin-consent=(granted|denied)/);
  return (match?.[1] as Choice | undefined) ?? null;
}

function writeChoice(choice: Choice): void {
  const domain = window.location.hostname.endsWith("ominin.com")
    ? "; domain=.ominin.com"
    : "";
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${choice}; path=/; max-age=${CONSENT_MAX_AGE_S}; SameSite=Lax${domain}${secure}`;
}

export function CookieConsent() {
  const pathname = usePathname();
  const measurementId = process.env.NEXT_PUBLIC_GA_ID;
  // undefined tant que le cookie n'a pas été lu (rendu serveur) : la bannière
  // n'apparaît qu'après, sans faire diverger l'hydratation.
  const [choice, setChoice] = useState<Choice | null | undefined>(undefined);

  useEffect(() => {
    // Le cookie n'existe pas au rendu serveur : il se lit une fois, au
    // montage, et ne déclenche donc pas de cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChoice(readChoice());
  }, []);

  const measured =
    Boolean(measurementId) &&
    !UNMEASURED_PATHS.some((path) => pathname.startsWith(path));
  const granted = measured && choice === "granted";

  // Chaque navigation est une page vue : en App Router, gtag ne la voit pas
  // passer tout seul.
  useEffect(() => {
    if (!granted || !measurementId) return;
    window.gtag?.("event", "page_view", {
      page_path: pathname,
      send_to: measurementId,
    });
  }, [granted, measurementId, pathname]);

  const decide = (next: Choice) => {
    writeChoice(next);
    setChoice(next);
  };

  return (
    <>
      {granted && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
            strategy="afterInteractive"
          />
          <Script id="ominin-ga" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${measurementId}',{anonymize_ip:true});`}
          </Script>
        </>
      )}

      {measured && choice === null && (
        <div
          role="dialog"
          aria-label="Cookies"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-hairline bg-surface/95 backdrop-blur-md print:hidden"
        >
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:max-w-5xl lg:px-10">
            <p className="text-sm leading-relaxed text-muted">
              Nous mesurons l&rsquo;audience de ce site pour l&rsquo;améliorer.
              Rien n&rsquo;est déposé sans votre accord.
            </p>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => decide("denied")}
                className="rounded-full border border-hairline px-4 py-2 text-sm font-semibold text-muted transition-colors hover:text-foreground"
              >
                Refuser
              </button>
              <button
                type="button"
                onClick={() => decide("granted")}
                className="ember-gradient rounded-full px-5 py-2 text-sm font-semibold text-background"
              >
                Accepter
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
