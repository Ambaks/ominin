"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/lib/portal/language";
import { brand, footer, nav, products } from "@/lib/portal-data";

export function PortalFooter() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-5 py-10 text-center lg:max-w-5xl lg:px-10 lg:py-14">
        <p className="ember-text flex items-center gap-2 font-display text-lg font-semibold">
          <Image src="/logo.png" alt="" width={28} height={28} />
          {brand}
        </p>

        <p className="max-w-sm text-xs leading-relaxed text-faint">
          {t(footer.tagline)}
        </p>

        <nav className="flex flex-wrap justify-center gap-4 text-xs text-muted">
          {products
            .filter((product) => product.href.startsWith("http"))
            .map((product) => (
              <a
                key={product.id}
                href={product.href}
                className="transition-colors hover:text-foreground"
              >
                {t(product.name)}
              </a>
            ))}
          <Link
            href={nav.cta.href}
            className="transition-colors hover:text-foreground"
          >
            {t(footer.contact)}
          </Link>
        </nav>

        <p className="text-xs text-faint">
          © {footer.copyrightYear} {brand}
        </p>
      </div>
    </footer>
  );
}
