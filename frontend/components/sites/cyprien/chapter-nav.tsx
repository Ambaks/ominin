"use client";

import { useEffect, useState } from "react";

type Chapter = { id: string; label: string };

/*
 * Sommaire collant d’une page en chapitres : le chapitre en cours de lecture
 * (le dernier dont le haut a passé le tiers de l’écran) porte aria-current.
 */
export function ChapterNav({ chapters, label }: { chapters: Chapter[]; label: string }) {
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    const sections = chapters
      .map((chapter) => document.getElementById(chapter.id))
      .filter((section): section is HTMLElement => section !== null);
    let frame = 0;
    const measure = () => {
      frame = 0;
      const line = window.innerHeight / 3;
      const passed = sections.filter((section) => section.getBoundingClientRect().top <= line);
      setCurrent(passed.at(-1)?.id ?? null);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [chapters]);

  return (
    <nav className="cy-subnav" aria-label={label}>
      <ul className="cy-wrap">
        {chapters.map((chapter, index) => (
          <li key={chapter.id}>
            <a href={`#${chapter.id}`} aria-current={current === chapter.id ? "true" : undefined}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {chapter.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
