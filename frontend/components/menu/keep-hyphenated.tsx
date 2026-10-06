/**
 * Un mot à trait d'union ne se coupe pas sur le trait (« Coca- / Cola »,
 * « Pop- / Corn ») : il passe entier à la ligne suivante. Le texte reste tel
 * quel — un vrai trait d'union, que la police a, qu'on copie et qu'on cherche.
 */
export function keepHyphenated(text: string) {
  const parts = text.split(/(\S*-\S*)/);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 ? (
      <span key={i} className="whitespace-nowrap">
        {part}
      </span>
    ) : (
      part
    )
  );
}
