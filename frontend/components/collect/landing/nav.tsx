import Image from "next/image";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { nav, signupCta } from "@/lib/collect-landing-data";
import { CollectWordmark } from "./wordmark";

export function CollectNav() {
  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-hairline bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
          <a href="#" className="flex min-w-0 items-center gap-2 whitespace-nowrap">
            <Image src="/logo.png" alt="" width={26} height={26} />
            <CollectWordmark className="text-base sm:text-lg" />
          </a>

          <div className="hidden items-center gap-1 rounded-full border border-hairline bg-surface/60 p-1 md:flex">
            {nav.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full px-3.5 py-1.5 text-sm text-muted transition-colors hover:bg-surface-raised hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            <a
              href={nav.login.href}
              className="hidden whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold text-muted transition-colors hover:text-foreground sm:inline-block"
            >
              {nav.login.label}
            </a>
            <a
              href={signupCta.href}
              className="ember-gradient whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold text-background transition-transform hover:scale-[1.03] sm:text-sm"
            >
              {signupCta.label}
            </a>
          </div>
        </div>
      </nav>
      {/* Téléphone : les sections en une rangée sous la barre, qui défile
          avec la page. */}
      <div className="flex gap-1 overflow-x-auto border-b border-hairline px-4 py-2 [scrollbar-width:none] md:hidden">
        {nav.links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="shrink-0 rounded-full border border-hairline px-3 py-1 text-xs font-semibold text-muted"
          >
            {link.label}
          </a>
        ))}
      </div>
    </>
  );
}
