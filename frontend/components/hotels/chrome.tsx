import Image from "next/image";
import Link from "next/link";
import { KitFaq } from "@/components/landing-kit/faq";
import { KitNav } from "@/components/landing-kit/nav";
import { Reveal } from "@/components/landing-kit/reveal";
import { contactEmail } from "@/lib/landing-data";
import { demoCta, faqSection, finalCta, footer, hotelsBrand, nav, objective } from "@/lib/hotels-landing-data";
import { editor, LEGAL_LINKS } from "@/lib/legal/constants";
import { menuSiteUrl } from "@/lib/site";
import { Accent, Photo } from "./ui";

/* Barre, appel final, FAQ et pied de page d'Ominin Hôtels, sur le kit des landings. */

export function HotelsNav() {
  return (
    <KitNav
      // Au téléphone, la pilule n'a pas la place du nom entier : le produit seul.
      wordmark={
        <span className="ember-text font-display text-base font-semibold max-[359px]:hidden sm:text-lg">
          <span className="sm:hidden">{hotelsBrand.split(" ").at(-1)}</span>
          <span className="hidden sm:inline">{hotelsBrand}</span>
        </span>
      }
      links={nav.links}
      // L'espace de gestion est celui du menu : l'équipe de l'hôtel s'y connecte.
      login={{ label: nav.login.label, href: `${menuSiteUrl}${nav.login.href}` }}
      cta={demoCta}
      glass
      linksFrom="lg"
    />
  );
}

/** Notre objectif, la phrase de clôture de la proposition Plage Palace. */
export function HotelsObjective() {
  return (
    <section className="px-4 py-20 sm:px-6 sm:py-28 lg:px-10">
      <Reveal className="mx-auto max-w-4xl text-center">
        <span aria-hidden className="hotels-sun" />
        <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.32em] text-ember-1">{objective.eyebrow}</p>
        <p className="kit-display mt-6 text-balance text-4xl sm:text-5xl lg:text-6xl">
          <Accent text={objective.quote} />
        </p>
        <span aria-hidden className="mx-auto mt-10 block h-px w-16 bg-hairline" />
        <p className="kit-display hotels-italic mx-auto mt-8 max-w-xl text-balance text-2xl">{objective.signature}</p>
      </Reveal>
    </section>
  );
}

/** Appel final : l'horizon de la proposition Plage Palace en plein cadre, l'appel dans un cadre de verre. */
export function HotelsFinalCta() {
  return (
    <section id={finalCta.id} className="hotels-night relative scroll-mt-20 overflow-hidden px-4 py-24 sm:px-6 sm:py-36 lg:px-10">
      <div className="hotels-fade-y absolute inset-0 -z-10" aria-hidden>
        <Photo name="horizon" sizes="100vw" className="object-cover object-[70%_50%]" />
      </div>
      {/* À gauche sur ordinateur : le soleil reste visible à droite du verre. */}
      <Reveal className="g-glass g-glass-hero mx-auto w-full max-w-2xl p-g-pad lg:ml-[max(0px,calc((100%-72rem)/2+2.5rem))]">
        <div className="kit-glass-inner g-plate px-6 py-14 text-center sm:px-12 lg:py-20">
          <h2 className="kit-display mx-auto max-w-3xl text-balance text-5xl sm:text-6xl"><Accent text={finalCta.title} /></h2>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-foreground/80 lg:text-lg">{finalCta.subtitle}</p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a href={demoCta.href} className="ember-gradient rounded-full px-8 py-4 text-sm font-bold text-background transition-transform hover:scale-[1.03] lg:text-base">
              {demoCta.label}
            </a>
            <a href={`mailto:${contactEmail}`} className="g-glass g-glass-pill px-8 py-4 text-sm font-semibold lg:text-base">
              {finalCta.contactLabel}
            </a>
          </div>
          <ul className="mt-9 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs font-semibold text-foreground/70">
            {finalCta.microcopy.map((line) => (
              <li key={line} className="flex items-center gap-2">
                <span aria-hidden className="h-px w-4 bg-ember-1" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}

export function HotelsFaq() {
  return <KitFaq id={faqSection.id} eyebrow={faqSection.eyebrow} title={faqSection.title} items={faqSection.items} glass />;
}

export function HotelsFooter() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-5 py-10 text-center lg:max-w-5xl lg:px-10 lg:py-14">
        <p className="flex items-center gap-2 ember-text font-display text-lg font-semibold">
          <Image src="/logo.png" alt="" width={28} height={28} />
          {hotelsBrand}
        </p>
        <p className="max-w-sm text-xs leading-relaxed text-faint">{footer.tagline}</p>
        <nav className="flex flex-wrap justify-center gap-4 text-xs text-muted">
          {nav.links.map((link) => (
            <a key={link.href} href={link.href} className="transition-colors hover:text-foreground">
              {link.label}
            </a>
          ))}
        </nav>
        <nav aria-label="Documents légaux" className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-[11px] text-faint">
          {LEGAL_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-muted">
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="text-xs text-muted">
          © 2026 Ominin, entreprise française
          {editor.siren && ` · SIREN ${editor.siren}`}
        </p>
      </div>
    </footer>
  );
}
