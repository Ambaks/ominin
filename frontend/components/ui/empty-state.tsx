export function EmptyState({
  title,
  body,
  action,
  heading = false,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
  /** Seul contenu de la page : le titre en est le titre. */
  heading?: boolean;
}) {
  const Title = heading ? "h1" : "p";
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-hairline px-6 py-12 text-center">
      <Title
        // Titre de la page : il peut recevoir le focus (le résultat d'un scan).
        tabIndex={heading ? -1 : undefined}
        className="font-display text-lg font-medium outline-none"
      >
        {title}
      </Title>
      {body && (
        <p className="max-w-sm text-sm leading-relaxed text-muted">{body}</p>
      )}
      {action}
    </div>
  );
}
