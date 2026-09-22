import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { nav } from "@/lib/agents-landing-data";
import { AgentsWordmark } from "./wordmark";

export function AgentsNav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-hairline bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-5 py-3 lg:max-w-5xl lg:px-10">
        <a href="#" className="flex items-center gap-2">
          <Image src="/logo.png" alt="" width={28} height={28} />
          <AgentsWordmark />
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
          <Link
            href={nav.login.href}
            className="rounded-full border border-hairline px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:border-ember-2/40 lg:px-5 lg:py-2.5 lg:text-sm"
          >
            {nav.login.label}
          </Link>
          <Link
            href={nav.cta.href}
            className="ember-gradient hidden rounded-full px-4 py-2 text-xs font-semibold text-background sm:inline-block lg:px-5 lg:py-2.5 lg:text-sm"
          >
            {nav.cta.label}
          </Link>
        </div>
      </div>
    </nav>
  );
}
