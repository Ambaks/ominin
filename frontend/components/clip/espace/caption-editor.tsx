"use client";

import { Field, inputClass } from "@/components/ui/field";
import { PLATFORM_LABELS } from "@/lib/clip/constants";
import type { CaptionSet, ClipPlatform } from "@/lib/clip/provider/types";

/*
 * Édition des titres générés, plateforme par plateforme. Le parent possède
 * le CaptionSet ; YouTube porte en plus une description.
 */
export function CaptionEditor({
  platforms,
  captions,
  onChange,
}: {
  platforms: ClipPlatform[];
  captions: CaptionSet;
  onChange: (next: CaptionSet) => void;
}) {
  const update = (
    platform: ClipPlatform,
    patch: Partial<{ title: string; description: string }>
  ) => {
    onChange({
      ...captions,
      [platform]: { title: "", ...captions[platform], ...patch },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {platforms.map((platform) => (
        <div key={platform} className="flex flex-col gap-3">
          <Field label={`Titre ${PLATFORM_LABELS[platform]}`}>
            <input
              className={inputClass}
              value={captions[platform]?.title ?? ""}
              onChange={(event) =>
                update(platform, { title: event.target.value })
              }
            />
          </Field>
          {platform === "youtube" && (
            <Field label="Description YouTube">
              <textarea
                className={`${inputClass} min-h-20 resize-y`}
                value={captions.youtube?.description ?? ""}
                onChange={(event) =>
                  update(platform, { description: event.target.value })
                }
              />
            </Field>
          )}
        </div>
      ))}
    </div>
  );
}
