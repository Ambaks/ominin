"use client";

import Image from "next/image";
import { CheckIcon } from "@/components/gestion/icons";
import { GESTION_THEMES } from "@/lib/gestion/constants";
import { useGestionTheme } from "@/lib/gestion/use-gestion-theme";
import { SettingsCard } from "./settings-card";

const PREVIEW_WIDTH = 480;
const PREVIEW_HEIGHT = 240;

/** Le thème de l'espace, choisi sur l'aperçu de chacun ; il vaut pour cet appareil. */
export function ThemeSettings() {
  const { theme, setTheme } = useGestionTheme();
  return (
    <SettingsCard title="Thèmes" text="L'allure de l'espace sur cet appareil.">
      <div role="radiogroup" aria-label="Thèmes" className="grid max-w-lg grid-cols-3 gap-3">
        {GESTION_THEMES.map(({ value, label, preview }) => {
          const chosen = theme === value;
          return (
            <label key={value} className="g-press flex cursor-pointer flex-col gap-2">
              <input
                type="radio"
                name="gestion-theme"
                checked={chosen}
                onChange={() => setTheme(value)}
                className="peer sr-only"
              />
              <span
                className={`relative block overflow-hidden rounded-xl border peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ember-2 ${
                  chosen ? "border-ember-2" : "border-hairline"
                }`}
              >
                <Image
                  src={preview}
                  alt=""
                  width={PREVIEW_WIDTH}
                  height={PREVIEW_HEIGHT}
                  unoptimized
                  className="block h-auto w-full"
                />
                {chosen && (
                  <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-ember-2 text-background">
                    <CheckIcon className="size-3" />
                  </span>
                )}
              </span>
              <span className={`text-center text-g-meta ${chosen ? "font-semibold" : "text-muted"}`}>{label}</span>
            </label>
          );
        })}
      </div>
    </SettingsCard>
  );
}
