/** Marque Ominin Collect : « Ominin » en braise, « Collect » en clair. */
export function CollectWordmark({ className = "text-lg" }: { className?: string }) {
  return (
    <span className={`font-display font-semibold ${className}`}>
      <span className="ember-text">Ominin</span>{" "}
      <span className="text-foreground">Collect</span>
    </span>
  );
}
