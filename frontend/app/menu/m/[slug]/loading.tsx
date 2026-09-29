/*
 * Squelette de la carte, affiché avant de savoir de quel établissement elle
 * est : neutre — ni l'or ni le dégradé d'Ominin, des aplats à peine plus
 * clairs que le fond —, pour ne jurer avec le thème d'aucune carte qui le
 * remplace.
 */
export default function Loading() {
  const block = "bg-foreground/[0.04] motion-safe:animate-pulse";
  return (
    <div className="flex flex-1 flex-col">
      {/* Hero placeholder */}
      <div className={`h-[46svh] min-h-80 w-full ${block}`} />

      {/* Category rail placeholder */}
      <div className="border-b border-hairline">
        <div className="mx-auto flex max-w-2xl gap-2 px-5 py-3">
          {[88, 64, 96, 72, 80].map((width, i) => (
            <div
              key={i}
              className="h-9 shrink-0 rounded-full border border-hairline"
              style={{ width }}
            />
          ))}
        </div>
      </div>

      {/* Dish card placeholders */}
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-5 py-10">
        <div className={`h-7 w-44 rounded-lg ${block}`} />
        <div className={`h-52 rounded-2xl ${block}`} />
        {[0, 1, 2].map((i) => (
          <div key={i} className={`h-32 rounded-2xl ${block}`} />
        ))}
      </div>
    </div>
  );
}
