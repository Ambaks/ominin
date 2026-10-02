/**
 * Des fragments séparés par « · » qui passent à la ligne entre eux : le point
 * d'un fragment arrivé en début de ligne sort du cadre, si bien qu'aucune
 * ligne ne commence ni ne finit sur un séparateur.
 */
export function Joined({ parts }: { parts: React.ReactNode[] }) {
  return (
    <span className="block overflow-hidden">
      <span className="-ml-4 flex flex-wrap">
        {parts.map((part, i) => (
          <span key={i} className="relative pl-4 before:absolute before:left-1.5 before:content-['·']">
            {part}
          </span>
        ))}
      </span>
    </span>
  );
}
