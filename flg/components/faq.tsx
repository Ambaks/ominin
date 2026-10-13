"use client";

import { useId, useState } from "react";

export function Faq({ items }: { items: readonly { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const id = useId();

  return (
    <div className="border-t border-line">
      {items.map(({ q, a }, i) => {
        const isOpen = open === i;
        return (
          <div key={q} className="border-b border-line">
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`${id}-${i}`}
                id={`${id}-${i}-q`}
                onClick={() => setOpen(isOpen ? null : i)}
                className="group flex w-full items-baseline justify-between gap-8 py-7 text-left"
              >
                <span className="display display-s transition-colors duration-300 group-hover:text-accent-text">{q}</span>
                <span
                  aria-hidden
                  className={`relative size-3.5 shrink-0 transition-transform duration-500 ease-out ${isOpen ? "rotate-45" : ""}`}
                >
                  <span className="absolute inset-x-0 top-1/2 h-px bg-current" />
                  <span className="absolute inset-y-0 left-1/2 w-px bg-current" />
                </span>
              </button>
            </h3>
            <div
              id={`${id}-${i}`}
              role="region"
              aria-labelledby={`${id}-${i}-q`}
              inert={!isOpen}
              className={`grid transition-[grid-template-rows] duration-500 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
            >
              <div className="overflow-hidden">
                <p className="max-w-2xl pb-8 text-muted">{a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
