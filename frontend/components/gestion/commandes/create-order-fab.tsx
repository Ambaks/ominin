"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import type { GestionState } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu-data";
import {
  OptionConfigurator,
  PlusIcon,
  StaffLinesList,
  StaffMenu,
  useStaffOrder,
} from "./order-picker";

/*
 * Prise de commande en salle : quand un client commande directement auprès
 * du serveur, celui-ci saisit la commande ici — même circuit que le menu QR
 * (place_order valide articles, stock et options). La table se choisit parmi
 * les numéros connus, ou se crée d'un nouveau numéro. La commande attend
 * ensuite son encaissement : c'est lui qui la fait partir en cuisine.
 */

function CreateOrderDialog({
  state,
  onClose,
}: {
  state: GestionState;
  onClose: () => void;
}) {
  const toast = useToast();
  const order = useStaffOrder(state);
  const [pickedNumber, setPickedNumber] = useState<number | null>(null);
  const [newNumberRaw, setNewNumberRaw] = useState("");
  const [sending, setSending] = useState(false);

  const tables = [...state.tables].sort((a, b) => a.number - b.number);
  // Fast food : pas de table à choisir, la commande prend son numéro du jour.
  const fastFood = state.etablissement.serviceMode === "fast_food";

  // Un numéro saisi prime sur la tuile touchée ; s'il existe déjà, c'est
  // cette table-là (place_order ne crée que les numéros inconnus).
  const newNumber = Number.parseInt(newNumberRaw, 10);
  const tableNumber = newNumberRaw
    ? Number.isInteger(newNumber) && newNumber > 0
      ? newNumber
      : null
    : pickedNumber;

  const submit = async () => {
    if ((!fastFood && tableNumber === null) || order.lines.length === 0) {
      return;
    }
    setSending(true);
    try {
      const orderNumber = await api.createStaffOrder(
        fastFood ? null : tableNumber,
        order.payload
      );
      toast.success(
        fastFood
          ? `Commande n° ${orderNumber ?? "—"} enregistrée, à encaisser.`
          : `Commande enregistrée — table ${tableNumber}, à encaisser.`
      );
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
      setSending(false);
    }
  };

  if (order.configuring) {
    return (
      <Modal title="Nouvelle commande" onClose={onClose}>
        <OptionConfigurator
          item={order.configuring}
          onAdd={order.addLine}
          onBack={() => order.setConfiguring(null)}
        />
      </Modal>
    );
  }

  return (
    <Modal
      title="Nouvelle commande"
      onClose={onClose}
      footer={
        <>
          <span className="mr-auto flex items-baseline gap-2">
            <span className="text-sm text-muted">Total</span>
            <span className="font-display text-xl text-ember-1">
              {formatPrice(order.total)}
            </span>
          </span>
          <button
            type="button"
            disabled={
              (!fastFood && tableNumber === null) ||
              order.lines.length === 0 ||
              sending
            }
            onClick={() => void submit()}
            className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-40"
          >
            {sending ? "Envoi…" : "Enregistrer la commande"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {!fastFood && (
          <div className="flex flex-col gap-2.5">
            <p className="text-sm font-medium">Table</p>
            <div className="flex flex-wrap gap-2">
              {tables.map((table) => {
                const selected = tableNumber === table.number;
                return (
                  <button
                    key={table.id}
                    type="button"
                    onClick={() => {
                      setPickedNumber(table.number);
                      setNewNumberRaw("");
                    }}
                    className={`flex size-10 items-center justify-center rounded-xl text-sm font-semibold tabular-nums transition-colors ${
                      selected
                        ? "ember-gradient text-background"
                        : "border border-hairline text-muted hover:border-ember-2/40 hover:text-foreground"
                    }`}
                  >
                    {table.number}
                  </button>
                );
              })}
              <label className="flex h-10 items-center gap-2 rounded-xl border border-dashed border-hairline px-3 text-xs font-semibold text-muted transition-colors focus-within:border-ember-2/50">
                Nouvelle
                <input
                  type="text"
                  inputMode="numeric"
                  value={newNumberRaw}
                  onChange={(event) => setNewNumberRaw(event.target.value)}
                  placeholder="n°"
                  aria-label="Numéro d'une nouvelle table"
                  className="w-10 bg-transparent text-center text-sm font-semibold tabular-nums text-foreground outline-none placeholder:text-faint"
                />
              </label>
            </div>
          </div>
        )}

        <StaffLinesList order={order} />
        <StaffMenu order={order} />
      </div>
    </Modal>
  );
}

export function CreateOrderFab({ state }: { state: GestionState }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        data-visite="prise-commande"
        onClick={() => setOpen(true)}
        aria-label="Nouvelle commande"
        title="Nouvelle commande"
        className="ember-flow fab-breathe group fixed bottom-24 right-5 z-30 flex size-14 items-center justify-center rounded-full text-background transition-transform hover:scale-105 active:scale-95 lg:bottom-10 lg:right-10 print:hidden"
      >
        <PlusIcon className="size-6 transition-transform duration-300 group-hover:rotate-90" />
      </button>
      {open && (
        <CreateOrderDialog state={state} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
