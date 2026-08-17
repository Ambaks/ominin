"use client";

import type { IconProps } from "@/components/gestion/icons";
import {
  ACTIVITY_TYPE_LABELS,
  STATUS_LABELS,
} from "@/lib/admin/constants";
import { formatDayTime } from "@/lib/admin/format";
import type { Activity, ActivityType, LeadStatus } from "@/lib/admin/types";
import {
  ArrowRightIcon,
  CalendarIcon,
  ClockIcon,
  MailIcon,
  MapPinIcon,
  NoteIcon,
  PhoneIcon,
  PresentationIcon,
  WhatsappIcon,
} from "../icons";

const TYPE_ICONS: Record<ActivityType, React.ComponentType<IconProps>> = {
  note: NoteIcon,
  call: PhoneIcon,
  email: MailIcon,
  visit: MapPinIcon,
  whatsapp: WhatsappIcon,
  appointment: CalendarIcon,
  demo: PresentationIcon,
  follow_up: ClockIcon,
  status_change: ArrowRightIcon,
};

function statusChangeLabel(metadata: Activity["metadata"]): string {
  const { from, to } = (metadata ?? {}) as { from?: LeadStatus; to?: LeadStatus };
  if (from && to && STATUS_LABELS[from] && STATUS_LABELS[to]) {
    return `${STATUS_LABELS[from]} → ${STATUS_LABELS[to]}`;
  }
  return ACTIVITY_TYPE_LABELS.status_change;
}

export function ActivityTimeline({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return <p className="py-4 text-sm text-faint">Aucune activité.</p>;
  }
  return (
    <ol className="flex flex-col">
      {activities.map((activity) => {
        const Icon = TYPE_ICONS[activity.type];
        const title =
          activity.type === "status_change"
            ? statusChangeLabel(activity.metadata)
            : (activity.title ?? ACTIVITY_TYPE_LABELS[activity.type]);
        return (
          <li
            key={activity.id}
            className="flex gap-3 border-t border-hairline py-3 first:border-t-0"
          >
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-hairline text-muted">
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium">{title}</p>
                <p className="shrink-0 text-xs text-faint">
                  {formatDayTime(activity.createdAt)}
                </p>
              </div>
              {activity.description && (
                <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                  {activity.description}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
