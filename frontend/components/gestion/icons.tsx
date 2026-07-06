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
