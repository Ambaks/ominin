import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeftIcon } from "../icons";

/* Briques de mise en page de l'espace de gestion (thème Ominin). */

export function PageHeader({ title, description, actions, back }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-1.5">
        {back && (
          <Link href={back.href} className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-foreground">
            <ChevronLeftIcon className="size-3.5" /> {back.label}
          </Link>
        )}
        <h1 className="font-display text-2xl font-medium tracking-tight lg:text-3xl">{title}</h1>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

export function KpiCard({ label, value, hint }: { label: string; value: string; hint?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-hairline bg-surface p-5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">{label}</span>
      <span className="font-display text-3xl font-medium tabular-nums">{value}</span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}

export function Card({ title, description, action, children, className = "" }: { title?: ReactNode; description?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-hairline bg-surface ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-4 border-b border-hairline px-5 py-4">
          <div>
            {title && <h2 className="font-display text-lg font-medium">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-hairline bg-surface">
      <table className="w-full min-w-[720px] border-collapse text-sm">{children}</table>
    </div>
  );
}

export const th = "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-faint whitespace-nowrap";
export const td = "px-4 py-3 align-middle border-t border-hairline";

export const primaryButton = "ember-gradient inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60";
export const secondaryButton = "inline-flex items-center gap-2 rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground disabled:opacity-60";
export const dangerButton = "inline-flex items-center gap-2 rounded-full border border-ember-3/50 bg-ember-3/10 px-5 py-2.5 text-sm font-semibold text-ember-3 transition-colors hover:bg-ember-3/20 disabled:opacity-60";
