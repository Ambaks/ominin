export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-hairline px-6 py-12 text-center">
      <p className="font-display text-lg font-medium">{title}</p>
      {body && (
        <p className="max-w-sm text-sm leading-relaxed text-muted">{body}</p>
      )}
      {action}
    </div>
  );
}
