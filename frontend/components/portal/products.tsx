"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { KitHeading } from "@/components/landing-kit/heading";
import { useActiveIndex } from "@/components/landing-kit/use-active-index";
import { ProductIcon } from "@/components/portal/product-icons";
import { AgentsMock, ClipMock } from "@/components/portal/product-mocks";
import { screenSizes } from "@/lib/pitch/kit";
import { useLanguage } from "@/lib/portal/language";
import { products, productsSection, type Product, type ProductId, type Shot } from "@/lib/portal-data";

/*
 * Les produits : une rangée de tuiles dans un seul cadre de verre (la tuile
 * lue est une plaque), collée sous la barre sur ordinateur ; dessous, le
 * produit choisi se raconte au défilement comme sur sa propre landing — les
 * étapes défilent à droite, un téléphone reste collé à gauche et montre
 * l'écran de l'étape au milieu de la vue (captures des démos, ou maquette
 * pour l'agent et le clipper). Sous lg, le téléphone reste collé en haut et
 * les étapes passent par-dessus en cartes de verre.
 *
 * Le produit choisi est dans le hash (#club) : un lien profond l'ouvre, et
 * changer de produit depuis le fond du parcours ramène la rangée en haut.
 */

const isProductId = (value: string): value is ProductId => products.some((product) => product.id === value);

function Visual({ shot, screenKey, phoneWidth }: { shot: Shot; screenKey: number; phoneWidth: string }) {
  const { t } = useLanguage();
  const screen = shot.kind === "image" ? (shot.screen ?? "phone") : "phone";
  const { width, height } = screenSizes[screen];
  const phone = screen === "phone";
  return (
    <div className={`g-glass mx-auto w-full p-g-pad ${phone ? `kit-phone ${phoneWidth}` : "g-glass-hero"}`}>
      <div className="g-plate relative overflow-hidden" style={{ aspectRatio: `${width} / ${height}` }}>
        <div key={screenKey} className="absolute inset-0 animate-[kit-rise_0.6s_cubic-bezier(0.2,0.7,0.2,1)_both] motion-reduce:animate-none">
          {shot.kind === "image" ? (
            <Image src={shot.src} alt={t(shot.alt)} fill sizes="(max-width: 1024px) 60vw, 30vw" className="object-cover object-top" />
          ) : (
            <div className="h-full overflow-hidden p-4">
              {shot.mock === "agents" ? <AgentsMock step={shot.step} /> : <ClipMock step={shot.step} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Story({ product }: { product: Product }) {
  const { t } = useLanguage();
  const { active, itemRef, cover } = useActiveIndex<HTMLLIElement>();
  const step = product.steps[Math.min(active, product.steps.length - 1)];

  return (
    <div
      id={`produit-${product.id}`}
      role="tabpanel"
      aria-labelledby={`onglet-${product.id}`}
      className="mt-10 grid gap-10 lg:mt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-20"
    >
      <div className="hidden lg:block">
        <div className="sticky top-[calc(50vh-12rem)]">
          <Visual shot={step.shot} screenKey={active} phoneWidth="max-w-[17.5rem]" />
          <div className="mt-6 flex justify-center gap-2" aria-hidden>
            {product.steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-500 ${i === active ? "ember-gradient w-8" : "w-1.5 bg-hairline"}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="grid">
        <div ref={cover} className="sticky top-24 col-start-1 row-start-1 self-start lg:hidden" aria-hidden>
          <Visual shot={step.shot} screenKey={active} phoneWidth="max-w-[14rem]" />
        </div>
        <div className="relative col-start-1 row-start-1 pt-[20rem] lg:pt-0">
          <div className="g-glass p-6 lg:bg-none lg:p-0 lg:shadow-none lg:backdrop-blur-none kit-story-step">
            <h3 className="kit-display text-4xl lg:text-6xl">{t(product.name)}</h3>
            <p className="mt-3 text-lg font-semibold text-ember-2 lg:text-xl">{t(product.tagline)}</p>
            <p className="mt-4 max-w-lg text-pretty text-base leading-relaxed text-muted">{t(product.body)}</p>
          </div>

          <ol className="flex flex-col gap-[45svh] pb-6 pt-[30svh] lg:gap-[28vh] lg:pb-[4vh] lg:pt-[20vh]">
            {product.steps.map((s, i) => (
              <li
                key={s.title.fr}
                ref={itemRef(i)}
                className={`transition-opacity duration-500 lg:opacity-45 ${i === active ? "lg:opacity-100" : ""}`}
              >
                <div className="kit-story-step g-glass p-6 lg:p-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-ember-1">{t(s.kicker)}</p>
                  <h4 className="kit-display mt-3 text-balance text-3xl lg:text-5xl">{t(s.title)}</h4>
                  <p className="mt-4 max-w-lg text-pretty text-base leading-relaxed text-muted">{t(s.description)}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="kit-story-step g-glass flex flex-wrap items-center gap-3 p-6 lg:p-0">
            <a href={product.href} className="g-btn g-btn-primary g-press group">
              {t(productsSection.openLabel)} · {product.destination}
              <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
            </a>
            {product.demo && (
              <a href={product.demo.href} className="g-btn g-btn-secondary g-press">
                {t(productsSection.demoLabel)} · {t(product.demo.label)}
              </a>
            )}
            <a href="#produits" className="text-sm font-semibold text-muted transition-colors hover:text-foreground lg:hidden">
              {t(productsSection.othersLabel)} ↑
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PortalProducts() {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<ProductId>(products[0].id);
  const row = useRef<HTMLDivElement>(null);
  /* Repère en flux devant la rangée : collée, elle ne dit plus où elle est. */
  const anchor = useRef<HTMLDivElement>(null);
  const product = products.find((p) => p.id === selected) ?? products[0];

  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!isProductId(id)) return;
    const frame = requestAnimationFrame(() => {
      setSelected(id);
      anchor.current?.scrollIntoView({ block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const select = (id: ProductId) => {
    setSelected(id);
    window.history.replaceState(null, "", `#${id}`);
    const node = anchor.current;
    if (!node) return;
    // Depuis le fond du parcours (la rangée collée ou déjà passée), le nouveau
    // parcours commence sous la rangée : on la ramène à sa place.
    const top = parseFloat(getComputedStyle(node).scrollMarginTop);
    if (node.getBoundingClientRect().top <= top + 1) node.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const index = products.findIndex((p) => p.id === selected);
    const next = products[(index + delta + products.length) % products.length];
    select(next.id);
    (event.currentTarget.querySelector(`#onglet-${next.id}`) as HTMLElement | null)?.focus();
  };

  return (
    <section id="produits" className="scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-4 pt-16 sm:px-6 sm:pt-24 lg:px-10 lg:pt-28">
        <KitHeading eyebrow={t(productsSection.eyebrow)} title={t(productsSection.title)} subtitle={t(productsSection.subtitle)} />

        <div ref={anchor} className="portal-row-anchor mt-10" aria-hidden />
        <div ref={row} className="portal-row g-glass p-g-pad">
          <div
            role="tablist"
            aria-label={t(productsSection.rowLabel)}
            onKeyDown={onKeyDown}
            className="portal-tabs flex snap-x gap-1 overflow-x-auto lg:grid lg:grid-cols-6"
          >
            {products.map((p) => {
              const active = p.id === selected;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  id={`onglet-${p.id}`}
                  aria-selected={active}
                  aria-controls={`produit-${p.id}`}
                  tabIndex={active ? 0 : -1}
                  onClick={() => select(p.id)}
                  className={`g-press flex min-w-[10.5rem] shrink-0 snap-start items-center gap-3 px-4 py-3 text-left lg:min-w-0 ${
                    active ? "g-plate" : "rounded-g-card text-muted transition-colors hover:text-foreground"
                  }`}
                >
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                      active ? "ember-gradient text-background" : "border border-hairline"
                    }`}
                  >
                    <ProductIcon id={p.id} />
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm font-bold ${active ? "text-foreground" : ""}`}>{p.short}</span>
                    <span className="block text-[11px] leading-snug text-muted">{t(p.audience)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <Story key={product.id} product={product} />
      </div>
    </section>
  );
}
