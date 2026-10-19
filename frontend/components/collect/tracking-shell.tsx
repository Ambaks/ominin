import type { ReactNode } from "react";
import { brandFontVariables } from "@/lib/menu/brand-fonts";
import { restaurantThemeClass } from "@/lib/menu-data";

/*
 * Cadre de la page de suivi à emporter, réelle ou d'aperçu : aux couleurs et
 * aux polices de l'établissement, comme la carte qui y mène — sans quoi le
 * client passait, une fois payé, de la page du restaurant à celle d'Ominin.
 */
export function TrackingShell({
  slug,
  name,
  address,
  phone,
  children,
}: {
  slug: string;
  name: string;
  address: string;
  phone?: string | null;
  children: ReactNode;
}) {
  return (
    <div
      className={`${brandFontVariables} ${restaurantThemeClass(slug) ?? ""} flex min-h-dvh flex-col bg-background text-foreground`}
    >
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-5 py-10">
        <header className="tracking-head">
          <p className="ember-text text-[10px] font-semibold uppercase tracking-[0.28em]">
            Click & collect
          </p>
          <h1 className="mt-1 font-display text-2xl font-medium tracking-tight">
            {name}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {address}
            {phone && ` · ${phone}`}
          </p>
        </header>
        {children}
      </main>
    </div>
  );
}
