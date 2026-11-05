import Image from "next/image";
import Link from "next/link";
import { KitFaq } from "@/components/landing-kit/faq";
import { KitFinalCta } from "@/components/landing-kit/final-cta";
import { KitNav } from "@/components/landing-kit/nav";
import { contactEmail } from "@/lib/landing-data";
import { demoCta, faqSection, finalCta, footer, hotelsBrand, nav } from "@/lib/hotels-landing-data";
import { editor, LEGAL_LINKS } from "@/lib/legal/constants";
import { menuSiteUrl } from "@/lib/site";

/* Barre, appel final, FAQ et pied de page d'Ominin Hôtels, sur le kit des landings. */

export function HotelsNav() {
  return (
    <KitNav
      // Au téléphone, la pilule n'a pas la place du nom entier : le produit seul.
      wordmark={
        <span className="ember-text font-display text-base font-semibold sm:text-lg">
          <span className="sm:hidden">{hotelsBrand.split(" ").at(-1)}</span>
          <span className="hidden sm:inline">{hotelsBrand}</span>
        </span>
      }
      links={nav.links}
      // L'espace de gestion est celui du menu : l'équipe de l'hôtel s'y connecte.
      login={{ label: nav.login.label, href: `${menuSiteUrl}${nav.login.href}` }}
      cta={demoCta}
      glass
    />
  );
}

export function HotelsFinalCta() {
  return (
    <KitFinalCta
      id={finalCta.id}
      title={finalCta.title}
      subtitle={finalCta.subtitle}
      primary={demoCta}
      secondary={{ label: finalCta.contactLabel, href: `mailto:${contactEmail}` }}
      microcopy={finalCta.microcopy}
      glass
    />
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
