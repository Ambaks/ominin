/*
 * Icônes des boutiques et de leur espace de gestion : traits fins (1.6),
 * dessinées à la main comme celles des autres produits — aucune
 * bibliothèque d'icônes n'est chargée.
 */

export interface IconProps {
  className?: string;
  strokeWidth?: number;
}

function Svg({ className = "size-5", strokeWidth = 1.6, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {children}
    </svg>
  );
}

export const HeartIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 20.5s-7.5-4.6-7.5-10.3A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.5 2.6c0 5.7-7.5 10.3-7.5 10.3z" />
  </Svg>
);
export const BagIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 8h14l-1 12H6L5 8z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </Svg>
);
export const UserIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </Svg>
);
export const MenuIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Svg>
);
export const CloseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);
export const ChevronDownIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);
export const ChevronLeftIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m15 6-6 6 6 6" />
  </Svg>
);
export const ChevronRightIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
);
export const ArrowRightIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 12h16M13 5l7 7-7 7" />
  </Svg>
);
export const ArrowUpIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 20V4M5 11l7-7 7 7" />
  </Svg>
);
export const ArrowDownIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4v16M5 13l7 7 7-7" />
  </Svg>
);
export const GiftIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 11h16v9H4zM3 7h18v4H3zM12 7v13" />
    <path d="M12 7c-1.5-2.5-5-3-5-1s3 1.5 5 1zm0 0c1.5-2.5 5-3 5-1s-3 1.5-5 1z" />
  </Svg>
);
export const TruckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" />
    <circle cx="7" cy="18" r="1.6" />
    <circle cx="17" cy="18" r="1.6" />
  </Svg>
);
export const LockIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Svg>
);
export const SearchIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4-4" />
  </Svg>
);
export const MinusIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14" />
  </Svg>
);
export const PlusIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const TrashIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />
  </Svg>
);
export const CheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m5 12 4.5 4.5L19 7" />
  </Svg>
);
export const AlertIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v4.5M12 16h.01" />
  </Svg>
);
export const InfoIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </Svg>
);
export const MailIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="m3.5 7 8.5 6.5L20.5 7" />
  </Svg>
);
export const PhoneIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 3h3l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2z" />
  </Svg>
);
export const ExternalLinkIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 4h6v6M20 4l-9 9M18 13v6H5V6h6" />
  </Svg>
);
export const PrinterIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 8V3h10v5M5 8h14a2 2 0 0 1 2 2v6h-4v4H7v-4H3v-6a2 2 0 0 1 2-2z" />
  </Svg>
);
export const RefundIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 10a8 8 0 1 1 2.3 5.7M4 4v6h6" />
  </Svg>
);
export const UploadIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 16V5M6 11l6-6 6 6M4 19h16" />
  </Svg>
);
export const PencilIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m4 20 4-1L20 7l-3-3L5 16zM14 6l3 3" />
  </Svg>
);
export const PackageIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 8 12 4l9 4-9 4zM3 8v9l9 4 9-4V8M12 12v9" />
  </Svg>
);
export const MessageIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 5h16v11H9l-5 4z" />
  </Svg>
);
export const TagIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 12V4h8l9 9-8 8zM7.5 7.5h.01" />
  </Svg>
);
export const SettingsIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Svg>
);
export const SlidersIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 4v6M5 14v6M12 4v10M12 18v2M19 4v2M19 10v10M3 10h4M10 14h4M17 6h4" />
  </Svg>
);
export const FileIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 3h8l5 5v13H6zM14 3v5h5M9 13h7M9 17h7" />
  </Svg>
);
export const UsersIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20a6 6 0 0 1 12 0M16 4a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.6" />
  </Svg>
);
export const DashboardIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="8" height="8" rx="2" />
    <rect x="13" y="3" width="8" height="5" rx="2" />
    <rect x="13" y="10" width="8" height="11" rx="2" />
    <rect x="3" y="13" width="8" height="8" rx="2" />
  </Svg>
);
export const LogoutIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9" />
  </Svg>
);
export const SparkleIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M12 8l1.5 2.5L16 12l-2.5 1.5L12 16l-1.5-2.5L8 12l2.5-1.5z" />
  </Svg>
);
export const CreditCardIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <path d="M3 10h18M7 14h4" />
  </Svg>
);
export const CircleDashedIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
  </Svg>
);
export const CheckCircleIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12 2.5 2.5L16 9" />
  </Svg>
);
export const RefreshIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" />
  </Svg>
);
export const StoreIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 9 5.5 4h13L20 9M4 9v11h16V9M4 9h16M9 20v-6h6v6" />
  </Svg>
);
