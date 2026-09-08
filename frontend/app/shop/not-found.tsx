import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";

export default function ShopNotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <Wordmark suffix="Shop" className="text-2xl" />
      <h1 className="font-display text-3xl font-medium">Cette page n&apos;existe pas</h1>
      <p className="max-w-md text-sm leading-relaxed text-muted">La boutique ou la page demandée est introuvable. Vérifiez le lien communiqué par la marque.</p>
      <Link href="/" className="ember-gradient rounded-full px-6 py-3 text-sm font-semibold text-background">
        Découvrir Ominin Shop
      </Link>
    </main>
  );
}
