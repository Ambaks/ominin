import Link from "next/link";

export function StatCard({
  label,
  value,
  href,
  hint,
}: {
  label: string;
  value: string;
  /** Sans href, la tuile est purement informative (page Analytique). */
  href?: string;
  hint?: string;
}) {
  const body = (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">
        {label}
      </p>
      <p className="font-display text-3xl font-medium">{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </>
  );
  const frame = "flex flex-col gap-2 rounded-2xl border border-hairline bg-surface p-5";

  return href ? (
    <Link href={href} className={`${frame} transition-colors hover:border-ember-2/40`}>
      {body}
    </Link>
  ) : (
    <div className={frame}>{body}</div>
  );
}
