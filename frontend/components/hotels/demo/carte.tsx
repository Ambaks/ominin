"use client";

import { useMemo, useState } from "react";
import { GlassButton, Input, Sheet, Textarea } from "@/components/gestion/ui";
import { dietLabels, folio, guest, guestText, order, room, roomLabel, spaces, type Category, type Diet, type Item, type SpaceId } from "@/lib/hotels-demo-data";
import { formatPrice } from "@/lib/menu/format";
import { clock, useDemo } from "./store";
import { Choice, Icon, label } from "./ui";

/*
 * Commander : la carte d'un espace ou du room service, le panier, puis le
 * règlement — sur la chambre (le client reconnu signe, l'inconnu donne sa
 * chambre et son nom) ou par carte. La commande part dans le suivi, et sur la
 * note quand elle est signée.
 */

export type OrderContext = { kind: "room"; origin: string } | { kind: "space"; origin: string; space: SpaceId; label: string };

export function useCart(categories: readonly Category[]) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const items = useMemo(() => new Map(categories.flatMap((c) => c.items.map((item) => [item.id, item] as const))), [categories]);
  const lines = Object.entries(quantities).flatMap(([id, qty]) => {
    const item = items.get(id);
    return item && qty > 0 ? [{ item, qty }] : [];
  });
  const change = (id: string, delta: number) =>
    setQuantities((q) => ({ ...q, [id]: Math.max(0, (q[id] ?? 0) + delta) }));
  return {
    lines,
    qty: (id: string) => quantities[id] ?? 0,
    add: (id: string) => change(id, 1),
    remove: (id: string) => change(id, -1),
    clear: () => setQuantities({}),
    count: lines.reduce((sum, l) => sum + l.qty, 0),
    subtotal: lines.reduce((sum, l) => sum + l.qty * l.item.price, 0),
  };
}

export type Cart = ReturnType<typeof useCart>;

function Stepper({ item, cart }: { item: Item; cart: Cart }) {
  const qty = cart.qty(item.id);
  const plus = (
    <button
      type="button"
      onClick={() => cart.add(item.id)}
      aria-label={order.add(item.name)}
      className="ember-gradient g-press flex size-9 items-center justify-center rounded-full text-background"
    >
      <Icon name="plus" className="size-4" />
    </button>
  );
  if (qty === 0) return plus;
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => cart.remove(item.id)}
        aria-label={order.remove(item.name)}
        className="g-press flex size-9 items-center justify-center rounded-full ring-1 ring-hairline"
      >
        <Icon name="minus" className="size-4" />
      </button>
      <span className="w-4 text-center text-sm font-bold tabular-nums" aria-live="polite">
        {qty}
      </span>
      {plus}
    </div>
  );
}

/** La carte : rubriques en pastilles, filtres de régime, une ligne par article. */
export function CarteList({ categories, cart }: { categories: readonly Category[]; cart?: Cart }) {
  const [active, setActive] = useState(0);
  const [diets, setDiets] = useState<Diet[]>([]);
  const items = categories[active].items.filter((item) => diets.every((d) => item.diets?.includes(d)));
  return (
    <div>
      <div className="hd-scroller -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {categories.map((category, i) => (
          <Choice key={category.name} on={i === active} onClick={() => setActive(i)} className="shrink-0">
            {category.name}
          </Choice>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className={label}>{order.filters}</span>
        {(Object.keys(dietLabels) as Diet[]).map((diet) => (
          <Choice
            key={diet}
            on={diets.includes(diet)}
            onClick={() => setDiets((d) => (d.includes(diet) ? d.filter((x) => x !== diet) : [...d, diet]))}
            className="hd-chip-sm"
          >
            {dietLabels[diet]}
          </Choice>
        ))}
      </div>
      <ul className="mt-4 flex flex-col">
        {items.map((item) => (
          <li key={item.id} className="grid grid-cols-[1fr_auto] gap-x-4 border-t border-hairline py-4 first:border-t-0">
            <div className="min-w-0">
              <h3 className="font-semibold leading-snug">{item.name}</h3>
              <p className="mt-0.5 text-sm text-muted">{item.detail}</p>
              {item.allergens && (
                <p className="mt-1.5 text-xs text-faint">{guestText.allergens(item.allergens)}</p>
              )}
              {item.diets && (
                <p className="mt-1.5 flex flex-wrap gap-1.5">
                  {item.diets.map((diet) => (
                    <span key={diet} className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-ember-1 ring-1 ring-hairline">
                      {dietLabels[diet]}
                    </span>
                  ))}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end justify-between gap-3">
              <span className="text-sm font-semibold tabular-nums">{formatPrice(item.price)}</span>
              {cart && <Stepper item={item} cart={cart} />}
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="py-6 text-sm text-muted">{order.noMatch}</li>}
      </ul>
    </div>
  );
}

export function CartButton({ cart, onClick, className = "" }: { cart: Cart; onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={`g-btn g-btn-primary g-press w-full justify-between px-5 ${className}`}>
      <span>{order.cartBar(cart.count)}</span>
      <span className="tabular-nums">{formatPrice(cart.subtotal)}</span>
    </button>
  );
}

const summary = (cart: Cart) => guestText.listed(cart.lines.map((l) => guestText.line(l.qty, l.item.name)));

/** Le panier et le règlement. */
export function CheckoutSheet({
  cart,
  context,
  onBack,
  onClose,
}: {
  cart: Cart;
  context: OrderContext;
  onBack: () => void;
  onClose: () => void;
}) {
  const { recognised, recognise, charge, track } = useDemo();
  const isRoom = context.kind === "room";
  const known = isRoom || recognised;
  const [slot, setSlot] = useState<string | null>(null);
  const [tip, setTip] = useState(0);
  const [pay, setPay] = useState<"room" | "card">("room");
  const [roomNumber, setRoomNumber] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState(false);
  const [note, setNote] = useState("");

  const total = cart.subtotal + tip;
  const served = isRoom ? room.roomService.served : spaces[context.space].served(context.label);

  function submit() {
    if (pay === "room" && !known) {
      if (roomNumber.trim() !== guest.room || name.trim().toLowerCase() !== guest.lastName.toLowerCase()) {
        setError(true);
        return;
      }
      recognise();
    }
    const what = summary(cart);
    const where = isRoom ? room.roomService.sheetTitle : spaces[context.space].short;
    if (pay === "room") charge({ space: where, when: folio.today(clock()), item: isRoom ? what : guestText.onSpot(what, context.label), amount: total });
    const steps = isRoom ? room.roomService.steps(guest.room) : spaces[context.space].steps(context.label);
    track({
      origin: context.origin,
      kind: "commande",
      team: isRoom ? "room-service" : context.space,
      where: isRoom ? roomLabel(guest.room) : context.label,
      guest: known || pay === "room" ? guest.name : undefined,
      title: what,
      detail: guestText.joined([served, pay === "room" ? order.pay.room(guest.room) : order.pay.card, formatPrice(total), note.trim() && guestText.quote(note.trim())]),
      steps: slot ? [room.roomService.scheduled(slot), ...steps.slice(1)] : steps,
      actions: isRoom ? room.roomService.actions : spaces[context.space].actions,
      ticket: {
        lines: cart.lines.map(({ item, qty }) => ({ qty, name: item.name })),
        total,
        tip,
        room: pay === "room" ? guest.room : undefined,
        note: note.trim() || undefined,
        slot: slot ?? undefined,
      },
    });
    cart.clear();
    onClose();
  }

  return (
    <Sheet
      title={order.cartTitle}
      onClose={onClose}
      footer={
        <>
          <GlassButton onClick={onBack}>{order.back}</GlassButton>
          <GlassButton variant="primary" onClick={submit} disabled={cart.count === 0}>
            {pay === "room" ? order.pay.sign(formatPrice(total)) : order.pay.payCard(formatPrice(total))}
          </GlassButton>
        </>
      }
    >
      <ul className="flex flex-col">
        {cart.lines.map(({ item, qty }) => (
          <li key={item.id} className="flex items-center justify-between gap-3 border-t border-hairline py-3 first:border-t-0 first:pt-0">
            <span className="min-w-0">
              <span className="block font-semibold leading-snug">{item.name}</span>
              <span className="text-xs tabular-nums text-muted">{formatPrice(item.price * qty)}</span>
            </span>
            <Stepper item={item} cart={cart} />
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-col gap-6">
        {isRoom ? (
          <fieldset>
            <legend className={label}>{order.delivery}</legend>
            <div className="mt-3 flex flex-col gap-2">
              <Choice on={slot === null} onClick={() => setSlot(null)} className="justify-between">
                <span>{room.roomService.asap.label}</span>
                <span className="font-normal opacity-80">{room.roomService.asap.hint}</span>
              </Choice>
              <p className="mt-2 text-xs text-muted">{room.roomService.slotsLabel}</p>
              <div className="grid grid-cols-2 gap-2">
                {room.roomService.slots.map((s) => (
                  <Choice key={s} on={slot === s} onClick={() => setSlot(s)} className="tabular-nums">
                    {s}
                  </Choice>
                ))}
              </div>
            </div>
          </fieldset>
        ) : (
          <>
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Icon name="check" className="size-4 text-ember-1" />
              {served}
            </p>
            <fieldset>
              <legend className={label}>{order.tip.label}</legend>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {order.tip.options.map((amount) => (
                  <Choice key={amount} on={tip === amount} onClick={() => setTip(amount)} className="px-2 tabular-nums">
                    {amount === 0 ? order.tip.none : formatPrice(amount)}
                  </Choice>
                ))}
              </div>
            </fieldset>
          </>
        )}

        <label className="flex flex-col gap-2">
          <span className={label}>{order.note.label}</span>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={order.note.placeholder} />
        </label>

        <fieldset>
          <legend className={label}>{order.pay.label}</legend>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Choice on={pay === "room"} onClick={() => setPay("room")} className="px-2">
              {known ? order.pay.room(guest.room) : order.pay.roomUnknown}
            </Choice>
            <Choice on={pay === "card"} onClick={() => setPay("card")} className="px-2">
              {order.pay.card}
            </Choice>
          </div>
          {pay === "card" && <p className="mt-3 text-xs text-muted">{order.pay.cardNote}</p>}
          {pay === "room" && !known && (
            <div className="hd-row mt-3 flex flex-col gap-3 p-4">
              <p className="text-sm font-semibold">{order.verify.title}</p>
              <p className="text-xs text-muted">{order.verify.text}</p>
              <div className="grid grid-cols-[6rem_1fr] gap-2">
                <label className="flex flex-col gap-1.5">
                  <span className={label}>{order.verify.room}</span>
                  <Input numeric inputMode="numeric" value={roomNumber} onChange={(e) => (setRoomNumber(e.target.value), setError(false))} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={label}>{order.verify.name}</span>
                  <Input autoComplete="family-name" value={name} onChange={(e) => (setName(e.target.value), setError(false))} />
                </label>
              </div>
              {error && (
                <p role="alert" className="text-xs font-semibold text-ember-1">
                  {order.verify.error}
                </p>
              )}
              <p className="text-xs text-faint">{order.verify.hint}</p>
            </div>
          )}
        </fieldset>
      </div>
    </Sheet>
  );
}
