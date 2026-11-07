"use client";

import { useRef, useState } from "react";
import { isUnavailable, OptionsModal } from "@/components/menu/add-to-order";
import { suggestionButton, SuggestionRow } from "@/components/menu/chef-pairings";
import { REWARD_ITEMS_SHOWN } from "@/lib/gestion/constants";
import { cartLineKey, useCart, type CartLine } from "@/lib/menu/cart";
import { formatPrice, lineName } from "@/lib/menu/format";
import {
  maskContact,
  pointsEarned,
  type LoyaltyMember,
  type LoyaltyProgram,
  type LoyaltyReward,
  type LoyaltyVoucher,
} from "@/lib/menu/loyalty";
import { useLoyaltyMember } from "@/lib/menu/loyalty-member";
import type { MenuItem } from "@/lib/menu-data";

/*
 * Fidélité, dans la feuille de commande. Le client laisse son numéro ou son
 * email : son solde s'affiche, avec les paliers qu'il peut s'offrir. Un
 * article offert rejoint le panier comme une ligne à part, payée en points.
 * Changer de contact, c'est changer de solde : les lignes offertes repartent.
 * Un téléphone reconnu (/api/fidelite) n'a rien à taper : son contact et son
 * solde sont déjà là, « Ce n'est pas moi » rend le champ, et ses bons de la
 * roue passent avant les paliers : l'article du bon, offert sans points, ou
 * le lot hors carte, une ligne que l'équipe remet avec la commande.
 * Sinon, le client peut demander qu'on se souvienne de ce téléphone à
 * l'envoi de la commande.
 */

type LookupState = "idle" | "loading" | "error";

const voucherDay = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });

export function LoyaltySection({
  program,
  contact,
  onContactChange,
  balance,
  onBalance,
  member,
  onForget,
  remember,
}: {
  program: LoyaltyProgram;
  contact: string;
  onContactChange: (contact: string) => void;
  /** Solde du contact saisi ; null tant qu'il n'a pas été consulté. */
  balance: number | null;
  onBalance: (balance: number | null) => void;
  /** Téléphone reconnu : son contact sert à cette commande. */
  member?: LoyaltyMember | null;
  onForget?: () => void;
  /** « Se souvenir de ce téléphone », quand le menu sait le faire. */
  remember?: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    firstName: string;
    onFirstNameChange: (firstName: string) => void;
  };
}) {
  const cart = useCart();
  const { balance: lookupBalance, vouchers } = useLoyaltyMember();
  // Repliée tant que rien n'est saisi : le gain et un bouton, sur une rangée,
  // pour que l'accord du chef et le pied restent à l'écran.
  const [opened, setOpened] = useState(false);
  // Ouverte d'un toucher (« Cumuler », « Ce n'est pas moi ») : le champ prend
  // le focus et remonte au milieu de la feuille, hors du pied et du clavier.
  const focusOnOpen = useRef(false);
  const open = () => {
    focusOnOpen.current = true;
    setOpened(true);
  };
  const [lookup, setLookup] = useState<LookupState>("idle");
  // Paliers dépliés : un palier d'une dizaine de boissons repoussait le pied.
  const [unfolded, setUnfolded] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState<{
    item: MenuItem;
    reward: NonNullable<CartLine["reward"]>;
  } | null>(null);

  const remaining = balance === null ? 0 : balance - cart.pointsSpent;
  const earned = pointsEarned(cart.earningTotal, program.pointsPerEuro);

  const changeContact = (value: string) => {
    onContactChange(value);
    if (balance !== null) {
      onBalance(null);
      cart.clearRewards();
    }
  };

  const showBalance = async () => {
    if (!contact.trim()) return;
    setLookup("loading");
    setError(null);
    try {
      const points = await lookupBalance(cart.slug, contact.trim());
      if (points === null) {
        setLookup("error");
        setError("Le programme de fidélité n'est plus proposé.");
        return;
      }
      onBalance(points);
      setLookup("idle");
    } catch (lookupError) {
      setLookup("error");
      setError(
        lookupError instanceof Error ? lookupError.message : "Solde introuvable."
      );
    }
  };

  // Un palier se paie en points ; un bon de la roue (line.voucher), en rien.
  const offer = (item: MenuItem, line: NonNullable<CartLine["reward"]>) => {
    if ((item.options?.length ?? 0) > 0) {
      setPicking({ item, reward: line });
      return;
    }
    cart.addLine({
      key: cartLineKey(item.id, [], line.voucher ?? line.id),
      itemId: item.id,
      name: item.name,
      unitPrice: 0,
      optionSummary: [],
      choices: [],
      stock: item.stock,
      noticeHours: item.noticeHours,
      reward: line,
    });
    cart.track("panier", { items: [item.id] });
  };

  // Le lot hors carte d'un bon : une ligne à son nom, offerte.
  const addLot = (voucher: LoyaltyVoucher) =>
    cart.addLine({
      key: `lot/${voucher.id}`,
      itemId: voucher.id,
      name: voucher.label,
      image: voucher.image ?? undefined,
      unitPrice: 0,
      optionSummary: [],
      choices: [],
      reward: { points: 0, voucher: voucher.id },
      lot: true,
    });

  const offerable = (items: MenuItem[]) =>
    items.filter((item) => !isUnavailable(item) && (cart.collect || !cart.closed.has(item.id)));

  // Un article offert, comme l'accord du chef : photo, nom, ce qu'il vaut, un bouton.
  const offerRow = (item: MenuItem, line: NonNullable<CartLine["reward"]>, image = item.image) => (
    <SuggestionRow image={image} title={lineName(item)} why={`Offert au lieu de ${formatPrice(item.price)}`}>
      <button
        type="button"
        onClick={() => offer(item, line)}
        aria-label={`Ajouter, offert : ${lineName(item)}, ${line.voucher ? "bon de la roue" : `${line.points} points`}`}
        className={suggestionButton()}
      >
        + Offert
      </button>
    </SuggestionRow>
  );

  // Les articles d'un palier, repliés au-delà de quelques-uns.
  const itemList = (reward: LoyaltyReward) => {
    const listKey = reward.id;
    const items = offerable(reward.items);
    const all = unfolded.has(listKey);
    const hidden = items.length - REWARD_ITEMS_SHOWN;
    return (
      <>
        <ul className="flex flex-col gap-2.5">
          {(all ? items : items.slice(0, REWARD_ITEMS_SHOWN)).map((item) => (
            <li key={item.id}>{offerRow(item, { id: reward.id, points: reward.points })}</li>
          ))}
        </ul>
        {hidden > 0 && (
          <button
            type="button"
            aria-expanded={all}
            onClick={() =>
              setUnfolded((current) => {
                const next = new Set(current);
                if (all) next.delete(listKey);
                else next.add(listKey);
                return next;
              })
            }
            className="self-start text-xs font-semibold text-muted underline underline-offset-4"
          >
            {all
              ? "Replier la liste"
              : hidden === 1
                ? "Voir l’autre article"
                : `Voir les ${hidden} autres articles`}
          </button>
        )}
      </>
    );
  };

  // Ce que la commande rapporte d'abord : c'est ce qui fait laisser un numéro.
  const title = (
    <div className="min-w-0">
      <h4 className="text-sm font-semibold">
        Fidélité
        {earned > 0 && (
          <>
            {" · "}
            <span className="text-ember-1">
              +{earned}&nbsp;{earned > 1 ? "points" : "point"}
            </span>
          </>
        )}
      </h4>
      {earned > 0 && <p className="text-xs text-muted">avec cette commande</p>}
    </div>
  );

  if (!opened && !member && !contact.trim() && balance === null) {
    return (
      <section className="loyalty-box mt-5 flex items-center justify-between gap-3 rounded-2xl border border-hairline p-4">
        {title}
        <button
          type="button"
          onClick={open}
          className="min-h-9 shrink-0 rounded-full border border-ember-1/50 px-3.5 text-xs font-semibold text-foreground"
        >
          Cumuler
        </button>
      </section>
    );
  }

  return (
    <section className="loyalty-box mt-5 flex flex-col gap-3 rounded-2xl border border-hairline p-4">
      <div>
        {title}
        {member && (
          <p className="mt-1 text-xs text-muted">
            Ce téléphone est reconnu&nbsp;: vos points se cumulent tout seuls.
          </p>
        )}
      </div>
      {member ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-hairline px-3 py-2.5 text-sm">
          <span className="min-w-0 truncate">
            {member.firstName && (
              <span className="font-semibold">{member.firstName} · </span>
            )}
            <span className="text-muted">{maskContact(member.contact)}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              open();
              onForget?.();
            }}
            className="shrink-0 text-xs font-semibold text-muted underline underline-offset-4"
          >
            Ce n&rsquo;est pas moi
          </button>
        </div>
      ) : (
        <>
          <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void showBalance();
            }}
          >
            <input
              type="text"
              inputMode="email"
              autoComplete="email"
              value={contact}
              onChange={(event) => changeContact(event.target.value)}
              ref={(node) => {
                if (node && focusOnOpen.current) {
                  focusOnOpen.current = false;
                  node.focus({ preventScroll: true });
                  node.scrollIntoView({ block: "center" });
                }
              }}
              placeholder="Téléphone ou email"
              aria-label="Téléphone ou email pour la fidélité"
              className="min-w-0 flex-1 rounded-xl border border-hairline bg-background px-3 py-2.5 text-base outline-none transition-colors placeholder:text-sm focus:border-ember-2/50"
            />
            <p className="text-xs text-muted">
              Votre numéro ou votre email suffit&nbsp;: les points s&rsquo;ajoutent à cette commande.
            </p>
            <button
              type="submit"
              disabled={!contact.trim() || lookup === "loading"}
              className="self-start text-xs font-semibold text-ember-1 underline underline-offset-4 disabled:no-underline disabled:opacity-50"
            >
              {lookup === "loading" ? "…" : "Voir mes points"}
            </button>
          </form>
          {remember && (
            <>
              <label className="flex items-center gap-2.5 text-xs">
                <input
                  type="checkbox"
                  checked={remember.checked}
                  onChange={(event) => remember.onChange(event.target.checked)}
                  className="size-4 shrink-0 accent-ember-1"
                />
                <span>
                  Se souvenir de ce téléphone{" "}
                  <span className="text-faint">· plus rien à taper la prochaine fois</span>
                </span>
              </label>
              {remember.checked && contact.trim() && (
                <input
                  type="text"
                  autoComplete="given-name"
                  value={remember.firstName}
                  onChange={(event) => remember.onFirstNameChange(event.target.value)}
                  placeholder="Prénom (facultatif)"
                  aria-label="Prénom, pour vous saluer à votre retour"
                  className="rounded-xl border border-hairline bg-background px-3 py-2.5 text-base outline-none transition-colors focus:border-ember-2/50"
                />
              )}
            </>
          )}
        </>
      )}
      {error && <p className="text-xs text-ember-3">{error}</p>}

      {balance !== null && (
        <>
          <p className="text-sm">
            <span className="font-display text-xl font-semibold text-ember-1">
              {remaining}
            </span>{" "}
            {remaining === 1 ? "point disponible" : "points disponibles"}
            {cart.pointsSpent > 0 && (
              <span className="text-xs text-muted">
                {" "}
                ({cart.pointsSpent} utilisés sur {balance})
              </span>
            )}
          </p>
          {earned > 0 && (
            <p className="-mt-2 text-xs text-muted">
              Ceux de cette commande sont crédités à l&rsquo;encaissement.
            </p>
          )}
          {vouchers.length > 0 && (
            <ul className="flex flex-col gap-3">
              {vouchers.map((voucher) => {
                const used = cart.lines.some((line) => line.reward?.voucher === voucher.id);
                const item = voucher.item && offerable([voucher.item])[0];
                return (
                  <li key={voucher.id} className="flex flex-col gap-2">
                    <p className="flex items-baseline justify-between gap-3 text-xs">
                      <span className="font-semibold">Bon de la roue · {voucher.label}</span>
                      <span className="shrink-0 font-semibold text-ember-1">
                        jusqu’au {voucherDay.format(new Date(voucher.expiresAt))}
                      </span>
                    </p>
                    {used ? (
                      <p className="text-xs text-muted">Dans votre commande.</p>
                    ) : item ? (
                      offerRow(item, { points: 0, voucher: voucher.id }, item.image ?? voucher.image ?? undefined)
                    ) : voucher.item ? (
                      <p className="text-xs text-muted">Pas servi en ce moment : gardez votre bon pour une autre fois.</p>
                    ) : (
                      <SuggestionRow
                        image={voucher.image ?? undefined}
                        title={voucher.label}
                        why="Remis par l’équipe avec votre commande"
                      >
                        <button
                          type="button"
                          onClick={() => addLot(voucher)}
                          aria-label={`Ajouter à la commande : ${voucher.label}, bon de la roue`}
                          className={suggestionButton()}
                        >
                          + Ajouter
                        </button>
                      </SuggestionRow>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <ul className="flex flex-col gap-3">
            {program.rewards.map((reward) => {
              const reachable = remaining >= reward.points;
              return (
                <li key={reward.id} className="flex flex-col gap-2">
                  <p className="flex items-baseline justify-between gap-3 text-xs">
                    <span className="font-semibold">{reward.label}</span>
                    <span
                      className={`shrink-0 font-semibold ${reachable ? "text-ember-1" : "text-faint"}`}
                    >
                      {reward.points}&nbsp;pts
                    </span>
                  </p>
                  {reachable ? (
                    itemList(reward)
                  ) : (
                    <p className="text-xs text-faint">
                      Encore {reward.points - remaining}{" "}
                      {reward.points - remaining === 1 ? "point" : "points"}.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {picking && (
        <OptionsModal
          item={picking.item}
          reward={picking.reward}
          onClose={() => setPicking(null)}
          onAdded={() => {}}
        />
      )}
    </section>
  );
}
