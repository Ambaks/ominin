import Link from "next/link";
import { DEMO_SLUG } from "@/lib/menu-data";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 py-24 text-center">
      <p className="ember-text font-display text-7xl font-medium">404</p>
      <h1 className="font-display text-2xl">Ce menu n&apos;existe pas</h1>
      <p className="max-w-sm text-sm text-muted">
        Vérifiez le QR code scanné ou demandez de l&apos;aide au personnel du
        restaurant.
      </p>
      <Link
        href={`/m/${DEMO_SLUG}`}
        className="ember-gradient mt-2 rounded-full px-5 py-2.5 text-sm font-semibold text-background"
      >
        Voir le menu de démonstration
      </Link>
    </div>
  );
}
