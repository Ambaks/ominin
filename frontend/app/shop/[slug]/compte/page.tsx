import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRightIcon, MessageIcon, PackageIcon } from "@/components/shop/icons";
import { shopHref } from "@/components/shop/store/href";
import { LoginForm } from "@/components/shop/store/login-form";
import { Alert } from "@/components/shop/store/ui";
import { getCurrentUser, getShopBySlug } from "@/lib/shop/server";
import { SignOutButton } from "./sign-out-button";

export const metadata: Metadata = { title: "Mon compte", robots: { index: false } };

export default async function AccountPage({ params, searchParams }: PageProps<"/shop/[slug]/compte">) {
  const [{ slug }, { next, error }] = await Promise.all([params, searchParams]);
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();
  const user = await getCurrentUser();

  if (!user) {
    return (
      <section className="shop-container py-16 md:py-24">
        <div className="mx-auto flex w-full max-w-md flex-col gap-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="shop-kicker">Ton espace</span>
            <h1 className="text-4xl">Mon compte</h1>
            <p className="text-sm leading-relaxed text-shop-ink-soft">Retrouve tes commandes, tes messages et tes suivis de colis.</p>
          </div>
          {error === "auth" && <Alert tone="error">Ce lien de connexion n&apos;est plus valable. Demande-en un nouveau.</Alert>}
          <div className="rounded-[24px] border border-shop-line bg-shop-paper p-6 md:p-8">
            <LoginForm next={typeof next === "string" ? next : undefined} />
          </div>
          <p className="text-center text-xs text-shop-ink-soft">
            Pas besoin de compte pour commander. Tu peux aussi{" "}
            <Link href={shopHref(slug, "/suivi")} className="font-medium text-shop-accent-deep underline-offset-2 hover:underline">
              suivre une commande
            </Link>{" "}
            avec ton numéro et ton e-mail.
          </p>
        </div>
      </section>
    );
  }

  const cards = [
    { href: shopHref(slug, "/compte/commandes"), icon: PackageIcon, title: "Mes commandes", text: "Historique et suivi" },
    { href: shopHref(slug, "/compte/messages"), icon: MessageIcon, title: "Mes messages", text: "Tes échanges avec nous" },
  ];
  return (
    <section className="shop-container py-12 md:py-20">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <div className="flex flex-col gap-2">
          <span className="shop-kicker">Ton espace</span>
          <h1 className="text-4xl">Bonjour</h1>
          <p className="text-sm text-shop-ink-soft">Connectée avec {user.email}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((card) => (
            <Link key={card.href} href={card.href} className="group flex items-center gap-4 rounded-[20px] border border-shop-line bg-shop-paper p-6 transition hover:border-shop-accent-soft hover:shop-shadow">
              <span className="flex size-12 items-center justify-center rounded-full bg-shop-tint-strong text-shop-accent-deep">
                <card.icon className="size-[22px]" strokeWidth={1.5} />
              </span>
              <span className="flex flex-1 flex-col">
                <span className="font-shop-display text-xl text-shop-ink">{card.title}</span>
                <span className="text-xs text-shop-ink-soft">{card.text}</span>
              </span>
              <ArrowRightIcon className="size-[18px] text-shop-ink-mute transition group-hover:text-shop-accent-deep" />
            </Link>
          ))}
        </div>
        <SignOutButton redirectTo={shopHref(slug)} />
      </div>
    </section>
  );
}
