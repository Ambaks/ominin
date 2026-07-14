import Image from "next/image";
import { footer, nav } from "@/lib/clip-landing-data";
import { ClipWordmark } from "./wordmark";

export function ClipFooter() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-5 py-10 text-center lg:max-w-5xl lg:px-10 lg:py-14">
        <p className="flex items-center gap-2">
          <Image src="/logo.png" alt="" width={28} height={28} />
          <ClipWordmark />
        </p>

        <p className="max-w-sm text-xs leading-relaxed text-faint">
          {footer.tagline}
        </p>

        <nav className="flex flex-wrap justify-center gap-4 text-xs text-muted">
          {nav.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <p className="text-xs text-faint">© 2026 Ominin</p>
      </div>
    </footer>
  );
}
