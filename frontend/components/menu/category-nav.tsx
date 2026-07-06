"use client";

import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface CategoryLink {
  id: string;
  name: string;
}

export function CategoryNav({ categories }: { categories: CategoryLink[] }) {
  const [activeId, setActiveId] = useState(categories[0]?.id);
  const [progress, setProgress] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);

  // Scroll-spy: highlight the category whose section is under the nav
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      // A thin band just below the sticky nav decides the active section
      { rootMargin: "-15% 0px -80% 0px" }
    );
    for (const { id } of categories) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [categories]);

  // Gradient progress bar tracking page scroll
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? window.scrollY / max : 0);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Keep the active pill visible in the horizontal rail
  useEffect(() => {
    if (!activeId || !railRef.current) return;
    const pill = railRef.current.querySelector<HTMLElement>(
      `[data-category="${activeId}"]`
    );
    pill?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeId]);

  return (
    <nav className="sticky top-0 z-10 border-b border-hairline bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl items-center gap-2 px-5 lg:max-w-5xl lg:gap-3 lg:px-10">
        <div
          ref={railRef}
          className="no-scrollbar flex flex-1 gap-2 overflow-x-auto py-3 lg:gap-3 lg:py-4"
        >
          {categories.map(({ id, name }) => {
            const active = id === activeId;
            return (
              <a
                key={id}
                href={`#${id}`}
                data-category={id}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all lg:px-5 lg:py-2.5 lg:text-base ${
                  active
                    ? "ember-gradient text-background shadow-[0_0_18px_rgba(226,118,75,0.35)]"
                    : "border border-hairline text-muted hover:border-ember-2/40 hover:text-foreground"
                }`}
              >
                {name}
              </a>
            );
          })}
        </div>
        <ThemeToggle className="shrink-0" />
      </div>
      <div
        aria-hidden
        className="ember-gradient h-0.5 origin-left transition-transform duration-150 ease-out"
        style={{ transform: `scaleX(${progress})` }}
      />
    </nav>
  );
}
