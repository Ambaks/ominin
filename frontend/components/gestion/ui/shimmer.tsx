/** Squelette de chargement, à la taille du contenu qu'il remplace. */
export function Shimmer({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`g-shimmer ${className}`} />;
}
