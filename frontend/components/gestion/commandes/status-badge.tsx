import { Chip } from "@/components/gestion/ui";
import { ORDER_STATUS_LABELS } from "@/lib/gestion/constants";
import type { OrderStatus } from "@/lib/gestion/types";
import { XIcon } from "../icons";

/** L'état d'une commande seule : une pastille, grenat quand elle est annulée. */
export function StatusBadge({
  status,
  label = ORDER_STATUS_LABELS[status],
}: {
  status: OrderStatus;
  /** Le mot du contexte : une commande fast food est « Remise », pas « Servie ». */
  label?: string;
}) {
  return status === "annulee" ? (
    <Chip tone="problem" icon={<XIcon />}>
      {label}
    </Chip>
  ) : (
    <Chip>{label}</Chip>
  );
}
