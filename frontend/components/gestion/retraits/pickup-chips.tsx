import { ClockIcon } from "@/components/gestion/icons";
import { Chip } from "@/components/gestion/ui";
import { PAYMENT_MODE_LABELS, PICKUP_STATUS_LABELS } from "@/lib/gestion/constants";
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
const CheckIcon = () => (
  <Svg>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);
const BagCheckIcon = () => (
  <Svg>
    <path d="M5 8h14l-1.2 12.5H6.2L5 8zM9 10.5V6.5a3 3 0 0 1 6 0v4" />
    <path d="M9.5 15l2 2 3.5-4" />
  </Svg>
);
const CrossIcon = () => (
  <Svg>
    <path d="M7 7l10 10M17 7L7 17" />
  </Svg>
);
const CoinIcon = () => (
  <Svg>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v8M9.5 10.5h3.5a1.5 1.5 0 010 3H9.5" />
  </Svg>
);

const STATUS_ICON: Partial<Record<OrderStatus, React.ReactNode>> = {
  en_attente: <SparkIcon />,
  en_preparation: <PanIcon />,
  prete: <CheckIcon />,
  retiree: <BagCheckIcon />,
  annulee: <CrossIcon />,
};

/** L'étape d'un retrait : « Nouvelle », « À préparer », « Prête », « Remise », « Annulée ». */
export function PickupStatusChip({ status }: { status: OrderStatus }) {
  const label = PICKUP_STATUS_LABELS[status] ?? "Annulée";
  if (status === "annulee") {
    return (
      <Chip tone="problem" icon={STATUS_ICON.annulee}>
        {label}
      </Chip>
    );
  }
  return (
    <span className={status === "prete" ? "g-money" : "g-orders"}>
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
      <Chip icon={<CoinIcon />}>{label}</Chip>
    </span>
  );
}

/** Ce qu'il reste à régler au retrait. */
export function PickupDueChip({ amount }: { amount: string }) {
  return (
    <span className="g-money">
      <Chip icon={<ClockIcon />}>{amount} à régler au retrait</Chip>
    </span>
  );
}
