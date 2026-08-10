"use client";

import Link from "next/link";
import { ContactForm } from "@/components/portal/contact-form";
import { useLanguage } from "@/lib/portal/language";
import { surMesure } from "@/lib/portal-data";

/*
 * Corps de la page /sur-mesure. Client comme le reste du portail : tout son
 * texte passe par la langue courante.
 */
export function SurMesure() {
  const { t } = useLanguage();

  return (
    <main className="relative overflow-hidden">
      <div
        className="grid-motif pointer-events-none absolute inset-x-0 top-0 h-64 opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-2xl px-5 pt-16 pb-24 lg:max-w-5xl lg:px-10 lg:pt-24 lg:pb-32">
        <p className="rise text-xs font-semibold uppercase tracking-[0.2em] text-ember-2">
          {t(surMesure.eyebrow)}
        </p>

        <h1 className="rise mt-6 max-w-3xl font-display text-4xl leading-[1.1] font-semibold text-balance sm:text-5xl [animation-delay:60ms]">
          {t(surMesure.title)}
        </h1>

        <p className="rise mt-7 max-w-2xl text-base leading-relaxed text-muted lg:text-lg [animation-delay:120ms]">
          {t(surMesure.body)}
        </p>

        <section className="mt-16 lg:mt-20">
          <div className="mb-8 flex items-center gap-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-faint">
              {t(surMesure.examples.heading)}
            </h2>
            <span className="h-px flex-1 bg-hairline" aria-hidden />
          </div>

          <ul className="grid gap-5 sm:grid-cols-3">
            {surMesure.examples.items.map((item, index) => (
              <li
                key={item.title.fr}
                className="rise rounded-2xl border border-hairline bg-surface p-6"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <h3 className="font-display text-lg font-semibold">
                  {t(item.title)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {t(item.body)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section id="formulaire" className="mt-16 lg:mt-20">
          <div className="mb-8 flex items-center gap-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-faint">
              {t(surMesure.form.heading)}
            </h2>
            <span className="h-px flex-1 bg-hairline" aria-hidden />
          </div>

          <div className="mx-auto max-w-2xl">
            <ContactForm />
            <p className="mt-6 text-center text-xs text-muted">
              <Link href="/" className="transition-colors hover:text-foreground">
                ← {t(surMesure.form.back)}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
