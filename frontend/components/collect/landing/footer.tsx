import Image from "next/image";
import Link from "next/link";
import { finalCta, footer, nav } from "@/lib/collect-landing-data";
import { editor, LEGAL_LINKS } from "@/lib/legal/constants";
import { CollectWordmark } from "./wordmark";

export function CollectFooter() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-5 py-10 text-center lg:max-w-5xl lg:px-10 lg:py-14">
        <p className="flex items-center gap-2">
          <Image src="/logo.png" alt="" width={28} height={28} />
          <CollectWordmark />
        </p>

        <p className="max-w-sm text-xs leading-relaxed text-faint">
          {footer.tagline}
        </p>

        <p className="max-w-sm text-xs leading-relaxed text-muted">
          {footer.customerNotice}
        </p>

        <nav className="flex flex-wrap justify-center gap-4 text-xs text-muted">
          {[...nav.links, nav.login].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <nav
          aria-label="Documents légaux"
          className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-muted"
        >
          {LEGAL_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-muted"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Qui est derrière : l'identité publiée dans les mentions légales. */}
        <p className="text-xs text-muted">
          © 2026 {finalCta.identity}
          {editor.siren && ` · SIREN ${editor.siren}`}
        </p>
      </div>
    </footer>
  );
}
