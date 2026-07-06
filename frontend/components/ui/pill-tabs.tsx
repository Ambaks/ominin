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
}: {
  tabs: PillTab[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:flex-wrap lg:px-0">
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${
              active
                ? "ember-gradient text-background shadow-[0_0_18px_rgba(226,118,75,0.35)]"
                : "border border-hairline text-muted hover:border-ember-2/40 hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                  active ? "bg-background/20" : "bg-surface-raised text-faint"
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
}
