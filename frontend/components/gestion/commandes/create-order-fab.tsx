"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { isItemAvailable } from "@/lib/gestion/selectors";
import type { GestionState } from "@/lib/gestion/types";
import { formatPrice, type MenuItem } from "@/lib/menu-data";

/*
 * Prise de commande en salle : quand un client commande directement auprès
 * du serveur, celui-ci saisit la commande ici — même circuit que le menu QR
 * (place_order valide articles, stock et options, et prévient la cuisine).
 */

interface CartLine {
  key: string;
  itemId: string;
  name: string;
  /** Prix unitaire suppléments compris (comme le fige place_order). */
  unitPrice: number;
  quantity: number;
  choiceSummary: string[];
  choices: { group_id: string; choice_id: string }[];
}

function lineKey(itemId: string, choices: { choice_id: string }[]): string {
  return [itemId, ...choices.map((choice) => choice.choice_id).sort()].join(":");
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function OptionConfigurator({
  item,
  onAdd,
  onBack,
}: {
  item: MenuItem;
  onAdd: (line: CartLine) => void;
  onBack: () => void;
}) {
  const groups = item.options ?? [];
  const [selection, setSelection] = useState<Record<string, string>>({});
  const complete = groups.every(
    (group) => !group.obligatoire || selection[group.id]
  );

  const add = () => {
    const choices: { group_id: string; choice_id: string }[] = [];
    const summary: string[] = [];
    let supplement = 0;
    for (const group of groups) {
      const choiceId = selection[group.id];
      if (!choiceId) continue;
      const choice = group.choices.find((c) => c.id === choiceId);
      if (!choice) continue;
      choices.push({ group_id: group.id, choice_id: choiceId });
      summary.push(`${group.name} : ${choice.name}`);
      supplement += choice.supplement;
    }
    onAdd({
      key: lineKey(item.id, choices),
      itemId: item.id,
      name: item.name,
      unitPrice: item.price + supplement,
      quantity: 1,
      choiceSummary: summary,
      choices,
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-display text-lg font-medium">{item.name}</p>
        <span className="text-sm tabular-nums text-muted">
          {formatPrice(item.price)}
        </span>
      </div>
      {groups.map((group) => (
        <div key={group.id} className="flex flex-col gap-2">
          <p className="text-sm font-medium">
            {group.name}
            {!group.obligatoire && (
              <span className="ml-1.5 text-xs font-normal text-faint">
                (facultatif)
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.choices.map((choice) => {
              const selected = selection[group.id] === choice.id;
              return (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() =>
                    setSelection((current) =>
                      selected && !group.obligatoire
                        ? Object.fromEntries(
                            Object.entries(current).filter(
                              ([id]) => id !== group.id
                            )
                          )
                        : { ...current, [group.id]: choice.id }
                    )
                  }
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    selected
                      ? "ember-gradient text-background"
                      : "border border-hairline text-muted hover:border-ember-2/40 hover:text-foreground"
                  }`}
                >
                  {choice.name}
                  {choice.supplement > 0 && (
                    <span className="ml-1 tabular-nums opacity-80">
                      +{formatPrice(choice.supplement)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="flex justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-hairline px-4 py-2 text-sm font-semibold transition-colors hover:border-ember-2/40"
        >
          Retour
        </button>
        <button
          type="button"
          disabled={!complete}
          onClick={add}
          className="ember-gradient rounded-full px-5 py-2 text-sm font-semibold text-background disabled:opacity-40"
        >
          Ajouter
        </button>
      </div>
    </div>
  );
}

function CreateOrderDialog({
  state,
  onClose,
}: {
  state: GestionState;
  onClose: () => void;
}) {
  const toast = useToast();
  const [tableNumber, setTableNumber] = useState<number | null>(null);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [configuring, setConfiguring] = useState<MenuItem | null>(null);
  const [sending, setSending] = useState(false);

  const tables = [...state.tables].sort((a, b) => a.number - b.number);
  const categories = state.categories
    .map((category) => ({
      ...category,
      items: category.items.filter(isItemAvailable),
    }))
    .filter((category) => category.items.length > 0);

  const total = lines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0
  );

  const addLine = (line: CartLine) => {
    setLines((current) => {
      const existing = current.find((candidate) => candidate.key === line.key);
      if (!existing) return [...current, line];
      return current.map((candidate) =>
        candidate.key === line.key
          ? { ...candidate, quantity: candidate.quantity + line.quantity }
          : candidate
      );
    });
    setConfiguring(null);
  };

  const bumpLine = (key: string, delta: number) => {
    setLines((current) =>
      current
        .map((line) =>
          line.key === key ? { ...line, quantity: line.quantity + delta } : line
        )
        .filter((line) => line.quantity > 0)
    );
  };

  const addItem = (item: MenuItem) => {
    if (item.options?.length) {
      setConfiguring(item);
      return;
    }
    addLine({
      key: lineKey(item.id, []),
      itemId: item.id,
      name: item.name,
      unitPrice: item.price,
      quantity: 1,
      choiceSummary: [],
      choices: [],
    });
  };

  const submit = async () => {
    if (tableNumber === null || lines.length === 0) return;
    setSending(true);
    try {
      await api.createStaffOrder(
        tableNumber,
        lines.map((line) => ({
          itemId: line.itemId,
          quantity: line.quantity,
          choices: line.choices,
        }))
      );
      toast.success(`Commande envoyée en cuisine — table ${tableNumber}.`);
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
      setSending(false);
    }
  };

  if (configuring) {
    return (
      <Modal title="Nouvelle commande" onClose={onClose}>
        <OptionConfigurator
          item={configuring}
          onAdd={addLine}
          onBack={() => setConfiguring(null)}
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
              {formatPrice(total)}
            </span>
          </span>
          <button
            type="button"
            disabled={tableNumber === null || lines.length === 0 || sending}
            onClick={() => void submit()}
            className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-40"
          >
            {sending ? "Envoi…" : "Envoyer en cuisine"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2.5">
          <p className="text-sm font-medium">Table</p>
          <div className="flex flex-wrap gap-2">
            {tables.map((table) => {
              const selected = tableNumber === table.number;
              return (
                <button
                  key={table.id}
                  type="button"
                  onClick={() => setTableNumber(table.number)}
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
          </div>
        </div>

        {lines.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <p className="text-sm font-medium">Commande</p>
            <ul className="flex flex-col rounded-2xl border border-hairline bg-surface">
              {lines.map((line, index) => (
                <li
                  key={line.key}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    index > 0 ? "border-t border-hairline" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{line.name}</p>
                    {line.choiceSummary.length > 0 && (
                      <p className="truncate text-xs text-faint">
                        {line.choiceSummary.join(" · ")}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2.5 rounded-full border border-hairline px-1">
                    <button
                      type="button"
                      onClick={() => bumpLine(line.key, -1)}
                      className="flex size-7 items-center justify-center text-lg text-muted"
                      aria-label={`Retirer un ${line.name}`}
                    >
                      −
                    </button>
                    <span className="min-w-4 text-center text-sm font-semibold tabular-nums">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => bumpLine(line.key, 1)}
                      className="flex size-7 items-center justify-center text-lg text-muted"
                      aria-label={`Ajouter un ${line.name}`}
                    >
                      +
                    </button>
                  </div>
                  <span className="shrink-0 text-sm tabular-nums text-ember-1">
                    {formatPrice(line.unitPrice * line.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {categories.map((category) => (
            <div key={category.id} className="flex flex-col gap-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
                {category.name}
              </p>
              <ul className="flex flex-col">
                {category.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 border-b border-hairline py-2.5 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{item.name}</p>
                      {item.options && item.options.length > 0 && (
                        <p className="text-xs text-faint">Avec options</p>
                      )}
                    </div>
                    <span className="shrink-0 text-sm tabular-nums text-muted">
                      {formatPrice(item.price)}
                    </span>
                    <button
                      type="button"
                      onClick={() => addItem(item)}
                      aria-label={`Ajouter ${item.name}`}
                      className="flex size-8 shrink-0 items-center justify-center rounded-full border border-hairline text-muted transition-colors hover:border-ember-2/40 hover:text-ember-1"
                    >
                      <PlusIcon className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
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
