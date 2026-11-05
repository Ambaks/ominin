"use client";

import { useState } from "react";
import { GlassButton } from "@/components/gestion/ui";
import { Accent } from "@/components/hotels/ui";
import { guest, guestText, order, spaces, waiter, type SpaceId } from "@/lib/hotels-demo-data";
import { formatPrice } from "@/lib/menu/format";
import { CartButton, CarteList, CheckoutSheet, useCart } from "./carte";
import { useDemo } from "./store";
import { DemoFooter, Hero, Icon, Tracking, label } from "./ui";

/*
 * Le QR d'un transat, d'une cabane, d'une table : la carte de l'espace, un
 * serveur à un geste, le règlement sur la chambre. Le client déjà passé par
 * le QR de sa chambre est reconnu : son prénom, son habitude d'hier.
 */

export function SpaceView({ id, qr, qrLabel }: { id: SpaceId; qr: string; qrLabel: string }) {
  const space = spaces[id];
  const { recognised, track } = useDemo();
  const cart = useCart(space.categories);
  const [checkout, setCheckout] = useState(false);
  const usual = id === order.usual.space ? space.categories.flatMap((c) => c.items).find((item) => item.id === order.usual.itemId) : undefined;

  return (
    <>
      <Hero photo={space.photo} title={<Accent text={guestText.spaceTitle(space.name)} />} subtitle={guestText.spot(qrLabel, space.hours)}>
        {recognised && <p className="mt-4 text-sm font-semibold text-ember-1">{order.recognised(guest.name)}</p>}
        <button
          type="button"
          className="g-glass g-glass-pill g-press mt-6 flex h-12 items-center gap-2.5 pl-4 pr-5 text-sm font-semibold"
          onClick={() =>
            track({
              origin: qr,
              kind: "appel",
              team: id,
              where: qrLabel,
              guest: recognised ? guest.name : undefined,
              title: waiter.title,
              detail: guestText.spot(space.name, qrLabel),
              steps: waiter.steps(qrLabel),
              actions: waiter.actions,
            })
          }
        >
          <Icon name="bell" className="size-5 text-ember-1" />
          {waiter.call}
        </button>
      </Hero>

      <div className="flex flex-col gap-10">
        <Tracking origin={qr} />
        {recognised && usual && (
          <div className="g-glass p-g-pad">
            <div className="g-plate flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className={label}>{order.usual.kicker}</p>
                <p className="mt-1.5 font-bold">{usual.name}</p>
                <p className="text-xs text-muted">{guestText.usual(usual.detail, formatPrice(usual.price))}</p>
              </div>
              <GlassButton variant="primary" onClick={() => cart.add(usual.id)}>
                {order.usual.cta}
              </GlassButton>
            </div>
          </div>
        )}
        <CarteList categories={space.categories} cart={cart} />
      </div>

      <DemoFooter />

      {cart.count > 0 && (
        <div className="sticky bottom-0 z-10 -mx-4 mt-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <CartButton cart={cart} onClick={() => setCheckout(true)} className="shadow-2xl" />
        </div>
      )}
      {checkout && (
        <CheckoutSheet
          cart={cart}
          context={{ kind: "space", origin: qr, space: id, label: qrLabel }}
          onBack={() => setCheckout(false)}
          onClose={() => setCheckout(false)}
        />
      )}
    </>
  );
}
