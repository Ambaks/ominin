/** Marque Ominin : « Ominin » en braise, suivi du nom du produit en clair. */
export function Wordmark({
  suffix,
  className = "text-lg",
}: {
  suffix?: string;
  className?: string;
}) {
  return (
    <span className={`font-display font-semibold ${className}`}>
      <span className="ember-text">Ominin</span>
      {suffix && <> <span className="text-foreground">{suffix}</span></>}
    </span>
  );
}
