import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MailIcon, MessageIcon, PhoneIcon } from "@/components/shop/icons";
import { ContactForm } from "@/components/shop/store/contact-form";
import { shopHref } from "@/components/shop/store/href";
import { REPLY_DELAY_LABEL } from "@/lib/shop/constants";
import { getCurrentUser, getShopBySlug } from "@/lib/shop/server";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage({ params }: PageProps<"/shop/[slug]/contact">) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();
  const user = await getCurrentUser();

  return (
    <section className="shop-container grid gap-10 py-12 md:grid-cols-[1fr_1.5fr] md:gap-16 md:py-20">
      <div className="flex flex-col gap-6">
        <span className="shop-kicker">À ton écoute</span>
        <h1 className="text-4xl md:text-[44px]">Nous écrire</h1>
        <p className="text-[15px] leading-relaxed text-shop-ink-soft">Une question sur un article, une commande en cours, une envie particulière pour un cadeau ? Dis-nous tout, on te répond généralement {REPLY_DELAY_LABEL}.</p>
        <ul className="flex flex-col gap-3 text-sm text-shop-ink">
          {shop.contact_email && (
            <li className="flex items-center gap-3">
              <MailIcon className="size-[18px] text-shop-accent-deep" />
              <a href={`mailto:${shop.contact_email}`} className="hover:text-shop-accent-deep">
                {shop.contact_email}
              </a>
            </li>
          )}
          {shop.contact_phone && (
            <li className="flex items-center gap-3">
              <PhoneIcon className="size-[18px] text-shop-accent-deep" />
              <a href={`tel:${shop.contact_phone.replace(/\s/g, "")}`} className="hover:text-shop-accent-deep">
                {shop.contact_phone}
              </a>
            </li>
          )}
          {shop.instagram_url && (
            <li className="flex items-center gap-3">
              <MessageIcon className="size-[18px] text-shop-accent-deep" />
              <a href={shop.instagram_url} target="_blank" rel="noreferrer" className="hover:text-shop-accent-deep">
                Sur Instagram
              </a>
            </li>
          )}
        </ul>
        <p className="text-xs leading-relaxed text-shop-ink-soft">
          Les réponses les plus fréquentes sont dans la{" "}
          <Link href={shopHref(slug, "/faq")} className="font-medium text-shop-accent-deep underline-offset-2 hover:underline">
            FAQ
          </Link>
          {user && (
            <>
              . Tes échanges sont aussi dans{" "}
              <Link href={shopHref(slug, "/compte/messages")} className="font-medium text-shop-accent-deep underline-offset-2 hover:underline">
                ton espace
              </Link>
            </>
          )}
          .
        </p>
      </div>
      <div className="rounded-[24px] border border-shop-line bg-shop-paper p-6 md:p-8">
        <ContactForm initialEmail={user?.email} initialName={typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null} />
      </div>
    </section>
  );
}
