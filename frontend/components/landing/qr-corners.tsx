/*
 * Coins de détection QR — l'élément récurrent du brand kit. Posé en
 * absolu sur un parent `relative`, il encadre le contenu comme un
 * viseur de scan. Purement décoratif.
 */
export function QrCorners({ className = "" }: { className?: string }) {
  const corner = "absolute size-4 border-ember-2/50 lg:size-6";
  return (
    <div
      className={`pointer-events-none absolute inset-0 ${className}`}
      aria-hidden
    >
      <span className={`${corner} left-0 top-0 rounded-tl border-l-2 border-t-2`} />
      <span className={`${corner} right-0 top-0 rounded-tr border-r-2 border-t-2`} />
      <span className={`${corner} bottom-0 left-0 rounded-bl border-b-2 border-l-2`} />
      <span className={`${corner} bottom-0 right-0 rounded-br border-b-2 border-r-2`} />
    </div>
  );
}
