"use client";

import { useMemo, useState } from "react";
import { Hero } from "@/components/menu/hero";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import type { CollectCheckoutPayload } from "@/lib/collect/shared";
import { isItemAvailable } from "@/lib/gestion/selectors";
import {
  formatPrice,
  type MenuItem,
  type OptionGroup,
  type Restaurant,
} from "@/lib/menu-data";

/*
 * Parcours de commande à emporter : menu → panier → coordonnées → Stripe
 * Checkout. Le panier ne quitte jamais ce composant ; le serveur refige
 * noms et prix depuis la base (/api/collect/checkout), le client n'envoie
 * que des références.
 */

interface SelectedChoice {
  groupId: string;
  choiceId: string;
  groupName: string;
  choiceName: string;
  supplement: number;
}

interface CartLine {
  key: string;
  item: MenuItem;
  choices: SelectedChoice[];
  quantity: number;
}

const lineUnitPrice = (line: CartLine) =>
  line.item.price +
  line.choices.reduce((sum, choice) => sum + choice.supplement, 0);

const cartTotal = (lines: CartLine[]) =>
  lines.reduce((sum, line) => sum + line.quantity * lineUnitPrice(line), 0);

function lineKey(itemId: string, choices: SelectedChoice[]): string {
  return [itemId, ...choices.map((choice) => choice.choiceId).sort()].join("|");
}

function ItemRow({
  item,
  onAdd,
}: {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
}) {
  const available = isItemAvailable(item);
  return (
    <article className="flex items-center gap-4 rounded-2xl border border-hairline bg-surface p-4">
      {item.image && (
        // eslint-disable-next-line @next/next/no-img-element -- URL saisie par l'utilisateur, hors remotePatterns de next/image
        <img
          src={item.image}
          alt=""
          className="size-16 shrink-0 rounded-xl object-cover"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="truncate font-display text-base font-medium">
            {item.name}
          </h3>
          <span className="shrink-0 font-display text-ember-1">
            {formatPrice(item.price)}
          </span>
        </div>
        {item.description && (
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted">
            {item.description}
          </p>
        )}
      </div>
      <button
        type="button"
        disabled={!available}
        onClick={() => onAdd(item)}
        className="ember-gradient shrink-0 rounded-full px-4 py-2 text-xs font-semibold text-background disabled:cursor-not-allowed disabled:opacity-45"
      >
        {available ? "+ Ajouter" : "Épuisé"}
      </button>
    </article>
  );
}

function OptionsDialog({
  item,
  onConfirm,
  onClose,
}: {
  item: MenuItem;
  onConfirm: (choices: SelectedChoice[]) => void;
  onClose: () => void;
}) {
  const groups = item.options ?? [];
  const [selected, setSelected] = useState<Record<string, string>>({});

  const missing = groups.filter(
    (group) => group.obligatoire && !selected[group.id]
  );

  const choose = (group: OptionGroup, choiceId: string) => {
    setSelected((current) => ({ ...current, [group.id]: choiceId }));
  };

  const confirm = () => {
    const choices: SelectedChoice[] = [];
    for (const group of groups) {
      const choiceId = selected[group.id];
      if (!choiceId) continue;
      const choice = group.choices.find((c) => c.id === choiceId);
      if (!choice) continue;
      choices.push({
        groupId: group.id,
        choiceId: choice.id,
        groupName: group.name,
        choiceName: choice.name,
        supplement: choice.supplement,
      });
    }
    onConfirm(choices);
  };

  return (
    <Modal
      title={item.name}
      onClose={onClose}
      footer={
        <button
          type="button"
          disabled={missing.length > 0}
          onClick={confirm}
          className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-50"
        >
          Ajouter au panier
        </button>
      }
    >
      <div className="flex flex-col gap-5">
        {groups.map((group) => (
          <fieldset key={group.id} className="flex flex-col gap-2">
            <legend className="text-sm font-semibold">
              {group.name}
              {group.obligatoire && (
                <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-ember-3">
                  Obligatoire
                </span>
              )}
            </legend>
            {group.choices.map((choice) => (
              <label
                key={choice.id}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-hairline px-3.5 py-2.5 text-sm transition-colors has-checked:border-ember-2/50 has-checked:bg-ember-2/5"
              >
                <input
                  type="radio"
                  name={group.id}
                  checked={selected[group.id] === choice.id}
                  onChange={() => choose(group, choice.id)}
                  className="accent-ember-1"
                />
                <span className="flex-1">{choice.name}</span>
                {choice.supplement > 0 && (
                  <span className="text-xs text-muted">
                    +{formatPrice(choice.supplement)}
                  </span>
                )}
              </label>
            ))}
          </fieldset>
        ))}
      </div>
    </Modal>
  );
}

function CheckoutDialog({
  slug,
  lines,
  onChangeQuantity,
  onClose,
}: {
  slug: string;
  lines: CartLine[];
  onChangeQuantity: (key: string, delta: number) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pickupMode, setPickupMode] = useState<"asap" | "time">("asap");
  const [pickupTime, setPickupTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = cartTotal(lines);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    let pickupAt: string | null = null;
    if (pickupMode === "time" && pickupTime) {
      const [hours, minutes] = pickupTime.split(":").map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      pickupAt = date.toISOString();
    }

    const payload: CollectCheckoutPayload = {
      slug,
      customer: { name: name.trim(), phone: phone.trim() },
      pickupAt,
      lines: lines.map((line) => ({
        itemId: line.item.id,
        quantity: line.quantity,
        choices: line.choices.map(({ groupId, choiceId }) => ({
          groupId,
          choiceId,
        })),
      })),
    };

    try {
      const response = await fetch("/api/collect/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !body.url) {
        throw new Error(body.error ?? "Une erreur est survenue.");
      }
      window.location.assign(body.url);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Une erreur est survenue."
      );
      setBusy(false);
    }
  };

  return (
    <Modal title="Votre commande" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <ul className="flex flex-col gap-3">
          {lines.map((line) => (
            <li key={line.key} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{line.item.name}</p>
                {line.choices.length > 0 && (
                  <p className="truncate text-xs text-faint">
                    {line.choices.map((choice) => choice.choiceName).join(" · ")}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => onChangeQuantity(line.key, -1)}
                  aria-label="Retirer un exemplaire"
                  className="flex size-7 items-center justify-center rounded-full border border-hairline text-sm text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
                >
                  −
                </button>
                <span className="w-5 text-center text-sm tabular-nums">
                  {line.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => onChangeQuantity(line.key, 1)}
                  aria-label="Ajouter un exemplaire"
                  className="flex size-7 items-center justify-center rounded-full border border-hairline text-sm text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
                >
                  +
                </button>
              </div>
              <span className="w-16 shrink-0 text-right text-sm tabular-nums text-muted">
                {formatPrice(line.quantity * lineUnitPrice(line))}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between border-t border-hairline pt-3">
          <span className="text-sm font-semibold">Total</span>
          <span className="font-display text-lg text-ember-1">
            {formatPrice(total)}
          </span>
        </div>

        <Field label="Votre nom" required>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            autoComplete="name"
            className={inputClass}
          />
        </Field>
        <Field label="Téléphone" required hint="Pour vous joindre si besoin.">
          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
            autoComplete="tel"
            className={inputClass}
          />
        </Field>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold">Retrait</legend>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-hairline px-3.5 py-2.5 text-sm has-checked:border-ember-2/50 has-checked:bg-ember-2/5">
            <input
              type="radio"
              name="pickup"
              checked={pickupMode === "asap"}
              onChange={() => setPickupMode("asap")}
              className="accent-ember-1"
            />
            Dès que possible
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-hairline px-3.5 py-2.5 text-sm has-checked:border-ember-2/50 has-checked:bg-ember-2/5">
            <input
              type="radio"
              name="pickup"
              checked={pickupMode === "time"}
              onChange={() => setPickupMode("time")}
              className="accent-ember-1"
            />
            Aujourd&apos;hui à
            <input
              type="time"
              value={pickupTime}
              onChange={(event) => {
                setPickupTime(event.target.value);
                setPickupMode("time");
              }}
              required={pickupMode === "time"}
              className={`${inputClass} w-auto`}
            />
          </label>
        </fieldset>

        {error && <p className="text-sm text-ember-3">{error}</p>}

        <button
          type="submit"
          disabled={busy || lines.length === 0}
          className="ember-gradient rounded-full px-5 py-3 text-sm font-semibold text-background disabled:opacity-60"
        >
          {busy ? "Redirection…" : `Payer ${formatPrice(total)}`}
        </button>
        <p className="text-center text-xs text-faint">
          Paiement sécurisé par Stripe. Votre commande part en cuisine dès le
          paiement confirmé.
        </p>
      </form>
    </Modal>
  );
}

export function CollectExperience({ restaurant }: { restaurant: Restaurant }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [configuring, setConfiguring] = useState<MenuItem | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  const count = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity, 0),
    [lines]
  );

  const addLine = (item: MenuItem, choices: SelectedChoice[]) => {
    const key = lineKey(item.id, choices);
    setLines((current) => {
      const existing = current.find((line) => line.key === key);
      if (existing) {
        return current.map((line) =>
          line.key === key ? { ...line, quantity: line.quantity + 1 } : line
        );
      }
      return [...current, { key, item, choices, quantity: 1 }];
    });
  };

  const onAdd = (item: MenuItem) => {
    if (item.options?.length) setConfiguring(item);
    else addLine(item, []);
  };

  const changeQuantity = (key: string, delta: number) => {
    setLines((current) =>
      current
        .map((line) =>
          line.key === key
            ? { ...line, quantity: line.quantity + delta }
            : line
        )
        .filter((line) => line.quantity > 0)
    );
  };

  return (
    <div className="flex flex-1 flex-col pb-24">
      <Hero restaurant={restaurant} />

      <main className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-5 py-8 lg:max-w-5xl lg:px-10 lg:py-12">
        <p className="ember-text -mb-4 text-[10px] font-semibold uppercase tracking-[0.28em]">
          Click & collect · Commandez, payez, passez récupérer
        </p>
        {restaurant.categories.map((category) => (
          <section key={category.id}>
            <div className="mb-3 flex items-baseline gap-4">
              <h2 className="font-display text-xl font-medium tracking-tight lg:text-2xl">
                {category.name}
              </h2>
              <span aria-hidden className="ember-gradient h-px flex-1 opacity-40" />
            </div>
            <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-2 lg:gap-4">
              {category.items.map((item) => (
                <ItemRow key={item.id} item={item} onAdd={onAdd} />
              ))}
            </div>
          </section>
        ))}
      </main>

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-background/90 p-4 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setCheckingOut(true)}
            className="ember-gradient mx-auto flex w-full max-w-md items-center justify-between rounded-full px-6 py-3.5 text-sm font-semibold text-background"
          >
            <span>
              Voir la commande · {count} article{count > 1 ? "s" : ""}
            </span>
            <span>{formatPrice(cartTotal(lines))}</span>
          </button>
        </div>
      )}

      {configuring && (
        <OptionsDialog
          item={configuring}
          onClose={() => setConfiguring(null)}
          onConfirm={(choices) => {
            addLine(configuring, choices);
            setConfiguring(null);
          }}
        />
      )}
      {checkingOut && (
        <CheckoutDialog
          slug={restaurant.slug}
          lines={lines}
          onChangeQuantity={changeQuantity}
          onClose={() => setCheckingOut(false)}
        />
      )}
    </div>
  );
}
