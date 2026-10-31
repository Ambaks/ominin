import type { IconProps } from "@/components/gestion/icons";

function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

/** Une carte de fidélité. */
export function CardIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="6" width="18" height="12" rx="2.5" />
      <path d="M7 14h4M3 10h18" />
    </Svg>
  );
}

export function PeopleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M3.5 19c.6-3.3 2.9-5 5.5-5s4.9 1.7 5.5 5M16 5.5a3 3 0 010 5.5M20.5 18.5c-.4-2.6-1.9-4.1-4-4.5" />
    </Svg>
  );
}

/** Un cadeau ouvert : une récompense servie. */
export function GiftOpenIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 12.5h16v8H4zM12 12.5v8M12 12.5c-2.5-.5-5-2-5-4.5a2 2 0 013.5-1.3L12 9.5M12 12.5c2.5-.5 5-2 5-4.5a2 2 0 00-3.5-1.3L12 9.5" />
    </Svg>
  );
}

export function PhoneCheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="7" y="3" width="10" height="18" rx="2.5" />
      <path d="M9.5 12.5l1.8 1.8 3.4-3.6" />
    </Svg>
  );
}
