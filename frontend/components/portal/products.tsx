"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/portal/language";
import { hero, products, type Product } from "@/lib/portal-data";

function ArrowIcon({ external }: { external: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {external ? (
        <path d="M7 17 17 7M9 7h8v8" />
      ) : (
        <path d="M5 12h13M12 5.5 18.5 12 12 18.5" />
      )}
    </svg>
  );
}

/*
 * Un cube. Éteint au repos : la trame de signature du produit affleure à peine.
 * Au survol — et au focus clavier, la carte entière étant le lien — un filament
 * braise s'allume le long de l'arête haute, la trame remonte et une lueur monte
 * du bas. C'est le seul mouvement du portail : quatre blocs qu'on éclaire en
 * les désignant.
 */
function ProductCube({ product, index }: { product: Product; index: number }) {
  const { t } = useLanguage();
  const external = !product.href.startsWith("/");

  const content = (
    <>
      <div
        className={`${product.motif} pointer-events-none absolute inset-0 opacity-40 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100`}
        aria-hidden
      />
      <div
        className="ember-glow pointer-events-none absolute inset-x-0 bottom-0 h-2/3 rotate-180 opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100"
        aria-hidden
      />
      <div
        className="ember-gradient pointer-events-none absolute inset-x-0 top-0 h-px origin-left scale-x-0 transition-transform duration-700 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100 motion-reduce:transition-none"
        aria-hidden
      />

      <div className="relative">
        <h3 className="font-display text-2xl font-semibold lg:text-[1.75rem]">
          {t(product.name)}
        </h3>
        <p className="mt-2 text-sm font-medium text-ember-2 lg:text-base">
          {t(product.tagline)}
        </p>
      </div>

      <div className="relative mt-8">
        <p className="text-sm leading-relaxed text-muted">{t(product.body)}</p>
        <span className="mt-6 flex items-center gap-2 text-xs tracking-wide text-faint transition-colors duration-300 group-hover:text-foreground group-focus-visible:text-foreground">
          {product.destination}
          <span className="transition-transform duration-300 group-hover:translate-x-1 group-focus-visible:translate-x-1 motion-reduce:transition-none">
            <ArrowIcon external={external} />
          </span>
        </span>
      </div>
    </>
  );

  const className =
    "rise group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-hairline bg-surface p-7 transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-ember-2/30 hover:shadow-[0_28px_60px_-30px_rgba(0,0,0,0.75)] focus-visible:-translate-y-1 focus-visible:border-ember-2/40 focus-visible:outline-none motion-reduce:hover:translate-y-0 motion-reduce:focus-visible:translate-y-0 lg:aspect-square lg:p-9";
  const style = { animationDelay: `${index * 70}ms` };
  const label = `${t(product.action)} — ${t(product.name)}`;

  return external ? (
    <a
      href={product.href}
      aria-label={label}
      className={className}
      style={style}
    >
      {content}
    </a>
  ) : (
    <Link
      href={product.href}
      aria-label={label}
      className={className}
      style={style}
    >
      {content}
    </Link>
  );
}

export function PortalProducts() {
  const { t } = useLanguage();

  return (
    <section
      id="produits"
      className="mx-auto w-full max-w-2xl px-5 pb-24 lg:max-w-5xl lg:px-10 lg:pb-32"
    >
      <div className="mb-8 flex items-center gap-4 lg:mb-10">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-faint">
          {t(hero.scrollHint)}
        </h2>
        <span className="h-px flex-1 bg-hairline" aria-hidden />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:gap-6">
        {products.map((product, index) => (
          <ProductCube key={product.id} product={product} index={index} />
        ))}
      </div>
    </section>
  );
}
