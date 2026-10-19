"use client";

import Image from "next/image";
import Link from "next/link";
import { KitHeading } from "@/components/landing-kit/heading";
import { useActiveIndex } from "@/components/landing-kit/use-active-index";
import { useLanguage } from "@/lib/portal/language";
import { products, productsSection, type Product } from "@/lib/portal-data";

/*
 * Les offres au défilement, comme le parcours des landings produit : la
 * photo de l'offre lue reste collée — à gauche sur ordinateur, en haut sur
 * téléphone, où les offres passent par-dessus en cartes givrées — et change
 * quand l'offre suivante atteint la ligne de lecture.
 *
 * La photo est traitée en « duotone braise » : légèrement désaturée, voilée
 * par le fond puis réchauffée par un dégradé ember, la trame de signature du
 * produit posée par-dessus — des photos d'origines différentes deviennent
 * une seule série.
 */

const number = (index: number) => String(index + 1).padStart(2, "0");

function Photo({ product, index, className }: { product: Product; index: number; className: string }) {
  const { t } = useLanguage();
  return (
    <div className={`relative overflow-hidden rounded-[2rem] border border-hairline bg-surface shadow-[0_30px_80px_-40px_var(--ember-2)] ${className}`}>
      <div key={product.id} className="absolute inset-0 animate-[kit-rise_0.7s_cubic-bezier(0.2,0.7,0.2,1)_both] motion-reduce:animate-none">
        <Image src={product.photo.src} alt={t(product.photo.alt)} fill sizes="(max-width: 1024px) 100vw, 45vw" className="object-cover saturate-[0.72]" />
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/30 to-background/10" aria-hidden />
        <div className="ember-gradient absolute inset-0 opacity-[0.16] mix-blend-overlay" aria-hidden />
        <div className={`${product.motif} absolute inset-0 opacity-50`} aria-hidden />
        <p className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-3 sm:inset-x-7 sm:bottom-7">
          <span className="kit-display text-3xl sm:text-5xl">{t(product.name)}</span>
          <span className="kit-display ember-text text-2xl sm:text-4xl" aria-hidden>
            {number(index)}
          </span>
        </p>
      </div>
    </div>
  );
}

function Offer({ product, index }: { product: Product; index: number }) {
  const { t } = useLanguage();
  const external = !product.href.startsWith("/");
  const linkClass =
    "ember-gradient group mt-7 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-background transition-transform hover:scale-[1.03]";
  const link = (
    <>
      {t(product.action)} · {product.destination}
      <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
    </>
  );

  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-ember-1">{number(index)}</p>
      <h3 className="kit-display mt-3 text-4xl lg:text-6xl">{t(product.name)}</h3>
      <p className="mt-3 text-lg font-semibold text-ember-2 lg:text-xl">{t(product.tagline)}</p>
      <p className="mt-4 max-w-lg text-pretty text-base leading-relaxed text-muted">{t(product.body)}</p>
      <ul className="mt-5 flex flex-wrap gap-1.5">
        {product.chips.map((chip) => (
          <li key={chip.fr} className="rounded-full border border-hairline px-3 py-1 text-xs text-muted">
            {t(chip)}
          </li>
        ))}
      </ul>
      {external ? (
        <a href={product.href} className={linkClass}>
          {link}
        </a>
      ) : (
        <Link href={product.href} className={linkClass}>
          {link}
        </Link>
      )}
    </>
  );
}

export function PortalProducts() {
  const { t } = useLanguage();
  const { active, itemRef, cover } = useActiveIndex<HTMLLIElement>();
  const current = products[active];

  return (
    <section id="produits" className="scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-10 lg:pb-10 lg:pt-28">
        <KitHeading eyebrow={t(productsSection.eyebrow)} title={t(productsSection.title)} />
        <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
          <div className="hidden lg:block">
            <div className="sticky top-[calc(50vh-17rem)]">
              <Photo product={current} index={active} className="aspect-[4/5]" />
              <div className="mt-6 flex justify-center gap-2" aria-hidden>
                {products.map((product, i) => (
                  <span
                    key={product.id}
                    className={`h-1.5 rounded-full transition-all duration-500 ${i === active ? "ember-gradient w-8" : "w-1.5 bg-hairline"}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="grid">
            <div ref={cover} className="sticky top-20 col-start-1 row-start-1 self-start lg:hidden" aria-hidden>
              <Photo product={current} index={active} className="aspect-[16/11]" />
            </div>
            <ol className="relative col-start-1 row-start-1 flex flex-col gap-[40svh] pb-6 pt-[17rem] sm:pt-[26rem] lg:gap-[26vh] lg:pb-[18vh] lg:pt-[14vh]">
              {products.map((product, i) => (
                <li
                  key={product.id}
                  ref={itemRef(i)}
                  className={`rounded-3xl border border-hairline bg-background/80 p-6 shadow-[0_20px_60px_-30px_var(--ember-2)] backdrop-blur-xl transition-opacity duration-500 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:opacity-40 lg:shadow-none lg:backdrop-blur-none ${i === active ? "lg:opacity-100" : ""}`}
                >
                  <Offer product={product} index={i} />
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
