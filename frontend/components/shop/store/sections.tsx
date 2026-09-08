import Link from "next/link";
import type { Shop, ShopCategory } from "@/lib/shop/types";
import { GiftIcon, HeartIcon, LockIcon, TruckIcon } from "../icons";
import { shopHref } from "./href";
import { ButtonLink, HeartBullet, Multiline } from "./ui";

/* Sections de la page d'accueil et des pages d'ambiance d'une boutique. */

const REASSURANCE = [
  { icon: TruckIcon, title: "Livraison soignée", text: "Partout en France" },
  { icon: LockIcon, title: "Paiement sécurisé", text: "Par Stripe, carte ou Apple Pay" },
  { icon: GiftIcon, title: "Emballage cadeau", text: "Une attention dans chaque détail" },
  { icon: HeartIcon, title: "Service client", text: "À ton écoute, réponse rapide" },
];

export function Reassurance({ compact }: { compact?: boolean }) {
  return (
    <section aria-label="Nos engagements" className="border-y border-shop-line-soft bg-shop-paper">
      <div className={`shop-container grid grid-cols-2 gap-5 py-6 md:grid-cols-4 md:gap-8 ${compact ? "md:py-6" : "md:py-9"}`}>
        {REASSURANCE.map((item) => (
          <div key={item.title} className="flex items-center gap-3 md:gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-shop-tint-strong text-shop-accent-deep md:size-[52px]">
              <item.icon className="size-[22px]" strokeWidth={1.5} />
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="shop-label text-[10px] text-shop-ink md:text-[11px]">{item.title}</span>
              <span className="text-[11.5px] text-shop-ink-soft md:text-[13px]">{item.text}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  { title: "Choisis ce qui te plaît", text: "Parcours le catalogue, compare, laisse-toi tenter : il y en a pour chaque envie et chaque budget." },
  { title: "Personnalise", text: "Quand un article le propose, choisis ta variante (parfum, couleur, taille) directement sur la fiche." },
  { title: "Ajoute un mot doux", text: "Quelques lignes pour toi ou pour la personne à qui tu l'offres, glissées dans le colis." },
  { title: "On s'occupe du reste", text: "Ta commande est préparée à la main, emballée avec soin et expédiée avec un numéro de suivi." },
];

export function HowItWorks() {
  return (
    <section className="border-y border-shop-line-soft bg-shop-paper">
      <div className="shop-container flex flex-col gap-10 py-16 md:gap-12 md:py-[88px]">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="shop-kicker">Simple comme un cadeau</span>
          <h2 className="text-3xl md:text-[40px]">Comment ça marche</h2>
        </div>
        <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-4 lg:flex-col lg:gap-3.5">
              <span className="w-12 shrink-0 font-shop-display text-4xl leading-none text-shop-accent-soft lg:w-auto lg:text-[52px]" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex flex-col gap-1.5">
                <span className="text-[15px] font-semibold text-shop-ink md:text-base">{step.title}</span>
                <p className="text-sm leading-relaxed text-shop-ink-soft">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Présentation de la marque (texte « À propos » de la boutique) face à une photo. */
export function AboutTeaser({ shop, image }: { shop: Shop; image: { url: string; alt: string } | null }) {
  return (
    <section className="shop-container grid items-center gap-10 py-16 md:grid-cols-2 md:gap-20 md:py-24">
      {image && (
        <div className="relative">
          <div className="relative aspect-[4/5] max-h-[640px] overflow-hidden rounded-[28px] bg-shop-tint-strong">
            <img src={image.url} alt={image.alt} className="size-full object-cover object-[50%_55%]" loading="lazy" />
          </div>
          {shop.tagline && (
            <div className="absolute -right-2 bottom-8 w-[220px] rounded-[20px] bg-shop-paper p-5 shop-shadow-hover md:-right-6">
              <span className="block font-shop-script text-[26px] leading-none text-shop-accent">{shop.tagline.split(",")[0]}</span>
              {shop.tagline.includes(",") && <span className="mt-1 block font-shop-display text-lg leading-tight text-shop-ink">{shop.tagline.split(",").slice(1).join(",").trim()}</span>}
            </div>
          )}
        </div>
      )}
      <div className="flex flex-col gap-6 md:gap-7">
        <span className="shop-kicker">Notre univers</span>
        <h2 className="text-3xl md:text-[40px]">Tout est pensé pour faire plaisir</h2>
        <Multiline text={shop.about_text} className="line-clamp-[8]" />
        <ul className="flex flex-col gap-3.5">
          {["Des produits choisis avec soin, préparés à la main", "Un emballage qu'on a envie de garder", "Toujours une petite attention en plus"].map((line) => (
            <li key={line} className="flex items-start gap-3.5 text-[15px] leading-relaxed text-shop-ink">
              <HeartBullet />
              {line}
            </li>
          ))}
        </ul>
        <ButtonLink href={shopHref(shop.slug, "/a-propos")} variant="secondary" className="w-fit">
          En savoir plus
        </ButtonLink>
      </div>
    </section>
  );
}

export function GiftBand({ slug, images }: { slug: string; images: { url: string; alt: string }[] }) {
  return (
    <section className="shop-container">
      <div className="grid items-center gap-10 rounded-[28px] bg-shop-accent px-6 py-12 text-shop-paper md:grid-cols-[1.2fr_1fr] md:gap-16 md:rounded-[32px] md:px-20 md:py-[72px]">
        <div className="flex flex-col gap-5 md:gap-6">
          <span className="font-shop-script text-[32px] leading-none text-shop-tint">Offrir</span>
          <h2 className="text-3xl text-shop-paper md:text-[40px]">Une attention qui fait toute la différence</h2>
          <p className="max-w-lg text-[15px] leading-relaxed text-shop-tint md:text-base">
            Anniversaire, remerciement, envie de dire « je pense à toi » : ajoute ton mot doux au moment de la commande, il sera glissé dans le colis, sans aucun prix apparent. Tu peux aussi le faire livrer directement chez elle.
          </p>
          <ButtonLink href={shopHref(slug, "/offrir")} variant="onAccent" className="w-fit">
            Offrir
          </ButtonLink>
        </div>
        {images.length >= 2 && (
          <div className="grid grid-cols-2 gap-4">
            <div className="mt-8 aspect-[4/5] overflow-hidden rounded-[24px]">
              <img src={images[0].url} alt={images[0].alt} className="size-full object-cover" loading="lazy" />
            </div>
            <div className="mb-8 aspect-[4/5] overflow-hidden rounded-[24px]">
              <img src={images[1].url} alt={images[1].alt} className="size-full object-cover" loading="lazy" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function CollectionChips({ slug, categories, active }: { slug: string; categories: ShopCategory[]; active?: string }) {
  const base = shopHref(slug, "/boutique");
  const chip = (isActive: boolean) =>
    `inline-flex h-9 shrink-0 items-center rounded-full px-4 text-[12.5px] font-medium transition-colors ${isActive ? "bg-shop-ink text-shop-paper" : "border border-shop-line bg-shop-paper text-shop-ink-soft hover:border-shop-accent-soft hover:text-shop-ink"}`;
  return (
    <div className="no-scrollbar -mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0">
      <Link href={base} className={chip(!active)} scroll={false}>
        Tout
      </Link>
      {categories.map((c) => (
        <Link key={c.id} href={`${base}?collection=${c.slug}`} className={chip(active === c.slug)} scroll={false}>
          {c.name}
        </Link>
      ))}
    </div>
  );
}
