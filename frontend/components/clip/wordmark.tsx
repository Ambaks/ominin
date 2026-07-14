/** Marque Ominin Clip : « Ominin » en braise, « Clip » en clair. */
export function ClipWordmark({ className = "text-lg" }: { className?: string }) {
  return (
    <span className={`font-display font-semibold ${className}`}>
      <span className="ember-text">Ominin</span>{" "}
      <span className="text-foreground">Clip</span>
    </span>
  );
}
