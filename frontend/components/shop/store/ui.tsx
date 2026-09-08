import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { BADGE_LABELS, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/shop/constants";
import { formatPrice } from "@/lib/shop/format";
import type { ShopOrderStatus, ShopPaymentStatus, ShopProductBadge } from "@/lib/shop/types";
import { AlertIcon, CheckCircleIcon, HeartIcon, InfoIcon } from "../icons";

/* Briques visuelles du site public d'une boutique (thème via les jetons shop-*). */

const join = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

export type ButtonVariant = "primary" | "secondary" | "soft" | "ghost" | "dark" | "outline" | "onAccent" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-shop-accent text-shop-paper shop-shadow hover:bg-shop-accent-strong",
  secondary: "border-[1.5px] border-shop-accent text-shop-accent-deep hover:bg-shop-tint",
  soft: "bg-shop-tint-strong text-shop-accent-deep hover:bg-shop-accent-soft/60",
  ghost: "text-shop-accent-deep hover:bg-shop-tint",
  dark: "bg-shop-ink text-shop-paper hover:bg-shop-accent-deep",
  outline: "border border-shop-line bg-shop-paper text-shop-ink hover:border-shop-accent-soft hover:bg-shop-bg",
  // Posé sur un aplat d'accent (bandeau « Offrir ») : surcharger primary par
  // une classe de couleur ne suffirait pas, l'ordre du CSS trancherait.
  onAccent: "bg-shop-paper text-shop-accent-deep hover:bg-shop-tint",
  danger: "bg-shop-error text-white hover:opacity-90",
};
const SIZES: Record<ButtonSize, string> = {
  sm: "h-10 px-5 text-[11.5px]",
  md: "h-12 px-7 text-[12.5px]",
  lg: "h-[54px] px-8 text-[13px]",
};

export function buttonClass(options: { variant?: ButtonVariant; size?: ButtonSize; plain?: boolean; className?: string } = {}) {
  const { variant = "primary", size = "md", plain, className } = options;
  return join(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60",
    plain ? "text-sm tracking-normal" : "uppercase tracking-[0.14em]",
    VARIANTS[variant],
    SIZES[size],
    className
  );
}

export function Button({
  variant,
  size,
  plain,
  className,
  loading,
  children,
  disabled,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize; plain?: boolean; loading?: boolean }) {
  return (
    <button className={buttonClass({ variant, size, plain, className })} disabled={disabled || loading} {...props}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  plain,
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize; plain?: boolean; children: ReactNode }) {
  return (
    <Link className={buttonClass({ variant, size, plain, className })} {...props}>
      {children}
    </Link>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span aria-hidden className={join("inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent", className)} />;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string | null;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={join("flex flex-col gap-2", className)}>
      <label htmlFor={htmlFor} className={join("text-[13px] font-medium", error ? "text-shop-error" : "text-shop-ink-soft")}>
        {label}
        {optional && <span className="ml-1 font-normal text-shop-ink-mute">· optionnel</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-shop-error" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-shop-ink-soft">{hint}</p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={join("shop-input h-12", className)} {...props} />;
}
export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={join("shop-input min-h-28 leading-relaxed", className)} {...props} />;
}
export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={join("shop-input h-12 appearance-none pr-11", className)} {...props}>
        {children}
      </select>
      <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-shop-ink-soft" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

export function Checkbox({ label, id, className, ...props }: Omit<ComponentProps<"input">, "type"> & { label: ReactNode }) {
  return (
    <label htmlFor={id} className={join("flex cursor-pointer items-start gap-3 text-sm text-shop-ink", className)}>
      <span className="relative mt-0.5 flex size-5 shrink-0">
        <input id={id} type="checkbox" className="peer size-5 cursor-pointer appearance-none rounded-md border-[1.5px] border-shop-ink-faint bg-shop-paper transition checked:border-shop-accent checked:bg-shop-accent" {...props} />
        <svg viewBox="0 0 24 24" className="pointer-events-none absolute inset-0 m-auto size-3.5 opacity-0 transition peer-checked:opacity-100" fill="none" stroke="var(--shop-paper)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m5 12 4.5 4.5L19 7" />
        </svg>
      </span>
      <span className="leading-snug">{label}</span>
    </label>
  );
}

type BadgeTone = "gold" | "accent" | "deep" | "neutral";
const BADGE_TONES: Record<BadgeTone, string> = {
  gold: "bg-shop-cream text-shop-gold",
  accent: "bg-shop-tint-strong text-shop-accent-deep",
  deep: "bg-shop-accent text-shop-paper",
  neutral: "bg-shop-neutral-soft text-shop-neutral",
};
export function Badge({ tone = "accent", className, children }: { tone?: BadgeTone; className?: string; children: ReactNode }) {
  return <span className={join("inline-flex h-[26px] items-center rounded-full px-3 text-[11px] font-semibold uppercase tracking-[0.1em]", BADGE_TONES[tone], className)}>{children}</span>;
}
const PRODUCT_BADGE_TONE: Record<ShopProductBadge, BadgeTone> = { "best-seller": "gold", nouveau: "accent", "coup-de-coeur": "deep" };
export function ProductBadge({ badge, className }: { badge: ShopProductBadge | null; className?: string }) {
  return badge ? <Badge tone={PRODUCT_BADGE_TONE[badge]} className={className}>{BADGE_LABELS[badge]}</Badge> : null;
}

const STATUS_STYLES: Record<ShopOrderStatus, string> = {
  pending: "bg-shop-neutral-soft text-shop-neutral",
  paid: "bg-shop-tint-strong text-shop-accent-deep",
  preparing: "bg-shop-warn-soft text-shop-warn",
  shipped: "bg-shop-info-soft text-shop-info",
  delivered: "bg-shop-ok-soft text-shop-ok",
  cancelled: "bg-shop-neutral-soft text-shop-neutral",
  refunded: "bg-shop-error-soft text-shop-error",
};
export function StatusPill({ status, className }: { status: ShopOrderStatus; className?: string }) {
  return (
    <span className={join("inline-flex h-7 items-center gap-2 whitespace-nowrap rounded-full px-3 text-xs font-semibold", STATUS_STYLES[status], className)}>
      <span className="size-[7px] rounded-full bg-current" aria-hidden />
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
const PAYMENT_STYLES: Record<ShopPaymentStatus, string> = {
  unpaid: "bg-shop-neutral-soft text-shop-neutral",
  paid: "bg-shop-ok-soft text-shop-ok",
  refunded: "bg-shop-error-soft text-shop-error",
  partially_refunded: "bg-shop-warn-soft text-shop-warn",
  failed: "bg-shop-error-soft text-shop-error",
};
export function PaymentPill({ status, className }: { status: ShopPaymentStatus; className?: string }) {
  return <span className={join("inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold", PAYMENT_STYLES[status], className)}>{PAYMENT_STATUS_LABELS[status]}</span>;
}

export function Price({ cents, compareAtCents, size = "md", className }: { cents: number; compareAtCents?: number | null; size?: "sm" | "md" | "lg"; className?: string }) {
  const sizeClass = size === "lg" ? "text-[28px]" : size === "sm" ? "text-sm" : "text-[15px]";
  return (
    <span className={join("inline-flex items-baseline gap-2 font-semibold text-shop-ink", sizeClass, className)}>
      <span>{formatPrice(cents)}</span>
      {compareAtCents != null && compareAtCents > cents && <s className="text-[0.8em] font-normal text-shop-ink-mute">{formatPrice(compareAtCents)}</s>}
    </span>
  );
}

export function SectionHeading({ kicker, title, intro, align = "left", action, as = "h2", className }: { kicker?: string; title: ReactNode; intro?: ReactNode; align?: "left" | "center"; action?: ReactNode; as?: "h1" | "h2"; className?: string }) {
  const Tag = as;
  return (
    <div className={join("flex flex-col gap-8 md:flex-row md:items-end md:justify-between", align === "center" && "md:flex-col md:items-center md:justify-start", className)}>
      <div className={join("flex flex-col gap-3", align === "center" && "items-center text-center")}>
        {kicker && <span className="shop-kicker">{kicker}</span>}
        <Tag className={join("text-3xl leading-[1.15] md:text-[40px]", as === "h1" && "md:text-5xl")}>{title}</Tag>
        {intro && <p className="max-w-[560px] text-base leading-relaxed text-shop-ink-soft">{intro}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function HeartDivider({ className }: { className?: string }) {
  return (
    <div className={join("flex w-40 items-center gap-3", className)} aria-hidden>
      <span className="h-px flex-1 bg-shop-gold-soft" />
      <HeartIcon className="size-4 text-shop-gold" strokeWidth={1.8} />
      <span className="h-px flex-1 bg-shop-gold-soft" />
    </div>
  );
}

export function HeartBullet({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={join("mt-1.5 size-3.5 shrink-0 fill-shop-accent-soft", className)}>
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
    </svg>
  );
}

export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={join("flex flex-col items-center justify-center gap-4 rounded-[20px] border border-dashed border-shop-line bg-shop-paper/60 px-6 py-14 text-center", className)}>
      {icon && <span className="flex size-14 items-center justify-center rounded-full bg-shop-tint-strong text-shop-accent-deep">{icon}</span>}
      <div className="flex flex-col gap-1.5">
        <p className="font-shop-display text-xl text-shop-ink">{title}</p>
        {description && <p className="max-w-sm text-sm leading-relaxed text-shop-ink-soft">{description}</p>}
      </div>
      {action}
    </div>
  );
}

type AlertTone = "info" | "success" | "error" | "warning";
const ALERT_TONES: Record<AlertTone, { box: string; icon: ReactNode }> = {
  info: { box: "border-shop-tint-strong bg-shop-tint text-shop-accent-deep", icon: <InfoIcon className="size-[18px]" /> },
  success: { box: "border-shop-ok-soft bg-shop-ok-soft text-shop-ok", icon: <CheckCircleIcon className="size-[18px]" /> },
  error: { box: "border-shop-error-soft bg-shop-error-soft text-shop-error", icon: <AlertIcon className="size-[18px]" /> },
  warning: { box: "border-shop-warn-soft bg-shop-warn-soft text-shop-warn", icon: <AlertIcon className="size-[18px]" /> },
};
export function Alert({ tone = "info", title, children, className }: { tone?: AlertTone; title?: string; children?: ReactNode; className?: string }) {
  const t = ALERT_TONES[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={join("flex gap-3 rounded-2xl border px-4 py-3 text-sm leading-relaxed", t.box, className)}>
      <span className="mt-0.5 shrink-0">{t.icon}</span>
      <div className="flex flex-col gap-0.5">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div>{children}</div>}
      </div>
    </div>
  );
}

/** Texte saisi dans l'espace de gestion, rendu en paragraphes ; une ligne courte sans ponctuation suivie d'un paragraphe devient un sous-titre. */
export function Multiline({ text, className }: { text: string | null | undefined; className?: string }) {
  if (!text) return null;
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className={join("flex flex-col gap-4 text-[15px] leading-[1.75] text-shop-ink-soft", className)}>
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        const heading = lines.length > 1 && lines[0].length < 80 && !/[.!?:]$/.test(lines[0].trim());
        return heading ? (
          <div key={i} className="flex flex-col gap-1.5">
            <h3 className="font-shop-sans text-base font-semibold text-shop-ink">{lines[0]}</h3>
            <p className="whitespace-pre-line">{lines.slice(1).join("\n")}</p>
          </div>
        ) : (
          <p key={i} className="whitespace-pre-line">
            {block}
          </p>
        );
      })}
    </div>
  );
}
