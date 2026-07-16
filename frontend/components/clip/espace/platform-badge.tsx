import { PLATFORM_LABELS } from "@/lib/clip/constants";
import type { ClipPlatform } from "@/lib/clip/provider/types";

export function PlatformBadge({ platform }: { platform: ClipPlatform }) {
  return (
    <span className="shrink-0 rounded-full border border-hairline bg-surface px-2.5 py-0.5 text-[11px] font-medium text-muted">
      {PLATFORM_LABELS[platform]}
    </span>
  );
}
