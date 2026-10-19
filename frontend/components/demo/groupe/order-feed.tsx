"use client";

import { Fragment, useState } from "react";
import type { GroupFixture } from "@/lib/demo/groupe/data";
import { isLate, statusAt, type GroupOrder } from "@/lib/demo/groupe/simulation";
import { basketParts, formatAgo, formatBasket, formatCents } from "@/lib/demo/reseau/format";
import { StatusPill } from "./ui";

const channelLabel = (order: GroupOrder) =>
  order.channel === "equipe" ? "Saisie par l’équipe" : order.online ? "QR · payée en ligne" : "QR · au comptoir";

const keyOf = (order: GroupOrder) => `${order.venue}:${order.number}`;

/**
 * Les dernières commandes des adresses, la plus récente en haut : l'adresse à
 * sa couleur, la table, le panier, l'état. Une commande arrivée après
 * l'ouverture de la page grandit depuis une hauteur nulle (`groupe-enter`) :
 * les lignes du dessous descendent sans saut. Au téléphone, la ligne qui sort
 * de l'aperçu se replie d'autant (`groupe-row`) au lieu de disparaître d'un coup.
 */
export function OrderFeed({
  fixture,
  names,
  orders,
  t,
  day,
}: {
  fixture: GroupFixture;
  /** Le nom de chaque adresse, dans l'ordre de la fixture. */
  names: string[];
  /** La plus récente en premier. */
  orders: GroupOrder[];
  t: number;
  /** Le jour de service : à chaque nouveau jour, les commandes déjà là arrivent sans animation. */
  day: string;
}) {
  const preview = fixture.display.feedPreview;
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(() => ({ day, keys: new Set(orders.map(keyOf)) }));
  if (seen.day !== day) setSeen({ day, keys: new Set(orders.map(keyOf)) });

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:overflow-y-auto lg:[mask-image:linear-gradient(to_bottom,black_calc(100%-2rem),transparent)]">
      <ol aria-label="Dernières commandes" className="flex flex-col lg:pb-8">
        {orders.map((order, i) => {
          const key = keyOf(order);
          // Chaque article nommé reste d'un seul tenant : le panier passe à la ligne entre deux articles, jamais au milieu d'un nom.
          const named = order.lines.slice(0, 2).map((line, n) => (n ? `+ ${formatBasket([line])}` : formatBasket([line])));
          const { more } = basketParts(order.lines, named.length);
          const folded = i >= preview && !open;
          return (
            <li
              key={key}
              className={`groupe-row grid grid-rows-[1fr] ${seen.keys.has(key) ? "" : "groupe-enter"} ${folded ? "max-lg:invisible max-lg:grid-rows-[0fr]" : ""}`}
              style={{ "--venue": fixture.venues[order.venue].color } as React.CSSProperties}
            >
              <div className="min-h-0 overflow-hidden">
                <div
                  className={`grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3 gap-y-1 px-4 py-3 sm:px-5 ${
                    i < orders.length - 1 ? "border-b border-hairline" : ""
                  }`}
                >
                  <span aria-hidden className="col-start-1 row-start-1 row-end-4 w-[3px] rounded-full bg-(--venue)" />
                  <p className="col-start-2 row-start-1 truncate text-sm">
                    <span className="font-semibold">{names[order.venue]}</span>
                    <span className="text-faint"> · Table {order.table}</span>
                  </p>
                  <p className="col-start-2 row-start-2 text-[0.8125rem] text-muted">
                    {named.map((part, n) => (
                      <Fragment key={n}>
                        {n > 0 && " "}
                        <span className="inline-block max-w-full">{part}</span>
                      </Fragment>
                    ))}
                    {more && (
                      <>
                        {" "}
                        <span className="inline-block text-faint">{more}</span>
                      </>
                    )}
                  </p>
                  <p className="col-start-3 row-start-1 justify-self-end text-sm font-semibold tabular-nums">{formatCents(order.total)}</p>
                  <div className="col-start-3 row-start-2 row-end-4 justify-self-end">
                    <StatusPill status={statusAt(order, t)!} kitchen={order.kitchen} late={isLate(fixture, order, t)} />
                  </div>
                  <p className="col-start-2 row-start-3 text-xs text-faint">
                    {channelLabel(order)} · {formatAgo(t - order.createdAt)}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {orders.length > preview && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="mx-4 mt-1 mb-4 rounded-full border border-hairline py-2 text-sm font-medium text-muted transition-colors hover:text-foreground lg:hidden"
        >
          {open ? "Voir moins" : `Voir les ${orders.length} dernières`}
        </button>
      )}
    </div>
  );
}
