import Link from "next/link";

export function StatCard({
  label,
  value,
  href,
  hint,
}: {
  label: string;
  value: string;
  href: string;
  hint?: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-2 rounded-2xl border border-hairline bg-surface p-5 transition-colors hover:border-ember-2/40"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">
        {label}
      </p>
      <p className="font-display text-3xl font-medium">{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </Link>
  );
}
