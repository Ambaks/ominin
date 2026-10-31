"use client";

import { useState } from "react";
import { EmptyState, GlassButton } from "@/components/gestion/ui";
import type { EncaissementMode, Order, OrderItem } from "@/lib/gestion/types";
import { EncaisserCard, type PaySelection } from "./encaisser-card";
import { ServirCard } from "./servir-card";

/*
 * La commande d'exemple d'un nouveau restaurant (UX-SIMPLICITE § 3.8) : une
 * « Table 0 » que rien n'enregistre, pour toucher Encaisser, Servi et Annuler
 * sans risque. Elle vit dans l'état de l'écran et suit le vrai circuit : une
 * addition, réglée, devient un service ; servie, elle se ferme.
 */

const EXAMPLE_LINES: Pick<OrderItem, "id" | "name" | "quantity" | "unitPrice" | "options">[] = [
  { id: "ex-1", name: "Burrata di Parma", quantity: 1, unitPrice: 12 },
  {
    id: "ex-2",
    name: "Pizza Diavola",
    quantity: 2,
    unitPrice: 14,
    options: [{ groupName: "Pâte", choiceName: "Fine", supplement: 0 }],
  },
  { id: "ex-3", name: "Spritz Aperol", quantity: 1, unitPrice: 8 },
];

function exampleOrder(items: OrderItem[]): Order {
  return {
    id: "exemple",
    type: "sur_place",
    tableId: "exemple",
    status: items.every((line) => line.paidMode) ? "payee" : "en_attente",
    createdAt: new Date().toISOString(),
    items,
    payments: [],
  };
}

export function ExampleOrder({ now, onClose }: { now: Date; onClose: () => void }) {
  const [items, setItems] = useState<OrderItem[]>(EXAMPLE_LINES);
  const order = exampleOrder(items);
  const paid = items.length > 0 && items.every((line) => line.paidMode);
  const served = paid && items.every((line) => line.servedAt);

  const pay = async (selection: PaySelection, mode: EncaissementMode) => {
    const counts = new Map(selection.map((part) => [part.itemId, part.quantity]));
    setItems((current) =>
      current.flatMap((line) => {
        const quantity = counts.get(line.id);
        if (!quantity) return [line];
        const paidMode = mode === "mixte" ? "carte" : mode;
        if (quantity >= line.quantity) return [{ ...line, paidMode }];
        // Une partie seulement : la ligne se scinde, comme le fait la RPC.
        return [
          { ...line, id: `${line.id}-p`, quantity, paidMode },
          { ...line, quantity: line.quantity - quantity },
        ];
      })
    );
  };

  const cancel = async (itemId: string) => {
    setItems((current) =>
      current.flatMap((line) =>
        line.id !== itemId ? [line] : line.quantity > 1 ? [{ ...line, quantity: line.quantity - 1 }] : []
      )
    );
  };

  const serve = async (itemIds: string[]) => {
    const servedAt = new Date().toISOString();
    setItems((current) =>
      current.map((line) => (itemIds.includes(line.id) ? { ...line, servedAt } : line))
    );
  };

  if (served || items.length === 0) {
    return (
      <EmptyState
        text={
          items.length === 0
            ? "Table 0 annulée, article par article. Une vraie commande se ferme de la même façon."
            : "Table 0 encaissée puis servie : c'est tout le geste. La vraie commande arrivera ici avec son carillon."
        }
        action={
          <span className="flex gap-2">
            <GlassButton onClick={() => setItems(EXAMPLE_LINES)}>Rejouer</GlassButton>
            <GlassButton variant="primary" onClick={onClose}>
              Compris
            </GlassButton>
          </span>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-g-meta text-muted">
        Une commande d’exemple, que rien n’enregistre : touchez ses boutons pour voir le geste.
      </p>
      {paid ? (
        <ServirCard orders={[order]} title="Table 0" now={now} onServe={serve} tag="Exemple" />
      ) : (
        <EncaisserCard orders={[order]} title="Table 0" onPay={pay} onCancel={cancel} tag="Exemple" />
      )}
      <div className="flex justify-end">
        <GlassButton onClick={onClose}>Masquer l’exemple</GlassButton>
      </div>
    </div>
  );
}
