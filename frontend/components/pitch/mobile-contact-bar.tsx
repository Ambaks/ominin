"use client";

import { useEffect, useState } from "react";
import { buttonPrimary, buttonSecondary } from "@/components/pitch/buttons";

/**
 * Au téléphone, la page est longue : la démo et le contact restent à portée
 * de pouce, mais seulement une fois les boutons du héros sortis de l'écran —
 * avant, ils feraient doublon.
 */
export function MobileContactBar({
  watch,
  demoHref,
  demoLabel,
  mailHref,
  mailLabel,
}: {
  /** id de l'élément dont la sortie de l'écran fait paraître la barre. */
  watch: string;
  demoHref: string;
  demoLabel: string;
  mailHref: string;
  mailLabel: string;
}) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const target = document.getElementById(watch);
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) =>
      setShown(!entry.isIntersecting && entry.boundingClientRect.top < 0)
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [watch]);

  return (
    <div
      aria-hidden={!shown}
      inert={!shown}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-(--ocp-line) bg-(--ocp-black)/92 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md transition-transform duration-300 lg:hidden ${
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
