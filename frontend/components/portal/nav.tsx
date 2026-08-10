"use client";

import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageToggle } from "@/components/portal/language-toggle";
import { useLanguage } from "@/lib/portal/language";
import { brand, nav } from "@/lib/portal-data";

/*
 * Barre du portail : volontairement plus nue que celles des produits — pas de
 * liens de section, les quatre cubes sont tout le contenu.
 */
export function PortalNav() {
  const { t } = useLanguage();

  return (
    <nav className="sticky top-0 z-50 border-b border-hairline bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-5 py-3 lg:max-w-5xl lg:px-10">
        <Link
          href="/"
          className="ember-text flex items-center gap-2 font-display text-lg font-semibold"
        >
          <Image src="/logo.png" alt="" width={28} height={28} />
          {brand}
        </Link>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
          <Link
            href={nav.cta.href}
            className="ember-gradient rounded-full px-4 py-2 text-xs font-semibold text-background lg:px-5 lg:py-2.5 lg:text-sm"
          >
            {t(nav.cta.label)}
          </Link>
        </div>
      </div>
    </nav>
  );
}
