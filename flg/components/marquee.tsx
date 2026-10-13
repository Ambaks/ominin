/* Bandeau des supports : défile en continu, s'arrête au survol. */
export function Marquee({ items, className }: { items: readonly string[]; className?: string }) {
  const row = (
    <ul className="flex shrink-0 items-center">
      {items.map((item) => (
        <li key={item} className="flex items-center">
          <span className="display display-l whitespace-nowrap px-[0.35em]">{item}</span>
          <span aria-hidden className="block size-2 rotate-45 bg-accent" />
        </li>
      ))}
    </ul>
  );

  return (
    <div className={`group/marquee overflow-hidden ${className ?? ""}`}>
      <div className="flex w-max animate-[marquee_48s_linear_infinite] group-hover/marquee:[animation-play-state:paused]">
        {row}
        <div aria-hidden className="flex">
          {row}
        </div>
      </div>
    </div>
  );
}
