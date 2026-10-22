/** La roue en pictogramme : la pastille, l'accueil, « Ma carte ». */
export function WheelGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 1.5v13M2.37 4.75l11.26 6.5M2.37 11.25l11.26-6.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="8" cy="8" r="1.8" fill="currentColor" />
    </svg>
  );
}
