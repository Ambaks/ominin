"use client";

import Image from "next/image";
import Link from "next/link";
import { LEGAL_LINKS } from "@/lib/legal/constants";
import { useLanguage } from "@/lib/portal/language";
import {
  brand,
  footer,
  nav,
  products,
  surMesure,
  type Localized,
} from "@/lib/portal-data";

/*
 * Textes contractuels, servis par l'arborescence racine sur tous les hôtes
 * (voir proxy.ts). Ils n'existent qu'en français : on traduit l'intitulé de
 * la rubrique, pas le nom des documents.
 */
const legalHeading: Localized = { fr: "Légal", en: "Legal" };


/*
 * Footer corporate : marque à gauche, produits et contact en colonnes,
 * copyright sous un filet. Les liens produits sont dérivés du même tableau
 * que les cubes — impossible qu'ils divergent.
 */
export function PortalFooter() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto w-full max-w-2xl px-5 py-12 lg:max-w-6xl lg:px-10 lg:py-16">
        <div className="grid gap-10 sm:grid-cols-[1.4fr_1fr_1fr] lg:gap-16">
          <div>
            <p className="ember-text flex items-center gap-2 font-display text-lg font-semibold">
              <Image src="/logo.png" alt="" width={28} height={28} />
              {brand}
            </p>
            <p className="mt-4 max-w-xs text-xs leading-relaxed text-faint">
              {t(footer.tagline)}
            </p>
          </div>

          <nav aria-label={t(footer.productsHeading)}>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-faint">
              {t(footer.productsHeading)}
            </h2>
            <ul className="mt-4 flex flex-col gap-2.5">
              {products.map((product) => (
                <li key={product.id}>
                  {product.href.startsWith("/") ? (
                    <Link
                      href={product.href}
                      className="text-sm text-muted transition-colors hover:text-foreground"
                    >
                      {t(product.name)}
                    </Link>
                  ) : (
                    <a
                      href={product.href}
                      className="text-sm text-muted transition-colors hover:text-foreground"
                    >
                      {t(product.name)}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-faint">
              {t(footer.contactHeading)}
            </h2>
            <p className="mt-4">
              <Link
                href={nav.cta.href}
                className="text-sm text-muted transition-colors hover:text-foreground"
              >
                {t(footer.contact)}
              </Link>
            </p>
            <p className="mt-2.5 text-xs leading-relaxed text-faint">
              {t(surMesure.form.note)}
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-hairline pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-faint">
            © {footer.copyrightYear} {brand}
          </p>
          <nav
            aria-label={t(legalHeading)}
            className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-faint"
          >
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
