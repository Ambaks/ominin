"use client";

import { useEffect, useState } from "react";
import { buttonPrimary, buttonSecondary } from "@/components/pitch/buttons";

/**
 * Au téléphone, la page est longue : la démo et le contact restent à portée
 * de pouce, mais seulement une fois les boutons du héros sortis de l'écran,
 * et pas sur la conclusion qui porte les siens — ils y feraient doublon.
 */
export function MobileContactBar({
  watch,
  until,
  demoHref,
  demoLabel,
  mailHref,
  mailLabel,
}: {
  /** id de l'élément dont la sortie de l'écran fait paraître la barre. */
  watch: string;
  /** id de l'élément dont l'arrivée à l'écran la fait disparaître. */
  until: string;
  demoHref: string;
  demoLabel: string;
  mailHref: string;
  mailLabel: string;
}) {
  const [past, setPast] = useState(false);
  const [atEnd, setAtEnd] = useState(false);
  const shown = past && !atEnd;

  useEffect(() => {
    const start = document.getElementById(watch);
    const end = document.getElementById(until);
    if (!start || !end) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === start) setPast(!entry.isIntersecting && entry.boundingClientRect.top < 0);
        else setAtEnd(entry.isIntersecting);
      }
    });
    observer.observe(start);
    observer.observe(end);
    return () => observer.disconnect();
  }, [watch, until]);

  return (
    <div
      aria-hidden={!shown}
      inert={!shown}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-(--pitch-line) bg-(--pitch-ground)/92 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md transition-transform duration-300 lg:hidden ${
        shown ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="mx-auto grid max-w-md grid-cols-[auto_1fr] gap-2">
        <a href={demoHref} className={`${buttonSecondary} min-h-11 px-5 text-sm`}>
          {demoLabel}
        </a>
        <a href={mailHref} className={`${buttonPrimary} min-h-11 px-5 text-sm`}>
          {mailLabel}
        </a>
      </div>
    </div>
  );
}
