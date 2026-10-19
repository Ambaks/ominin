"use client";

export interface PillTab {
  id: string;
  label: string;
  count?: number;
}

export function PillTabs({
  tabs,
  activeId,
  onSelect,
  visite,
}: {
  tabs: PillTab[];
  activeId: string;
  onSelect: (id: string) => void;
  /** Repère de visite guidée : l'enveloppe épouse les pastilles. */
  visite?: string;
}) {
  const strip = (
    <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(tab.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${
              active
                ? "ember-gradient text-background shadow-[0_0_18px_rgba(226,118,75,0.35)]"
                : "border border-hairline text-muted hover:border-ember-2/40 hover:text-foreground"
            }`}
          >
            {tab.label}
            {/* Pastille pleine, aux couleurs du texte de la page : lisible
                sur le dégradé de l'onglet actif, en sombre comme en clair. */}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`ml-1.5 inline-block min-w-6 rounded-full px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums ${
                  active ? "bg-background text-foreground" : "bg-surface-raised text-muted"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
  return visite ? (
    <div data-visite={visite} className="w-fit max-w-full rounded-full">
      {strip}
    </div>
  ) : (
    strip
  );
}
