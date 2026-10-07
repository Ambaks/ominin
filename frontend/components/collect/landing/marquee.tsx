import { marquee } from "@/lib/collect-landing-data";

/** Bandeau braise défilant : les métiers servis, sans fin. */
export function CollectMarquee() {
  const words = [...marquee, ...marquee];
  return (
    <div className="ember-gradient -rotate-1 overflow-hidden py-4 text-background">
      <p className="sr-only">{marquee.join(", ")}</p>
      <div className="collect-marquee" aria-hidden>
        {words.map((word, i) => (
          <span key={i} className="collect-display flex items-center gap-8 pr-8 text-3xl sm:text-4xl">
            {word}
            <span className="text-xl opacity-60">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
