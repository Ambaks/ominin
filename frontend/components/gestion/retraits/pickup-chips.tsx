import { CheckIcon, XIcon } from "@/components/gestion/icons";
import { CoinsIcon } from "@/components/gestion/paiements/icons";
import { Chip } from "@/components/gestion/ui";
import { ORDER_STATUS_LABELS, PAYMENT_MODE_LABELS, PICKUP_STATUS_LABELS } from "@/lib/gestion/constants";
import { paidThroughSite } from "@/lib/gestion/selectors";
import type { Order, OrderStatus } from "@/lib/gestion/types";

/* Pastilles d'un retrait : l'étape où il en est, et comment il est réglé. */

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}
const SparkIcon = () => (
  <Svg>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
  </Svg>
);
const PanIcon = () => (
  <Svg>
    <circle cx="10" cy="13" r="6" />
    <path d="M15.5 10.5L21 5" />
  </Svg>
);
const BagCheckIcon = () => (
  <Svg>
    <path d="M5 8h14l-1.2 12.5H6.2L5 8zM9 10.5V6.5a3 3 0 0 1 6 0v4" />
    <path d="M9.5 15l2 2 3.5-4" />
  </Svg>
);

const STATUS_ICON: Partial<Record<OrderStatus, React.ReactNode>> = {
  en_attente: <SparkIcon />,
  en_preparation: <PanIcon />,
  prete: <CheckIcon />,
  retiree: <BagCheckIcon />,
  annulee: <XIcon />,
};

/** L'étape d'un retrait : « Nouvelle », « À préparer », « Prête », « Remise », « Annulée ». */
export function PickupStatusChip({ status }: { status: OrderStatus }) {
  const label = PICKUP_STATUS_LABELS[status] ?? ORDER_STATUS_LABELS[status];
  if (status === "annulee") {
    return (
      <Chip tone="problem" icon={STATUS_ICON.annulee}>
        {label}
      </Chip>
    );
  }
  return (
    <span className="g-orders">
      <Chip icon={STATUS_ICON[status]}>{label}</Chip>
    </span>
  );
}

/** Comment un retrait réglé l'a été : en ligne depuis le site, ou encaissé par l'équipe. */
export function PickupPaidChip({ order }: { order: Order }) {
  const label = paidThroughSite(order)
    ? "Payée en ligne"
    : order.paymentMode
      ? `Encaissée · ${PAYMENT_MODE_LABELS[order.paymentMode].toLowerCase()}`
      : "Encaissée";
  return (
    <span className="g-money">
      <Chip icon={<CoinsIcon />}>{label}</Chip>
    </span>
  );
}
