"use client";

import { useEffect, useState } from "react";
import { GlassButton, Input, Sheet } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { STAFF_ORDER_ENTERED_KEY } from "@/lib/gestion/constants";
import type { GestionState } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu/format";
import {
  OptionConfigurator,
  PlusIcon,
  StaffLinesList,
  StaffMenu,
  useStaffOrder,
} from "./order-picker";
import { describeError } from "@/lib/gestion/errors";

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
  onEntry,
}: {
  state: GestionState;
  onClose: () => void;
  onEntry?: (entering: boolean) => void;
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
    onEntry?.(true);
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
      // Une commande saisie sur cet appareil : le bouton flottant se replie en rond.
      window.localStorage.setItem(STAFF_ORDER_ENTERED_KEY, "1");
      onClose();
    } catch (error) {
      toast.error(describeError(error).message);
      setSending(false);
    } finally {
      onEntry?.(false);
    }
  };

  if (order.configuring) {
    return (
      <Sheet title="Nouvelle commande" onClose={onClose}>
        <OptionConfigurator
          item={order.configuring}
          onAdd={order.addLine}
          onBack={() => order.setConfiguring(null)}
        />
      </Sheet>
    );
  }

  // Ce qui manque pour enregistrer, dit à côté du bouton plutôt que par un bouton muet.
  const missing =
    !fastFood && tableNumber === null
      ? "Choisissez une table pour enregistrer."
      : order.lines.length === 0
        ? "Ajoutez un article pour enregistrer."
        : null;

  return (
    <Sheet
      title="Nouvelle commande"
      onClose={onClose}
      footer={
        <>
          {missing && <p>{missing}</p>}
          <span className="g-money mr-auto flex items-baseline gap-2">
            <span className="text-g-body text-muted">Total</span>
            <span className="text-g-name tabular-nums text-g-entity">{formatPrice(order.total)}</span>
          </span>
          <GlassButton variant="primary" disabled={missing !== null || sending} onClick={() => void submit()}>
            {sending ? "Envoi…" : "Enregistrer la commande"}
          </GlassButton>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {!fastFood && (
          <div className="flex flex-col gap-2.5">
            <p className="text-g-body font-medium">Table</p>
            <div className="flex flex-wrap gap-2">
              {tables.map((table) => {
                const selected = tableNumber === table.number;
                return (
                  <button
                    key={table.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setPickedNumber(table.number);
                      setNewNumberRaw("");
                    }}
                    className={`g-btn g-press min-w-g-control tabular-nums ${selected ? "g-btn-primary" : "g-btn-secondary"}`}
                  >
                    {table.number}
                  </button>
                );
              })}
              <label className="flex items-center gap-2 text-g-label font-semibold text-muted">
                Nouvelle
                <Input
                  inputMode="numeric"
                  value={newNumberRaw}
                  onChange={(event) => setNewNumberRaw(event.target.value)}
                  placeholder="n°"
                  aria-label="Numéro d'une nouvelle table"
                  className="w-20 text-center"
                />
              </label>
            </div>
          </div>
        )}

        <StaffLinesList order={order} />
        <StaffMenu order={order} />
      </div>
    </Sheet>
  );
}

/**
 * Le bouton flottant « Nouvelle commande » : rond, posé au-dessus de la barre
 * d'onglets. Il porte son mot tant qu'aucune commande n'a été saisie sur cet
 * appareil (§ 3.8) et que l'écran ne l'écrit pas déjà (`quiet`), puis se
 * replie. La page Tables l'utilise sans rien lui dire : il tient alors son
 * dialogue lui-même.
 */
export function CreateOrderFab({
  state,
  quiet = false,
  labelled = true,
  open,
  onOpen,
  onClose,
  onEntry,
}: {
  state: GestionState;
  /** Une saisie part de cet appareil : son arrivée n'a pas à s'annoncer ici. */
  onEntry?: (entering: boolean) => void;
  /** L'écran porte déjà un bouton « Nouvelle commande » : le flottant reste rond. */
  quiet?: boolean;
  /** La page Tables autorise le libellé seulement sans table ouverte. */
  labelled?: boolean;
  /** Dialogue tenu par la page (ouvert aussi depuis l'état vide) ; sinon, par le bouton. */
  open?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}) {
  const [own, setOwn] = useState(false);
  const [entered, setEntered] = useState(true);
  useEffect(() => {
    // Lu après le montage : le serveur ne connaît pas cet appareil.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntered(window.localStorage.getItem(STAFF_ORDER_ENTERED_KEY) !== null);
  }, []);
  // Le mot se lit en haut de page ; dès qu'on défile, le bouton se replie pour
  // ne pas couvrir l'action d'une carte.
  const [scrolled, setScrolled] = useState(false);
  const wantsLabel = labelled && !entered && !quiet;
  useEffect(() => {
    if (!wantsLabel) return;
    const onScroll = () => setScrolled(window.scrollY > 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [wantsLabel]);
  const isOpen = open ?? own;
  const showLabel = wantsLabel && !scrolled;
  return (
    <>
      <div className="print:hidden">
        <button
          type="button"
          data-visite="prise-commande"
          onClick={onOpen ?? (() => setOwn(true))}
          aria-label="Nouvelle commande"
          title="Nouvelle commande"
          className={`g-fab g-press ${showLabel ? "g-fab-label" : ""}`}
        >
          <PlusIcon className="size-6" />
          {showLabel && <span>Nouvelle commande</span>}
        </button>
      </div>
      {isOpen && (
        <CreateOrderDialog
          state={state}
          onEntry={onEntry}
          onClose={() => {
            setOwn(false);
            setEntered(window.localStorage.getItem(STAFF_ORDER_ENTERED_KEY) !== null);
            onClose?.();
          }}
        />
      )}
    </>
  );
}
