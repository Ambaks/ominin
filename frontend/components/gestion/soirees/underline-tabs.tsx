"use client";

/*
 * Les onglets des écrans Soirées : du texte et un trait d'or sous l'onglet
 * ouvert, pour ne jamais se confondre avec le bouton corail de l'action
 * principale. La rangée défile au doigt, bords estompés, sans rien couper.
 */

export type UnderlineTab = { id: string; label: string; count?: number };

export function UnderlineTabs({
  tabs,
  activeId,
  onSelect,
  label,
}: {
  tabs: UnderlineTab[];
  activeId: string;
  onSelect: (id: string) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="defile no-scrollbar flex gap-6 overflow-x-auto border-b border-hairline">
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(tab.id)}
            className={`onglet relative flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-medium ${
              active ? "text-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="rounded-full bg-surface-raised px-1.5 text-xs tabular-nums text-muted">{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
