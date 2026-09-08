import Link from "next/link";
import type { Shop } from "@/lib/shop/types";
import { LockIcon } from "../icons";
import { shopHref } from "./href";
import { Wordmark } from "./header";
import { NewsletterForm } from "./newsletter-form";

export function ShopFooter({ shop, showNewsletter = true }: { shop: Shop; showNewsletter?: boolean }) {
  const base = (path: string) => shopHref(shop.slug, path);
  const columns = [
    {
      title: "Boutique",
      links: [
        { href: base("/boutique"), label: shop.catalog_label },
        { href: base("/offrir"), label: "Offrir" },
        { href: base("/suivi"), label: "Suivre ma commande" },
        { href: base("/compte"), label: "Mon compte" },
      ],
    },
    {
      title: "Aide",
      links: [
        { href: base("/faq"), label: "Questions fréquentes" },
        { href: base("/livraison-retours"), label: "Livraison et retours" },
        { href: base("/contact"), label: "Nous écrire" },
        { href: base("/a-propos"), label: "À propos" },
      ],
    },
    {
      title: "Informations",
      links: [
        { href: base("/cgv"), label: "Conditions générales de vente" },
        { href: base("/mentions-legales"), label: "Mentions légales" },
        { href: base("/confidentialite"), label: "Politique de confidentialité" },
      ],
    },
  ];
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-shop-line-soft bg-shop-paper">
      {showNewsletter && (
        <div className="shop-container py-14 md:py-20">
          <NewsletterForm />
        </div>
      )}
      <div className="shop-container flex flex-col gap-12 border-t border-shop-line-soft py-12 md:py-16">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr_1fr] md:gap-12">
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              {shop.logo_url && <img src={shop.logo_url} alt="" width={64} height={64} className="size-16 rounded-full object-cover" />}
              <div className="flex flex-col gap-1.5">
                <Wordmark name={shop.name} size="sm" />
                {shop.tagline && <span className="shop-label text-[10px] text-shop-ink-soft">{shop.tagline}</span>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-5 text-[13px] font-medium text-shop-accent-deep">
              {shop.instagram_url && (
                <a href={shop.instagram_url} target="_blank" rel="noreferrer" className="hover:text-shop-accent">
                  Instagram
                </a>
              )}
              {shop.tiktok_url && (
                <a href={shop.tiktok_url} target="_blank" rel="noreferrer" className="hover:text-shop-accent">
                  TikTok
                </a>
              )}
              {shop.contact_email && (
                <a href={`mailto:${shop.contact_email}`} className="hover:text-shop-accent">
                  {shop.contact_email}
                </a>
              )}
            </div>
          </div>
          {columns.map((col) => (
            <div key={col.title} className="flex flex-col gap-3.5">
              <span className="shop-label text-shop-ink">{col.title}</span>
              {col.links.map((link) => (
                <Link key={link.href} href={link.href} className="text-sm text-shop-ink-soft transition hover:text-shop-accent-deep">
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3 border-t border-shop-line-soft pt-6 text-xs text-shop-ink-soft md:flex-row md:items-center md:justify-between">
          <span>
            © {year} {shop.name} · Boutique propulsée par{" "}
            <a href="https://ominin.com" className="font-medium text-shop-accent-deep hover:underline">
              Ominin Shop
            </a>
          </span>
          <span className="inline-flex items-center gap-2">
            <LockIcon className="size-3.5" />
            Paiement sécurisé par Stripe · Visa, Mastercard, Apple Pay, Google Pay
          </span>
        </div>
      </div>
    </footer>
  );
}
