import type { Order } from "@/lib/gestion/types";

/**
 * L'id HubRise des commandes transmises à la caisse : c'est par lui qu'on
 * les retrouve dans la caisse ou les journaux HubRise. Rien si aucune n'y est
 * partie. `className` remplace la marge haute par défaut.
 */
export function HubriseRef({
  orders,
  className = "mt-1",
}: {
  orders: Pick<Order, "hubriseOrderId">[];
  className?: string;
}) {
  const ids = orders.flatMap((order) => (order.hubriseOrderId ? [order.hubriseOrderId] : []));
  if (!ids.length) return null;
  return (
    <p className={`text-g-axis tabular-nums text-muted ${className}`} title="Identifiant chez HubRise">
      HubRise · {ids.join(", ")}
    </p>
  );
}
