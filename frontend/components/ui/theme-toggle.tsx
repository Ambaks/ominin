"use client";

import { useTheme } from "next-themes";

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />
    </svg>
  );
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();

  // resolvedTheme is undefined until next-themes mounts, so the server and
  // first client render both fall back to the dark-default state (sun).
  const isLight = resolvedTheme === "light";
  const label = isLight ? "Passer au thème sombre" : "Passer au thème clair";

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={() => setTheme(isLight ? "dark" : "light")}
      className={`rounded-full border border-hairline p-2 text-muted transition-colors hover:border-ember-2/40 hover:text-foreground ${className}`}
    >
      {isLight ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
