/** Bandeau braise défilant, sans fin : deux copies des mots, décalées d'une moitié. */
export function Marquee({ words }: { words: readonly string[] }) {
  return (
    <div className="ember-gradient -rotate-1 overflow-hidden py-4 text-background">
      <p className="sr-only">{words.join(", ")}</p>
      <div className="kit-marquee" aria-hidden>
        {[...words, ...words].map((word, i) => (
          <span key={i} className="kit-display flex items-center gap-8 pr-8 text-3xl sm:text-4xl">
            {word}
            <span className="text-xl opacity-60">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
