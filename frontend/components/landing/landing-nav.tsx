import Image from "next/image";
import Link from "next/link";
import { brand, nav } from "@/lib/landing-data";

export function LandingNav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-hairline bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-5 py-3 lg:max-w-5xl lg:px-10">
        <a
          href="#"
          className="flex items-center gap-2 ember-text font-display text-lg font-semibold"
        >
          <Image src="/logo.png" alt="" width={28} height={28} />
          {brand}
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

        <Link
          href={nav.cta.href}
          className="ember-gradient rounded-full px-4 py-2 text-xs font-semibold text-background lg:px-5 lg:py-2.5 lg:text-sm"
        >
          {nav.cta.label}
        </Link>
      </div>
    </nav>
  );
}
