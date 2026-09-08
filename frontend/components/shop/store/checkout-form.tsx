"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { itemUnitPrice, useCart } from "@/lib/shop/cart";
import { WITHDRAWAL_DAYS } from "@/lib/shop/constants";
import { countryName, formatPrice } from "@/lib/shop/format";
import { computeShippingCents, shippingDelayLabel } from "@/lib/shop/pricing";
import type { ShopShippingMethod } from "@/lib/shop/types";
import { ArrowRightIcon, GiftIcon, LockIcon } from "../icons";
import { useShop } from "./context";
import { shopHref } from "./href";
import { Alert, Button, ButtonLink, Checkbox, EmptyState, Field, Input, Select, Textarea } from "./ui";

/*
 * Tunnel de commande : coordonnées, livraison, cadeau, récapitulatif, puis
 * redirection vers Stripe Checkout. Le récapitulatif est indicatif — le
 * serveur (/api/shop/checkout) recalcule tout depuis la base.
 */

interface CheckoutFormProps {
  methods: ShopShippingMethod[];
  freeShippingThreshold: number | null;
  initialEmail: string | null;
  paymentsEnabled: boolean;
  cancelled: boolean;
}

export function CheckoutForm(props: CheckoutFormProps) {
  const { hydrated, giftMessage } = useCart();
  if (!hydrated) return <div className="h-96 animate-pulse rounded-[24px] bg-shop-tint" aria-busy />;
  return <CheckoutFormInner {...props} initialGiftMessage={giftMessage} />;
}

function CheckoutFormInner({ methods, freeShippingThreshold, initialEmail, paymentsEnabled, cancelled, initialGiftMessage }: CheckoutFormProps & { initialGiftMessage: string }) {
  const { slug } = useShop();
  const { items, subtotal, setGiftMessage: storeGiftMessage } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState(initialEmail ?? "");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const countries = useMemo(() => [...new Set(methods.flatMap((m) => m.countries.map((c) => c.toUpperCase())))], [methods]);
  const [country, setCountry] = useState(countries.includes("FR") ? "FR" : countries[0] ?? "FR");
  const available = useMemo(() => methods.filter((m) => m.countries.map((c) => c.toUpperCase()).includes(country)), [methods, country]);
  const [methodId, setMethodId] = useState<string>(available[0]?.id ?? "");
  const method = available.find((m) => m.id === methodId) ?? available[0] ?? null;
  const [address, setAddress] = useState({ line1: "", line2: "", postal_code: "", city: "" });
  const [relay, setRelay] = useState({ name: "", address: "", postal_code: "", city: "", code: "" });
  const [isGift, setIsGift] = useState(Boolean(initialGiftMessage));
  const [giftMessage, setGiftMessage] = useState(initialGiftMessage);
  const [customerNote, setCustomerNote] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [discountInput, setDiscountInput] = useState("");
  const [discount, setDiscount] = useState<{ code: string; cents: number; description: string } | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [discountBusy, setDiscountBusy] = useState(false);

  if (items.length === 0) {
    return (
      <EmptyState title="Ton panier est vide" description="Ajoute un article avant de passer commande." action={<ButtonLink href={shopHref(slug, "/boutique")}>Découvrir la boutique</ButtonLink>} />
    );
  }

  const shippingCents = method ? computeShippingCents(method, subtotal, freeShippingThreshold) : 0;
  const discountCents = discount?.cents ?? 0;
  const total = Math.max(0, subtotal - discountCents + shippingCents);

  const applyDiscount = async () => {
    setDiscountBusy(true);
    setDiscountError(null);
    const response = await fetch("/api/shop/discount", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, code: discountInput, subtotalCents: subtotal }),
    });
    const body = (await response.json().catch(() => ({}))) as { code?: string; discountCents?: number; description?: string; error?: string };
    if (response.ok && body.code) setDiscount({ code: body.code, cents: body.discountCents ?? 0, description: body.description ?? "" });
    else setDiscountError(body.error ?? "Code inconnu.");
    setDiscountBusy(false);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!method) return;
    setBusy(true);
    setError(null);
    storeGiftMessage(isGift ? giftMessage : "");
    const response = await fetch("/api/shop/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        email,
        firstName,
        lastName,
        phone: phone || null,
        shippingMethodId: method.id,
        country,
        address: method.kind === "home" ? { ...address, line2: address.line2 || null } : null,
        relayPoint: method.kind === "relay" ? { ...relay, code: relay.code || null } : null,
        isGift,
        giftMessage: isGift && giftMessage.trim() ? giftMessage.trim() : null,
        customerNote: customerNote.trim() || null,
        discountCode: discount?.code ?? null,
        acceptTerms,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, options: i.options.map((o) => ({ linkId: o.linkId, valueId: o.valueId })) })),
      }),
    });
    const body = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
    if (response.ok && body.url) {
      window.location.assign(body.url);
      return;
    }
    setError(body.error ?? "Une erreur est survenue.");
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="grid gap-10 lg:grid-cols-[1fr_400px] lg:items-start">
      <div className="flex flex-col gap-10">
        {cancelled && <Alert tone="info">Le paiement a été annulé. Ton panier est toujours là, tu peux reprendre où tu en étais.</Alert>}
        {!paymentsEnabled && (
          <Alert tone="warning" title="Paiement bientôt disponible">
            Le paiement en ligne n&apos;est pas encore activé sur la boutique. Tu peux nous écrire via la page Contact pour commander.
          </Alert>
        )}

        <section className="flex flex-col gap-5">
          <h2 className="text-2xl">Tes coordonnées</h2>
          <Field label="Adresse e-mail" htmlFor="email" hint="Pour la confirmation et le suivi de ta commande.">
            <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="camille@exemple.fr" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prénom" htmlFor="firstName">
              <Input id="firstName" required autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </Field>
            <Field label="Nom" htmlFor="lastName">
              <Input id="lastName" required autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </Field>
          </div>
          <Field label="Téléphone" htmlFor="phone" optional hint="Utilisé uniquement par le transporteur en cas de besoin.">
            <Input id="phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 00 00 00 00" />
          </Field>
        </section>

        <section className="flex flex-col gap-5">
          <h2 className="text-2xl">Mode de livraison</h2>
          {countries.length > 1 && (
            <Field label="Pays" htmlFor="country">
              <Select
                id="country"
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value);
                  setMethodId("");
                }}
              >
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {countryName(c)}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {available.length === 0 ? (
            <Alert tone="warning">Aucun mode de livraison n&apos;est disponible pour ce pays pour le moment.</Alert>
          ) : (
            <div className="flex flex-col gap-3">
              {available.map((m) => {
                const selected = method?.id === m.id;
                const cents = computeShippingCents(m, subtotal, freeShippingThreshold);
                const delay = shippingDelayLabel(m);
                return (
                  <label key={m.id} className={`flex cursor-pointer items-center gap-4 rounded-2xl border-[1.5px] bg-shop-paper px-5 py-4 transition ${selected ? "border-shop-accent shop-shadow" : "border-shop-line hover:border-shop-accent-soft"}`}>
                    <input type="radio" name="shipping" value={m.id} checked={selected} onChange={() => setMethodId(m.id)} className="sr-only" />
                    <span aria-hidden className={`flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] ${selected ? "border-shop-accent" : "border-shop-ink-faint"}`}>
                      {selected && <span className="size-2.5 rounded-full bg-shop-accent" />}
                    </span>
                    <span className="flex flex-1 flex-col gap-0.5">
                      <span className="text-[15px] font-semibold text-shop-ink">{m.name}</span>
                      <span className="text-xs text-shop-ink-soft">{[m.description, delay].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className={`text-sm font-semibold ${cents === 0 ? "text-shop-ok" : "text-shop-ink"}`}>{cents === 0 ? "Offerte" : formatPrice(cents)}</span>
                  </label>
                );
              })}
            </div>
          )}
          {method?.instructions && <p className="rounded-2xl bg-shop-tint px-4 py-3 text-sm leading-relaxed text-shop-accent-deep">{method.instructions}</p>}
        </section>

        {method?.kind === "home" && (
          <section className="flex flex-col gap-5">
            <h2 className="text-2xl">Adresse de livraison</h2>
            <Field label="Adresse" htmlFor="line1">
              <Input id="line1" required autoComplete="address-line1" value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} placeholder="12 rue des Lilas" />
            </Field>
            <Field label="Complément" htmlFor="line2" optional>
              <Input id="line2" autoComplete="address-line2" value={address.line2} onChange={(e) => setAddress({ ...address, line2: e.target.value })} placeholder="Bâtiment, étage, code" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
              <Field label="Code postal" htmlFor="postal">
                <Input id="postal" required autoComplete="postal-code" value={address.postal_code} onChange={(e) => setAddress({ ...address, postal_code: e.target.value })} />
              </Field>
              <Field label="Ville" htmlFor="city">
                <Input id="city" required autoComplete="address-level2" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
              </Field>
            </div>
          </section>
        )}

        {method?.kind === "relay" && (
          <section className="flex flex-col gap-5">
            <h2 className="text-2xl">Ton point relais</h2>
            <Field label="Nom du point relais" htmlFor="relayName">
              <Input id="relayName" required value={relay.name} onChange={(e) => setRelay({ ...relay, name: e.target.value })} placeholder="Tabac de la Gare" />
            </Field>
            <Field label="Adresse" htmlFor="relayAddress">
              <Input id="relayAddress" required value={relay.address} onChange={(e) => setRelay({ ...relay, address: e.target.value })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
              <Field label="Code postal" htmlFor="relayPostal">
                <Input id="relayPostal" required value={relay.postal_code} onChange={(e) => setRelay({ ...relay, postal_code: e.target.value })} />
              </Field>
              <Field label="Ville" htmlFor="relayCity">
                <Input id="relayCity" required value={relay.city} onChange={(e) => setRelay({ ...relay, city: e.target.value })} />
              </Field>
            </div>
            <Field label="Code du point relais" htmlFor="relayCode" optional>
              <Input id="relayCode" value={relay.code} onChange={(e) => setRelay({ ...relay, code: e.target.value })} />
            </Field>
          </section>
        )}

        <section className="flex flex-col gap-5 rounded-[24px] bg-shop-tint p-5 md:p-6">
          <h2 className="flex items-center gap-2.5 text-xl">
            <GiftIcon className="size-5 text-shop-accent-deep" /> C&apos;est un cadeau ?
          </h2>
          <Checkbox id="isGift" label="Oui, ne pas indiquer le prix dans le colis et glisser un mot doux" checked={isGift} onChange={(e) => setIsGift(e.target.checked)} />
          {isGift && (
            <Field label="Ton mot doux" htmlFor="giftMessage" hint="Recopié à la main et glissé dans le colis.">
              <Textarea id="giftMessage" value={giftMessage} onChange={(e) => setGiftMessage(e.target.value)} maxLength={300} className="bg-shop-paper" placeholder="Pour toi, parce que tu le mérites…" />
            </Field>
          )}
          <Field label="Une précision pour nous" htmlFor="note" optional>
            <Textarea id="note" value={customerNote} onChange={(e) => setCustomerNote(e.target.value)} maxLength={500} className="min-h-[72px] bg-shop-paper" placeholder="Une allergie, une préférence, une date à respecter…" />
          </Field>
        </section>
      </div>

      <aside className="flex flex-col gap-5 rounded-[24px] border border-shop-line bg-shop-paper p-6 shop-shadow lg:sticky lg:top-28">
        <h2 className="text-2xl">Ta commande</h2>
        <ul className="flex flex-col gap-4">
          {items.map((item) => (
            <li key={item.key} className="flex gap-3">
              <span className="size-14 shrink-0 overflow-hidden rounded-xl bg-shop-tint">{item.imageUrl && <img src={item.imageUrl} alt="" className="size-full object-cover" />}</span>
              <span className="flex flex-1 flex-col gap-0.5 text-sm">
                <span className="font-shop-display text-base text-shop-ink">{item.name}</span>
                {item.options.map((o) => (
                  <span key={o.linkId} className="text-xs text-shop-ink-soft">
                    {o.label} : {o.value}
                  </span>
                ))}
                <span className="text-xs text-shop-ink-soft">Quantité : {item.quantity}</span>
              </span>
              <span className="text-sm font-semibold">{formatPrice(itemUnitPrice(item) * item.quantity)}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2 border-t border-shop-line pt-4">
          {discount ? (
            <div className="flex items-center justify-between rounded-xl bg-shop-ok-soft px-3 py-2 text-xs font-medium text-shop-ok">
              <span>
                Code {discount.code} · {discount.description}
              </span>
              <button type="button" onClick={() => setDiscount(null)} className="underline">
                Retirer
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input value={discountInput} onChange={(e) => setDiscountInput(e.target.value.toUpperCase())} placeholder="Code promo" aria-label="Code promo" className="shop-input h-11 flex-1 rounded-full px-4 text-sm uppercase" />
              <Button type="button" variant="secondary" size="sm" className="h-11" onClick={applyDiscount} loading={discountBusy} disabled={!discountInput.trim()}>
                Appliquer
              </Button>
            </div>
          )}
          {discountError && (
            <p className="text-xs text-shop-error" role="alert">
              {discountError}
            </p>
          )}
        </div>

        <dl className="flex flex-col gap-2.5 border-t border-shop-line pt-4 text-sm text-shop-ink-soft">
          <div className="flex justify-between">
            <dt>Sous-total</dt>
            <dd className="text-shop-ink">{formatPrice(subtotal)}</dd>
          </div>
          {discountCents > 0 && (
            <div className="flex justify-between">
              <dt>Réduction</dt>
              <dd className="text-shop-ok">- {formatPrice(discountCents)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>Livraison{method ? ` · ${method.name}` : ""}</dt>
            <dd className={shippingCents === 0 ? "text-shop-ok" : "text-shop-ink"}>{shippingCents === 0 ? "Offerte" : formatPrice(shippingCents)}</dd>
          </div>
        </dl>
        <div className="flex items-baseline justify-between border-t border-shop-line pt-4">
          <span className="text-[15px] font-semibold">Total</span>
          <span className="text-[22px] font-semibold">{formatPrice(total)}</span>
        </div>
        <p className="text-xs text-shop-ink-soft">TVA incluse</p>

        <Checkbox
          id="terms"
          checked={acceptTerms}
          onChange={(e) => setAcceptTerms(e.target.checked)}
          label={
            <span className="text-xs text-shop-ink-soft">
              J&apos;accepte les{" "}
              <Link href={shopHref(slug, "/cgv")} className="font-medium text-shop-accent-deep underline-offset-2 hover:underline" target="_blank">
                conditions générales de vente
              </Link>{" "}
              et la{" "}
              <Link href={shopHref(slug, "/confidentialite")} className="font-medium text-shop-accent-deep underline-offset-2 hover:underline" target="_blank">
                politique de confidentialité
              </Link>
              .
            </span>
          }
        />
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!paymentsEnabled || !method || !acceptTerms}>
          Continuer vers le paiement <ArrowRightIcon className="size-4" />
        </Button>
        <ul className="flex flex-col gap-1.5 text-xs text-shop-ink-soft">
          <li className="flex items-center gap-2">
            <LockIcon className="size-3.5" /> Paiement sécurisé par Stripe : carte, Apple Pay, Google Pay
          </li>
          <li className="flex items-center gap-2">
            <GiftIcon className="size-3.5" /> {WITHDRAWAL_DAYS} jours pour changer d&apos;avis, conformément à la loi
          </li>
        </ul>
      </aside>
    </form>
  );
}
