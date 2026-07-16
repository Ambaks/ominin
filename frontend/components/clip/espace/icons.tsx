import type { IconProps } from "@/components/gestion/icons";

/*
 * Icônes propres à l'espace clipper — même style filaire que
 * components/gestion/icons.tsx (les génériques Chart/Logout en sont importés).
 */

function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 15.5V4M7.5 8.5 12 4l4.5 4.5" />
      <path d="M4 15.5V19a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-3.5" />
    </Svg>
  );
}

export function ListIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8.5 6h12M8.5 12h12M8.5 18h12" />
      <path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
    </Svg>
  );
}

export function LinkIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9.5 14.5a4 4 0 0 0 6 .4l3-3a4 4 0 0 0-5.7-5.7l-1.5 1.5" />
      <path d="M14.5 9.5a4 4 0 0 0-6-.4l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5" />
    </Svg>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20.5 4v4.5H16" />
      <path d="M20.5 8.5A8.5 8.5 0 1 0 21 14" />
    </Svg>
  );
}
