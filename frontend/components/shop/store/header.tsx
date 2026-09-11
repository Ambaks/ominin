"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/shop/cart";
import { BagIcon, CloseIcon, HeartIcon, MenuIcon, UserIcon } from "../icons";
import { useShop } from "./context";
import { shopHref } from "./href";

/*
 * En-tête du site d'une boutique : bandeau d'annonce, logo, navigation,
 * compte et panier. Tous les liens sont préfixés par le slug de la boutique.
 */

function navLinks(slug: string, catalogLabel: string) {
  return [
    { href: shopHref(slug), label: "Accueil", exact: true },
    { href: shopHref(slug, "/boutique"), label: catalogLabel },
    { href: shopHref(slug, "/offrir"), label: "Offrir" },
    { href: shopHref(slug, "/a-propos"), label: "À propos" },
    { href: shopHref(slug, "/faq"), label: "FAQ" },
    { href: shopHref(slug, "/contact"), label: "Contact" },
  ];
}

export function Wordmark({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "text-[22px]", md: "text-[26px] md:text-[30px]", lg: "text-[40px]" };
  return (
    <span className={`inline-flex items-baseline gap-1.5 font-shop-display leading-none text-shop-accent-deep ${sizes[size]}`}>
      <span className="font-semibold">{name}</span>
      <HeartIcon className="size-3.5 text-shop-accent" strokeWidth={1.8} />
    </span>
  );
}

function NavLinks({ vertical, onNavigate }: { vertical?: boolean; onNavigate?: () => void }) {
  const { slug, catalogLabel } = useShop();
  const pathname = usePathname();
  return (
    <nav className={vertical ? "flex flex-col gap-1" : "flex items-center gap-9"} aria-label="Navigation principale">
      {navLinks(slug, catalogLabel).map((link) => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={
              vertical
                ? `rounded-xl px-4 py-3 font-shop-display text-2xl transition ${active ? "bg-shop-tint text-shop-accent-deep" : "text-shop-ink hover:bg-shop-tint"}`
                : `border-b-[1.5px] pb-1 text-[13.5px] font-medium transition-colors ${active ? "border-shop-accent text-shop-ink" : "border-transparent text-shop-ink-soft hover:text-shop-ink"}`
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

function MobileMenu() {
  const { slug, name } = useShop();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Ouvrir le menu" className="inline-flex size-10 items-center justify-center rounded-full text-shop-ink transition hover:bg-shop-tint lg:hidden">
        <MenuIcon className="size-6" strokeWidth={1.5} />
      </button>
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === ref.current) setOpen(false);
        }}
        className="m-0 h-full max-h-none w-[86%] max-w-sm bg-transparent p-0 backdrop:bg-shop-accent-deep/40 backdrop:backdrop-blur-[2px]"
      >
        <div className="flex h-full flex-col bg-shop-bg p-5 shop-shadow-hover">
          <div className="flex items-center justify-between">
            <Wordmark name={name} size="sm" />
            <button type="button" onClick={() => setOpen(false)} aria-label="Fermer le menu" className="inline-flex size-10 items-center justify-center rounded-full text-shop-ink hover:bg-shop-tint">
              <CloseIcon className="size-[22px]" strokeWidth={1.5} />
            </button>
          </div>
          <div className="mt-8">
            <NavLinks vertical onNavigate={() => setOpen(false)} />
          </div>
          <div className="mt-auto border-t border-shop-line-soft pt-5">
            <Link href={shopHref(slug, "/compte")} onClick={() => setOpen(false)} className="inline-flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-shop-ink hover:bg-shop-tint">
              <UserIcon className="size-[18px]" strokeWidth={1.5} /> Mon compte
            </Link>
          </div>
        </div>
      </dialog>
    </>
  );
}

function CartBadge() {
  const { slug } = useShop();
  const { count } = useCart();
  return (
    <Link href={shopHref(slug, "/panier")} aria-label={count > 0 ? `Panier, ${count} article${count > 1 ? "s" : ""}` : "Panier"} className="relative inline-flex size-10 items-center justify-center rounded-full text-shop-ink transition hover:bg-shop-tint">
      <BagIcon className="size-[22px]" strokeWidth={1.5} />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-shop-accent px-1 text-[10px] font-semibold text-shop-paper">{count}</span>
      )}
    </Link>
  );
}

export function ShopHeader({ announcement }: { announcement: string | null }) {
  const { slug, name } = useShop();
  return (
    <>
      {announcement && (
        <div className="flex min-h-9 items-center justify-center gap-2 bg-shop-accent px-4 py-1.5 text-center text-[11.5px] font-medium leading-snug tracking-[0.04em] text-shop-paper md:min-h-10 md:text-xs md:tracking-[0.06em]">
          <HeartIcon className="hidden size-3.5 shrink-0 sm:block" strokeWidth={1.8} />
          <span className="line-clamp-2 md:line-clamp-1">{announcement}</span>
        </div>
      )}
      <header className="sticky top-0 z-40 border-b border-shop-line-soft bg-shop-bg/90 backdrop-blur-md">
        <div className="shop-container grid h-16 grid-cols-[1fr_auto_1fr] items-center md:h-[88px]">
          <div className="flex items-center">
            <MobileMenu />
            <Link href={shopHref(slug)} aria-label={`${name}, retour à l'accueil`} className="hidden lg:inline-flex">
              <Wordmark name={name} />
            </Link>
          </div>
          <div className="flex items-center justify-center">
            <Link href={shopHref(slug)} aria-label={`${name}, retour à l'accueil`} className="lg:hidden">
              <Wordmark name={name} />
            </Link>
            <div className="hidden lg:block">
              <NavLinks />
            </div>
          </div>
          <div className="flex items-center justify-end gap-1 md:gap-2">
            <Link href={shopHref(slug, "/compte")} aria-label="Mon compte" className="hidden size-10 items-center justify-center rounded-full text-shop-ink transition hover:bg-shop-tint md:inline-flex">
              <UserIcon className="size-[22px]" strokeWidth={1.5} />
            </Link>
            <CartBadge />
          </div>
        </div>
      </header>
    </>
  );
}
