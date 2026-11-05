import Image from "next/image";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface Link {
  label: string;
  href: string;
}

/* Largeur dès laquelle les sections passent dans la barre (classes littérales pour Tailwind). */
const linksFromClasses = {
  md: { bar: "md:flex", row: "md:hidden" },
  lg: { bar: "lg:flex", row: "lg:hidden" },
};

/**
 * Barre des landings produit : marque, sections en pilule, connexion et
 * appel. Sur téléphone, les sections passent en rangée défilante dessous.
 * `glass` : une pilule de verre flottante (kit gestion) à la place de la
 * barre collée au bord.
 */
export function KitNav({
  wordmark,
  links,
  login,
  cta,
  glass,
  linksFrom = "md",
}: {
  wordmark: ReactNode;
  links: readonly Link[];
  login: Link;
  cta: Link;
  glass?: boolean;
  /** Beaucoup de sections : « lg » les garde dans la rangée du dessous jusqu'à l'ordinateur. */
  linksFrom?: keyof typeof linksFromClasses;
}) {
  const breakpoint = linksFromClasses[linksFrom];
  return (
    <>
      <nav
        className={
          glass
            ? "kit-glass-nav g-glass g-glass-pill mx-3 sm:mx-6 xl:mx-auto xl:max-w-6xl"
            : "sticky top-0 z-50 border-b border-hairline bg-background/75 backdrop-blur-xl"
        }
      >
        <div
          className={`mx-auto flex w-full max-w-6xl items-center justify-between gap-3 ${
            glass ? "py-2 pl-4 pr-2 sm:pl-5" : "px-4 py-3 sm:px-6 lg:px-10"
          }`}
        >
          <a
            href="#"
            className="flex min-w-0 items-center gap-2 whitespace-nowrap"
          >
            <Image src="/logo.png" alt="" width={26} height={26} />
            {wordmark}
          </a>

          <div
            className={`hidden items-center gap-1 ${breakpoint.bar} ${
              glass
                ? ""
                : "rounded-full border border-hairline bg-surface/60 p-1"
            }`}
          >
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full px-3.5 py-1.5 text-sm text-muted transition-colors hover:bg-surface-raised hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            {/* Au téléphone, la connexion est dans la rangée dessous. Le
                bouton de verre fixe son propre display : c'est l'enveloppe
                qui se cache. */}
            <span className="hidden sm:contents">
              <a
                href={login.href}
                className={
                  glass
                    ? "g-btn g-btn-secondary g-press"
                    : "whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold text-muted transition-colors hover:text-foreground"
                }
              >
                {login.label}
              </a>
            </span>
            <a
              href={cta.href}
              className={
                glass
                  ? "g-btn g-btn-primary g-press"
                  : "ember-gradient whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold text-background transition-transform hover:scale-[1.03] sm:text-sm"
              }
            >
              {cta.label}
            </a>
          </div>
        </div>
      </nav>
      {/* Téléphone : les sections en une rangée sous la barre, qui défile
          avec la page. */}
      <div
        className={`flex gap-1 overflow-x-auto px-4 py-2 [scrollbar-width:none] ${breakpoint.row} ${
          glass ? "mt-1" : "border-b border-hairline"
        }`}
      >
        {[...links, login].map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="shrink-0 rounded-full border border-hairline px-3 py-1 text-xs font-semibold text-muted"
          >
            {link.label}
          </a>
        ))}
      </div>
    </>
  );
}
