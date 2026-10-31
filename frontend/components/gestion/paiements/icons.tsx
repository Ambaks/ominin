import type { IconProps } from "@/components/gestion/icons";

/* Icônes des entités d'argent de Paiements : trait 1,75, currentColor. */

function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** Pièces empilées : ce qui est encaissé. */
export function CoinsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <ellipse cx="12" cy="7" rx="7" ry="3" />
      <path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
    </Svg>
  );
}

/** Billet : les espèces. */
export function CashIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 12h.01M18 12h.01" />
    </Svg>
  );
}

/** Téléphone : le client a payé depuis le menu. */
export function OnlineIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </Svg>
  );
}

/** Caisse enregistreuse : la vente réglée sur la caisse du restaurant. */
export function TillIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 10h16l1 10H3zM7 10V6h10v4M9 6V4h6v2" />
      <path d="M8 15h.01M12 15h.01M16 15h.01" />
    </Svg>
  );
}

/** Flèche de retour : l'argent rendu au client. */
export function RefundIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 14l-4-4 4-4" />
      <path d="M5 10h9a5 5 0 010 10h-3" />
    </Svg>
  );
}

/** Trois points : les gestes d'une ligne, sur téléphone. */
export function MoreIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 12h.01M12 12h.01M18 12h.01" strokeWidth="2.5" />
    </Svg>
  );
}
