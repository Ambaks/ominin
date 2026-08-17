"use client";

import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/portal/reveal";
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
 * Grille bento : le produit phare (menu) et le sur-mesure occupent les
 * grandes cellules, collect et clip les moyennes — l'asymétrie hiérarchise
 * sans rien dire. Une seule colonne en mobile.
 */
const BENTO_SPANS = [
  "lg:col-span-7",
  "lg:col-span-5",
  "lg:col-span-5",
  "lg:col-span-7",
];

/*
 * Un cube. La photo est traitée en « duotone braise » : légèrement
 * désaturée, voilée par le fond puis réchauffée par un dégradé ember, la
 * trame de signature du produit posée par-dessus — quatre photos d'origines
 * différentes deviennent une seule série. Le numéro d'ordre flotte sur la
 * photo, les trois traits saillants du produit en puces sous le descriptif.
 * Au survol (et au focus clavier, la carte entière étant le lien) : la photo
 * respire, le filament braise s'allume le long de l'arête haute, la flèche
 * s'avance.
 */
function ProductCube({ product, index }: { product: Product; index: number }) {
  const { t } = useLanguage();
  const external = !product.href.startsWith("/");

  const content = (
    <>
      <div className="relative h-52 overflow-hidden sm:h-60 lg:h-64">
        <Image
          src={product.photo.src}
          alt={t(product.photo.alt)}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover saturate-[0.72] transition-transform duration-700 ease-out group-hover:scale-[1.04] group-focus-visible:scale-[1.04] motion-reduce:transition-none"
        />
        {/* Voile duotone : assombrit vers le bas pour fondre dans la carte,
            réchauffe les hautes lumières aux couleurs braise. */}
        <div
          className="absolute inset-0 bg-linear-to-t from-surface via-background/35 to-background/15"
          aria-hidden
        />
        <div
          className="ember-gradient absolute inset-0 opacity-[0.16] mix-blend-overlay"
          aria-hidden
        />
        <div
          className={`${product.motif} absolute inset-0 opacity-45 transition-opacity duration-500 group-hover:opacity-80 group-focus-visible:opacity-80`}
          aria-hidden
        />
        <span
          className="absolute top-4 left-4 rounded-full border border-hairline bg-background/55 px-2.5 py-1 font-display text-xs font-semibold backdrop-blur-sm"
          aria-hidden
        >
          <span className="ember-text">
            {String(index + 1).padStart(2, "0")}
          </span>
        </span>
        <div
          className="ember-gradient absolute inset-x-0 top-0 h-px origin-left scale-x-0 transition-transform duration-700 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100 motion-reduce:transition-none"
          aria-hidden
        />
      </div>

      <div className="flex flex-1 flex-col p-6 pt-5 lg:p-8 lg:pt-6">
        <h3 className="font-display text-2xl font-semibold lg:text-[1.75rem]">
          {t(product.name)}
        </h3>
        <p className="mt-1.5 text-sm font-medium text-ember-2 lg:text-base">
          {t(product.tagline)}
        </p>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted">
          {t(product.body)}
        </p>
        <ul className="mt-5 flex flex-wrap gap-1.5">
          {product.chips.map((chip) => (
            <li
              key={chip.fr}
              className="rounded-full border border-hairline px-2.5 py-1 text-[11px] text-muted"
            >
              {t(chip)}
            </li>
          ))}
        </ul>
        <span className="mt-auto flex items-center gap-2 pt-6 text-xs tracking-wide text-faint transition-colors duration-300 group-hover:text-foreground group-focus-visible:text-foreground">
          {product.destination}
          <span className="transition-transform duration-300 group-hover:translate-x-1 group-focus-visible:translate-x-1 motion-reduce:transition-none">
            <ArrowIcon external={external} />
          </span>
        </span>
      </div>
    </>
  );

  const className =
    "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-hairline bg-surface transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-ember-2/30 hover:shadow-[0_28px_60px_-30px_rgba(0,0,0,0.75)] focus-visible:-translate-y-1 focus-visible:border-ember-2/40 focus-visible:outline-none motion-reduce:hover:translate-y-0 motion-reduce:focus-visible:translate-y-0";
  const label = `${t(product.action)} — ${t(product.name)}`;

  return (
    <Reveal
      delay={(index % 2) * 90}
      className={BENTO_SPANS[index] ?? ""}
    >
      {external ? (
        <a href={product.href} aria-label={label} className={className}>
          {content}
        </a>
      ) : (
        <Link href={product.href} aria-label={label} className={className}>
          {content}
        </Link>
      )}
    </Reveal>
  );
}

export function PortalProducts() {
  const { t } = useLanguage();

  return (
    <section
      id="produits"
      className="mx-auto w-full max-w-2xl scroll-mt-20 px-5 pb-20 lg:max-w-6xl lg:px-10 lg:pb-28"
    >
      <div className="mb-8 flex items-center gap-4 lg:mb-10">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-faint">
          {t(hero.scrollHint)}
        </h2>
        <span className="h-px flex-1 bg-hairline" aria-hidden />
      </div>

      <div className="grid gap-5 lg:grid-cols-12 lg:gap-6">
        {products.map((product, index) => (
          <ProductCube key={product.id} product={product} index={index} />
        ))}
      </div>
    </section>
  );
}
