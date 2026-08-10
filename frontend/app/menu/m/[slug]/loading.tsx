export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Hero placeholder */}
      <div className="shimmer h-[46svh] min-h-80 w-full" />

      {/* Category rail placeholder */}
      <div className="border-b border-hairline">
        <div className="mx-auto flex max-w-2xl gap-2 px-5 py-3">
          {[88, 64, 96, 72, 80].map((width, i) => (
            <div
              key={i}
              className="shimmer h-9 shrink-0 rounded-full"
              style={{ width }}
            />
          ))}
        </div>
        <div className="ember-gradient h-0.5 w-1/4 opacity-70" />
      </div>

      {/* Dish card placeholders */}
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-5 py-10">
        <div className="shimmer h-7 w-44 rounded-lg" />
        <div className="shimmer h-52 rounded-2xl" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="shimmer h-32 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
