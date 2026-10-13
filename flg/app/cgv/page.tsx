import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/site-nav";
import { contact } from "@/lib/content";

export const metadata: Metadata = { title: "Conditions générales de vente — FLG Aérogommage" };

export default function Cgv() {
  return (
    <main className="shell flex min-h-svh flex-col gap-16 py-10">
      <Link href="/" aria-label="FLG Aérogommage, accueil">
        <Logo />
      </Link>
      <div className="max-w-2xl">
        <h1 className="display display-l">Conditions générales de vente</h1>
        <p className="lead mt-8 text-muted">
          Nos conditions générales de vente vous sont remises avec chaque devis. Pour les recevoir dès maintenant,
          appelez-nous au{" "}
          <a href={contact.phoneHref} className="whitespace-nowrap text-fg underline decoration-accent underline-offset-4">
            {contact.phone}
          </a>
          .
        </p>
      </div>
    </main>
  );
}
