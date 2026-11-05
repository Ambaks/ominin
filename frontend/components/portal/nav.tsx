"use client";

import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageToggle } from "@/components/portal/language-toggle";
import { useLanguage } from "@/lib/portal/language";
import { brand, nav } from "@/lib/portal-data";

/*
 * Barre du portail : une pilule de verre flottante (kit gestion), plus nue
 * que celles des produits — pas de liens de section, la rangée des produits
 * est tout le contenu.
 */
export function PortalNav() {
  const { t } = useLanguage();

  return (
    <nav className="kit-glass-nav g-glass g-glass-pill mx-3 mt-(--g-frame-margin) sm:mx-6 xl:mx-auto xl:max-w-6xl">
      <div className="flex items-center justify-between gap-3 py-2 pl-4 pr-2 sm:pl-5">
        <Link href="/" className="ember-text flex items-center gap-2 font-display text-lg font-semibold">
          <Image src="/logo.png" alt="" width={28} height={28} />
          {brand}
        </Link>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
          <Link href={nav.cta.href} className="g-btn g-btn-primary g-press">
            {t(nav.cta.label)}
          </Link>
        </div>
      </div>
    </nav>
  );
}
