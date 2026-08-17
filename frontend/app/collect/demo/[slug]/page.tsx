import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CollectDemoStage } from "@/components/collect/demo/stage";
import { CollectWordmark } from "@/components/collect/landing/wordmark";
import { getRestaurant, restaurantThemeClass } from "@/lib/menu-data";

/*
 * Démo Collect personnalisée par prospect (visites commerciales) : la même
 * scène jouable que /collect/demo, habillée aux couleurs du restaurant
 * (classe demo-theme-<slug>, voir globals.css) et jouée sur sa carte.
 * Variante dual : la démo se montre sur un laptop face au client ; sous lg
 * les deux volets s'empilent. Données fictives : jamais indexée.
 */

export async function generateMetadata({
  params,
}: PageProps<"/collect/demo/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = getRestaurant(slug);
  if (!restaurant) notFound();
  return {
    title: `Démo ${restaurant.name} — Ominin Collect`,
    robots: { index: false, follow: false },
  };
}

export default async function ClientDemoPage({
  params,
}: PageProps<"/collect/demo/[slug]">) {
  const { slug } = await params;
  const restaurant = getRestaurant(slug);
  if (!restaurant) notFound();

  return (
    <div
      className={`${restaurantThemeClass(slug) ?? ""} flex min-h-dvh flex-col bg-background text-foreground`}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-5 py-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-2xl font-medium leading-tight">
              {restaurant.name}
            </p>
            <p className="text-xs text-muted">{restaurant.tagline}</p>
          </div>
          <span className="rounded-full border border-hairline bg-surface px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
            Démo
          </span>
        </header>

        <div className="my-auto">
          <CollectDemoStage variant="dual" slug={slug} />
        </div>

        <footer className="flex items-center justify-center gap-2 text-xs text-faint">
          Propulsé par
          <span className="flex items-center gap-1.5">
            <Image src="/logo.png" alt="" width={16} height={16} />
            <CollectWordmark className="text-sm" />
          </span>
        </footer>
      </div>
    </div>
  );
}
