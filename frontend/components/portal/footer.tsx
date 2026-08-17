"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/lib/portal/language";
import { brand, footer, nav, products, surMesure } from "@/lib/portal-data";

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

        <p className="mt-12 border-t border-hairline pt-6 text-xs text-faint">
          © {footer.copyrightYear} {brand}
        </p>
      </div>
    </footer>
  );
}
