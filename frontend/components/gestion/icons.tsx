export interface IconProps {
  className?: string;
}

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

export function ApercuIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
    </Svg>
  );
}

export function CommandesIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 2.5h12v19l-3-2-3 2-3-2-3 2v-19z" />
      <path d="M9 8h6M9 12h6" />
    </Svg>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 20.5h16" />
      <path d="M6.5 20.5v-7M12 20.5V6.5M17.5 20.5V11" />
    </Svg>
  );
}

export function TablesIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <ellipse cx="12" cy="6.5" rx="9" ry="3.5" />
      <path d="M5 9.5V17M19 9.5V17M12 10v10" />
    </Svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2 4.5c4 0 8 1 10 3 2-2 6-3 10-3V18c-4 0-8 1-10 3-2-2-6-3-10-3V4.5z" />
      <path d="M12 7.5V21" />
    </Svg>
  );
}

export function FormulesIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2.5 22 8l-10 5.5L2 8l10-5.5z" />
      <path d="M2 15.5 12 21l10-5.5" />
    </Svg>
  );
}

export function QrIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <path d="M14 14h3v3h-3zM21 14v.01M14 21h.01M18 18h3v3h-3z" />
    </Svg>
  );
}

export function GearIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.98 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.98a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09c0 .68.4 1.29 1.03 1.56a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9c.27.63.88 1.03 1.56 1.03H21a2 2 0 1 1 0 4h-.09c-.68 0-1.29.4-1.51.97z" />
    </Svg>
  );
}

export function ExternalLinkIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14 4h6v6M20 4 11 13" />
      <path d="M18 13.5V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 19V8a1.5 1.5 0 0 1 1.5-1.5H11" />
    </Svg>
  );
}

export function XIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

export function EditIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M17 3.5 20.5 7 8 19.5 3.5 20.5 4.5 16 17 3.5z" />
    </Svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" />
      <path d="M10 11v5M14 11v5" />
    </Svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  );
}

export function TeamIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M3.5 19.5c.6-3.2 2.7-5 5.5-5s4.9 1.8 5.5 5" />
      <path d="M15.5 5.3a3.25 3.25 0 0 1 0 5.4M17.8 14.9c1.5.7 2.4 2.2 2.7 4.1" />
    </Svg>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14 4H6a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 6 20h8" />
      <path d="M10 12h10.5M17 8.5l3.5 3.5-3.5 3.5" />
    </Svg>
  );
}
