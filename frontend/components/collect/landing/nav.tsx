import Image from "next/image";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { nav } from "@/lib/collect-landing-data";
import { CollectWordmark } from "./wordmark";

export function CollectNav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-hairline bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-5 py-3 lg:max-w-5xl lg:px-10">
        <a href="#" className="flex items-center gap-2">
          <Image src="/logo.png" alt="" width={28} height={28} />
          <CollectWordmark />
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {nav.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a
            href={nav.cta.href}
            className="ember-gradient rounded-full px-4 py-2 text-xs font-semibold text-background lg:px-5 lg:py-2.5 lg:text-sm"
          >
            {nav.cta.label}
          </a>
        </div>
      </div>
    </nav>
  );
}
