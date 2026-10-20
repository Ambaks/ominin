"use client";

import Link from "next/link";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { duration, ease, stagger } from "@/lib/motion";

type NavLink = { href: string; label: string };

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <span className="flex items-baseline gap-3">
      <span className="display text-[2rem] leading-none">FLG</span>
      <span className={`label text-muted ${compact ? "max-sm:sr-only" : ""}`}>Aérogommage</span>
    </span>
  );
}

/*
 * Transparente sur le haut de page, elle se pose en verre fumé dès qu'on
 * défile. Sur mobile, un rideau plein écran aux liens en grand corps.
 */
export function SiteNav({ links, cta }: { links: readonly NavLink[]; cta: NavLink }) {
  const { scrollY } = useScroll();
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  // Fermé par un lien : le focus suit l'ancre au lieu de revenir au bouton.
  const followLink = useRef(false);

  useMotionValueEvent(scrollY, "change", (y) => setSolid(y > 24));

  // Menu ouvert : le reste de la page sort du parcours clavier, le focus entre
  // dans le menu et revient au bouton à la fermeture.
  useEffect(() => {
    if (!open) return;
    const behind = document.querySelectorAll("main, footer");
    const button = toggle.current;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    behind.forEach((el) => el.setAttribute("inert", ""));
    menu.current?.querySelector("a")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
      behind.forEach((el) => el.removeAttribute("inert"));
      if (!followLink.current) button?.focus();
      followLink.current = false;
    };
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500 ${
        solid || open ? "border-b border-line bg-basalte/80 backdrop-blur-xl" : "border-b border-transparent"
      }`}
    >
      <nav className="shell flex h-18 items-center justify-between gap-8" aria-label="Navigation principale">
        <Link href="/" aria-label="FLG Aérogommage, accueil" onClick={() => setOpen(false)}>
          <Logo compact />
        </Link>

        <ul className="hidden items-center gap-9 lg:flex">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="label text-fg/75 transition-colors duration-300 hover:text-fg">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <Link
            href={cta.href}
            className="label bg-accent px-4 py-2.5 font-semibold text-accent-ink transition-colors duration-300 hover:bg-chaux sm:px-5 sm:py-3"
          >
            <span className="sm:hidden">Devis</span>
            <span className="hidden sm:inline">{cta.label}</span>
          </Link>
          <button
            ref={toggle}
            type="button"
            aria-expanded={open}
            aria-controls="menu-mobile"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={() => setOpen(!open)}
            className="relative flex size-11 items-center justify-center lg:hidden"
          >
            <span className={`absolute h-px w-6 bg-fg transition-transform duration-500 ease-out ${open ? "rotate-45" : "-translate-y-1"}`} />
            <span className={`absolute h-px w-6 bg-fg transition-transform duration-500 ease-out ${open ? "-rotate-45" : "translate-y-1"}`} />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="menu-mobile"
            ref={menu}
            className="fixed inset-x-0 top-18 bottom-0 bg-basalte lg:hidden"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: duration.reveal, ease: ease.curtain }}
          >
            <ul className="shell flex flex-col gap-2 pt-10">
              {[...links, cta].map((l, i) => (
                <li key={l.href} className="overflow-hidden border-b border-line">
                  <motion.span
                    className="block"
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    transition={{ duration: duration.reveal, ease: ease.out, delay: 0.2 + i * stagger }}
                  >
                    <Link
                      href={l.href}
                      onClick={() => {
                        followLink.current = true;
                        setOpen(false);
                      }}
                      className="display display-m block py-4"
                    >
                      {l.label}
                    </Link>
                  </motion.span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
