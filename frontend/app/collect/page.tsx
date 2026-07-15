import type { Metadata } from "next";
import { brand, contactEmail } from "@/lib/landing-data";

export const metadata: Metadata = {
  title: `${brand} — Click & collect`,
  description:
    "Commandez à emporter auprès des restaurants partenaires Ominin.",
};

/*
 * Racine du sous-domaine collect : aucun établissement dans l'URL. Chaque
 * restaurant diffuse son propre lien (/son-slug) — cette page ne sert que de
 * point de chute.
 */
export default function CollectHome() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-5 text-center">
      <p className="ember-text text-[10px] font-semibold uppercase tracking-[0.28em]">
        {brand} · Click & collect
      </p>
      <h1 className="max-w-md font-display text-3xl font-medium tracking-tight">
        Commandez à emporter, directement auprès de votre restaurant.
      </h1>
      <p className="max-w-sm text-sm leading-relaxed text-muted">
        Chaque établissement partenaire dispose de sa propre page de
        commande — utilisez le lien qu&apos;il vous a communiqué.
      </p>
      <a
        href={`mailto:${contactEmail}`}
        className="text-sm font-semibold text-ember-1 transition-opacity hover:opacity-80"
      >
        Vous êtes restaurateur ? Contactez-nous
      </a>
    </div>
  );
}
