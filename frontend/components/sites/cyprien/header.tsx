"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cyprienHref, nav, orderPath, shops, socials, telHref } from "@/lib/sites/cyprien";
import { CMark } from "./stamp";
import { Arrow, vars } from "./ui";

/*
 * État du bandeau, lu au défilement :
 *  - « c » une fois la page quittée de son sommet : il se resserre et prend un fond ;
 *  - « m » tant que le grand logotype de l’accueil ([data-hero-mark]) est à
 *    l’écran : le petit cède la place au « C » du cachet, pour ne pas le doubler ;
 *  - « n » sur une section sombre (.cy-night), dont il prend la teinte.
 */
function subscribe(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  window.addEventListener("resize", onChange);
  return () => {
    window.removeEventListener("scroll", onChange);
    window.removeEventListener("resize", onChange);
  };
}

const HEADER_LINE = 48;

function inView(selector: string): boolean {
  const element = document.querySelector(selector);
  if (!element) return false;
  const { top, bottom } = element.getBoundingClientRect();
  return bottom > HEADER_LINE && top < window.innerHeight;
}

function readState(): string {
  const overNight = [...document.querySelectorAll(".cy-site .cy-night")].some((section) => {
    const { top, bottom } = section.getBoundingClientRect();
    return top <= HEADER_LINE && bottom > HEADER_LINE;
  });
  return [
    window.scrollY > 24 && "c",
    inView("[data-hero-mark]") && "m",
    overNight && "n",
  ]
    .filter(Boolean)
    .join("");
}

export function CyprienHeader() {
  const pathname = usePathname();
  const home = cyprienHref("/");
  const state = useSyncExternalStore(subscribe, readState, () => (pathname === home ? "m" : ""));
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Une navigation ne fait pas défiler : l'état lu pendant le rendu, avant
  // que la nouvelle page existe, se relit une fois qu'elle est en place.
  useEffect(() => {
    window.dispatchEvent(new Event("scroll"));
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    root.classList.add("cy-locked");
    // Le menu n’existe qu’en mobile : passé en grand écran, on le ferme.
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onChange = () => desktop.matches && dialogRef.current?.close();
    desktop.addEventListener("change", onChange);
    return () => {
      root.classList.remove("cy-locked");
      desktop.removeEventListener("change", onChange);
    };
  }, [open]);

  function openMenu() {
    dialogRef.current?.showModal();
    closeRef.current?.focus();
    setOpen(true);
  }

  const closeMenu = () => dialogRef.current?.close();
  const isCurrent = (path: string) => pathname === cyprienHref(path) || pathname.startsWith(`${cyprienHref(path)}/`);
  const order = cyprienHref(orderPath);

  return (
    <>
      <header
        className="cy-header"
        data-condensed={state.includes("c")}
        data-mark-hidden={state.includes("m")}
        data-tone={state.includes("n") ? "night" : undefined}
      >
        <div className="cy-header-bar cy-wrap">
          <Link href={home} className="cy-header-mark" aria-label="Boulangerie Cyprien, accueil">
            <CMark className="cy-header-c" />
            <span className="cy-header-word">Cyprien</span>
          </Link>
          <nav aria-label="Navigation principale" className="cy-header-nav">
            <ul>
              {nav.map((item, index) => (
                <li key={item.path} style={vars({ "--i": index })}>
                  <Link
                    href={cyprienHref(item.path)}
                    className="cy-nav-link"
                    aria-current={isCurrent(item.path) ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="cy-header-actions" style={vars({ "--i": nav.length })}>
            {/* Sur la commande et son suivi, l'appel à commander n'a plus d'objet. */}
            {!isCurrent(orderPath) && (
              <Link href={order} className="cy-btn cy-btn-primary cy-btn-sm cy-header-order">
                <span>Commander</span>
                <Arrow />
              </Link>
            )}
            <button
              type="button"
              className="cy-menu-btn"
              aria-expanded={open}
              aria-controls="cy-menu"
              aria-haspopup="dialog"
              onClick={openMenu}
            >
              <span className="cy-menu-btn-lines" aria-hidden="true" />
              <span className="cy-menu-btn-label">Menu</span>
            </button>
          </div>
        </div>
      </header>
      <div className="cy-header-spacer" aria-hidden="true" />

      <dialog
        id="cy-menu"
        ref={dialogRef}
        className="cy-menu"
        aria-label="Menu"
        onClose={() => setOpen(false)}
      >
        <div className="cy-menu-inner">
          <div className="cy-menu-top cy-wrap">
            <Link href={home} className="cy-header-mark" onClick={closeMenu}>
              Cyprien
            </Link>
            <button ref={closeRef} type="button" className="cy-menu-close" onClick={closeMenu}>
              Fermer
              <svg viewBox="0 0 14 14" aria-hidden="true" focusable="false">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </button>
          </div>
          <nav aria-label="Navigation principale" className="cy-wrap">
            <ol className="cy-menu-links">
              {[{ path: "/", label: "Accueil" }, ...nav].map((item, index) => (
                <li key={item.path} style={{ animationDelay: `${0.08 + index * 0.05}s` }}>
                  <Link
                    href={cyprienHref(item.path)}
                    onClick={closeMenu}
                    aria-current={pathname === cyprienHref(item.path) ? "page" : undefined}
                  >
                    <span className="cy-menu-num" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
          <div className="cy-menu-foot cy-wrap">
            <Link href={order} className="cy-btn cy-btn-paper w-full" onClick={closeMenu}>
              <span>Commander en ligne</span>
              <Arrow />
            </Link>
            <ul className="cy-menu-shops">
              {shops.map((shop) => (
                <li key={shop.id}>
                  <span className="cy-menu-shop-name">{shop.name}</span>
                  <span>{shop.street}</span>
                  <a href={telHref(shop.phone)}>{shop.phone}</a>
                </li>
              ))}
            </ul>
            <p className="cy-menu-social">
              <a href={socials.instagram.href} target="_blank" rel="noopener noreferrer">
                Instagram<span className="sr-only"> (nouvel onglet)</span>
              </a>
              <a href={socials.facebook.href} target="_blank" rel="noopener noreferrer">
                Facebook<span className="sr-only"> (nouvel onglet)</span>
              </a>
            </p>
          </div>
        </div>
      </dialog>
    </>
  );
}
