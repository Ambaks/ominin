import Link from "next/link";

/** Tuile de statistique — même recette que components/gestion/apercu/stat-card. */
export function StatCard({
  label,
  value,
  href,
  hint,
  alert,
}: {
  label: string;
  value: string;
  /** Sans href, la tuile est purement informative. */
  href?: string;
  hint?: string;
  /** Valeur en ember-3 (suivis en retard…). */
  alert?: boolean;
}) {
  const body = (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">
        {label}
      </p>
      <p
        className={`font-display text-3xl font-medium ${alert ? "text-ember-3" : ""}`}
      >
        {value}
      </p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </>
  );
  const frame =
    "flex flex-col gap-2 rounded-2xl border border-hairline bg-surface p-5";

  return href ? (
    <Link
      href={href}
      className={`${frame} transition-colors hover:border-ember-2/40`}
    >
      {body}
    </Link>
  ) : (
    <div className={frame}>{body}</div>
  );
}
