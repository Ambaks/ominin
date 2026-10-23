import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/site-nav";
import { contact, legal } from "@/lib/content";

export const metadata: Metadata = { title: "Mentions légales — FLG Aérogommage" };

const link = "text-fg underline decoration-accent underline-offset-4";

export default function MentionsLegales() {
  return (
    <main className="shell flex min-h-svh flex-col gap-16 py-10">
      <Link href="/" aria-label="FLG Aérogommage, accueil">
        <Logo />
      </Link>
      <div className="max-w-2xl">
        <h1 className="display display-l">Mentions légales</h1>
        <dl className="mt-12 border-t border-line">
          <div className="border-b border-line py-8">
            <dt className="label text-accent-text">Éditeur du site</dt>
            <dd className="lead mt-4 text-muted">
              {legal.company}
              <br />
              {legal.registration}
              <br />
              {legal.vat}
              <br />
              {legal.address}
              <br />
              <a href={contact.phoneHref} className={`whitespace-nowrap ${link}`}>
                {contact.phone}
              </a>
              {" · "}
              <a href={`mailto:${contact.email}`} className={link}>
                {contact.email}
              </a>
            </dd>
          </div>
          <div className="border-b border-line py-8">
            <dt className="label text-accent-text">Représentant légal</dt>
            <dd className="lead mt-4 text-muted">{legal.representative}</dd>
          </div>
          <div className="border-b border-line py-8">
            <dt className="label text-accent-text">Hébergement</dt>
            <dd className="lead mt-4 text-muted">
              Vercel Inc.
              <br />
              440 N Barranca Ave #4133, Covina, CA 91723, États-Unis
            </dd>
          </div>
        </dl>
      </div>
    </main>
  );
}
