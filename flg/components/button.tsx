import Link from "next/link";

type Variant = "primary" | "secondary";

const base =
  "group/btn relative inline-flex items-center gap-4 overflow-hidden px-7 py-4 text-[0.78rem] font-semibold uppercase tracking-[0.14em] [font-stretch:115%] transition-colors duration-500 ease-out";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:text-bg",
  secondary: "border border-line text-fg hover:border-fg hover:text-bg",
};

export const buttonClass = (variant: Variant = "primary") => `${base} ${variants[variant]}`;

/*
 * Au survol, un aplat de la couleur du texte monte depuis le bas et le libellé
 * s'inverse : le geste d'un rouleau, sans rebond.
 */
export function Button({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <Link href={href} className={`${buttonClass(variant)} ${className ?? ""}`}>
      <span
        aria-hidden
        className="absolute inset-0 translate-y-full bg-fg transition-transform duration-500 ease-out group-hover/btn:translate-y-0"
      />
      <span className="relative">{children}</span>
      <Arrow className="relative transition-transform duration-500 ease-out group-hover/btn:translate-x-1" />
    </Link>
  );
}

export function TextLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={`group/link label inline-flex items-center gap-3 text-fg ${className ?? ""}`}>
      <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-1 transition-[background-size] duration-500 ease-out group-hover/link:bg-[length:100%_1px]">
        {children}
      </span>
      <Arrow className="transition-transform duration-500 ease-out group-hover/link:translate-x-1" />
    </Link>
  );
}

export function Arrow({ className }: { className?: string }) {
  return (
    <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden className={className}>
      <path d="M0 5h16.5M12.5 1l4 4-4 4" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
