"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  ADDED_FLASH_MS,
  isUnavailable,
  lineName,
  OptionsModal,
} from "@/components/menu/add-to-order";
import { cartLineKey, useCart } from "@/lib/menu/cart";
import {
  contactError,
  fetchLoyaltyBalance,
  pointsEarned,
  type LoyaltyProgram,
  type LoyaltyReward,
} from "@/lib/menu/loyalty";
import type { MenuItem } from "@/lib/menu-data";

/*
 * Fidélité, dans la feuille de commande. Le client laisse son numéro ou son
 * email : son solde s'affiche, avec les paliers qu'il peut s'offrir. Un
 * article offert rejoint le panier comme une ligne à part, payée en points.
 * Changer de contact, c'est changer de solde : les lignes offertes repartent.
 */

type LookupState = "idle" | "loading" | "error";

export function LoyaltySection({
  program,
  contact,
  onContactChange,
  balance,
  onBalance,
}: {
  program: LoyaltyProgram;
  contact: string;
  onContactChange: (contact: string) => void;
  /** Solde du contact saisi ; null tant qu'il n'a pas été consulté. */
  balance: number | null;
  onBalance: (balance: number | null) => void;
}) {
  const cart = useCart();
  const [lookup, setLookup] = useState<LookupState>("idle");
  // Une saisie mal formée marque le champ invalide ; une panne de réseau,
  // non : le champ n'y est pour rien.
  const [error, setError] = useState<{ message: string; format: boolean } | null>(null);
  // Chaque consultation a son numéro : une réponse arrivée après une
  // nouvelle saisie ne vaut plus pour le contact affiché.
  const request = useRef(0);
  const errorId = useId();
  const [picking, setPicking] = useState<{
    item: MenuItem;
    reward: LoyaltyReward;
  } | null>(null);

  const result = useRef<HTMLDivElement>(null);
  // Le cadeau qui vient d'entrer au panier dit « Ajouté ✓ » un instant :
  // sa ligne, en haut de la feuille, est souvent hors de vue.
  const [added, setAdded] = useState<string | null>(null);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashAdded = (key: string) => {
    setAdded(key);
    if (addedTimer.current) clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setAdded(null), ADDED_FLASH_MS);
  };
  useEffect(
    () => () => {
      if (addedTimer.current) clearTimeout(addedTimer.current);
    },
    []
  );
  const remaining = balance === null ? 0 : balance - cart.pointsSpent;
  // Le chemin qui reste, pour le prochain palier seulement : répété sous
  // chaque palier, il ne redisait que ses points.
  const nextTier = program.rewards.find((tier) => remaining < tier.points);
  const earned = pointsEarned(cart.earningTotal, program.pointsPerEuro);
  const missingAfter = (reward: LoyaltyReward) => reward.points - remaining - earned;

  // Les cadeaux retirés parce que le contact a changé : dit en clair, leurs
  // lignes sont en haut de la feuille, souvent hors de vue.
  const [rewardsDropped, setRewardsDropped] = useState(false);

  const changeContact = (value: string) => {
    onContactChange(value);
    request.current += 1;
    setError(null);
    setLookup("idle");
    if (balance !== null) {
      onBalance(null);
      if (cart.lines.some((line) => line.reward)) setRewardsDropped(true);
      cart.clearRewards();
    }
  };

  const showBalance = async () => {
    if (!contact.trim()) return;
    const problem = contactError(contact);
    if (problem) {
      setError({ message: problem, format: true });
      return;
    }
    const ticket = ++request.current;
    setLookup("loading");
    setError(null);
    setRewardsDropped(false);
    try {
      const points = await fetchLoyaltyBalance(cart.slug, contact.trim());
      if (ticket !== request.current) return;
      if (points === null) {
        setLookup("error");
        setError({ message: "Le programme de fidélité n'est plus proposé.", format: false });
        return;
      }
      onBalance(points);
      setLookup("idle");
      // Le solde s'affiche sous le champ, souvent sous le pied collé de la
      // feuille : on l'amène sous les yeux (le pied est compté dans le
      // scroll-padding de la feuille).
      requestAnimationFrame(() =>
        result.current?.firstElementChild?.scrollIntoView({
          block: "nearest",
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        })
      );
    } catch (lookupError) {
      if (ticket !== request.current) return;
      setLookup("error");
      setError({
        message:
          lookupError instanceof Error ? lookupError.message : "Solde introuvable.",
        format: false,
      });
    }
  };

  const offer = (item: MenuItem, reward: LoyaltyReward) => {
    if ((item.options?.length ?? 0) > 0) {
      setPicking({ item, reward });
      return;
    }
    cart.addLine({
      key: cartLineKey(item.id, [], reward.id),
      itemId: item.id,
      name: lineName(item),
      unitPrice: 0,
      optionSummary: [],
      choices: [],
      stock: item.stock,
      reward: { id: reward.id, points: reward.points },
    });
    cart.track("panier", { items: [item.id] });
    flashAdded(`${reward.id}/${item.id}`);
    // Le palier peut cesser d'être à portée : sa pastille disparaît avec le
    // focus qu'elle portait. Le solde le reprend, dans la feuille.
    requestAnimationFrame(() => {
      if (!document.activeElement || document.activeElement === document.body) {
        result.current?.focus({ preventScroll: true });
      }
    });
  };

  return (
    <section className="loyalty mt-6 flex flex-col gap-3 rounded-2xl border border-hairline p-4">
      <div>
        <h4 className="text-sm font-semibold">Fidélité</h4>
        <p className="mt-0.5 text-xs text-muted">
          1&nbsp;€ dépensé = {program.pointsPerEuro.toLocaleString("fr-FR")}&nbsp;
          {program.pointsPerEuro > 1 ? "points" : "point"}. Laissez votre
          numéro ou votre email pour cumuler et utiliser vos points.
        </p>
      </div>
      {/* Sous 360 px, le bouton passe sous le champ : côte à côte, le
          champ ne montrait plus que « Téléphone ou e… ». */}
      <form
        className="flex gap-2 max-[359px]:flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          void showBalance();
        }}
      >
        <input
          type="text"
          // Le clavier ordinaire (lettres et chiffres), puis le pavé
          // numérique dès que la saisie n'a que des chiffres (« 06… », « +33… »).
          inputMode={/^[+\d][\d\s.]*$/.test(contact) ? "tel" : "text"}
          autoComplete="email"
          data-loyalty-contact
          value={contact}
          onChange={(event) => changeContact(event.target.value)}
          // Signalé dès la sortie du champ, pas au moment d'envoyer.
          onBlur={() => {
            const problem = contact.trim() ? contactError(contact) : null;
            if (problem) setError({ message: problem, format: true });
          }}
          aria-invalid={error?.format || undefined}
          aria-describedby={error ? errorId : undefined}
          placeholder="Téléphone ou email"
          aria-label="Téléphone ou email pour la fidélité"
          className="min-w-0 flex-1 rounded-xl border border-hairline bg-background px-3 py-2.5 text-base outline-none transition-colors focus:border-ember-2/50"
        />
        {/* Le libellé garde sa place pendant la recherche (masqué, « … » posé
            dessus) : le champ ne s'élargit plus sous le pouce puis ne rétrécit. */}
        <button
          type="submit"
          disabled={!contact.trim() || lookup === "loading"}
          aria-busy={lookup === "loading"}
          className="grid min-h-11 shrink-0 place-items-center rounded-xl border border-hairline px-3 py-2.5 text-xs font-semibold disabled:opacity-50"
        >
          <span
            className={`col-start-1 row-start-1 ${lookup === "loading" ? "invisible" : ""}`}
          >
            Voir mes points
          </span>
          {lookup === "loading" && (
            <>
              <span aria-hidden className="col-start-1 row-start-1">
                …
              </span>
              <span className="sr-only">Recherche du solde</span>
            </>
          )}
        </button>
      </form>
      {error && (
        <p id={errorId} role="alert" className="text-xs text-ember-3">
          {error.message}
        </p>
      )}

      {/* Le solde, annoncé aux lecteurs d'écran (la zone existe avant lui). */}
      <p role="status" className="sr-only">
        {balance !== null &&
          `${remaining} ${remaining < 2 ? "point disponible" : "points disponibles"}`}
      </p>
      {rewardsDropped && (
        <p className="text-xs text-muted">
          Les articles offerts ont été retirés : ils dépendaient du solde de
          l&rsquo;autre contact.
        </p>
      )}
      <div ref={result} tabIndex={-1} className="flex flex-col gap-3 outline-none empty:hidden">
        {balance !== null && (
          <>
            <p className="text-sm">
              <span className="font-display text-xl font-semibold text-ember-1">
                {remaining}
              </span>{" "}
              {remaining < 2 ? "point disponible" : "points disponibles"}
              {cart.pointsSpent > 0 && (
                <span className="text-xs text-muted">
                  {" "}
                  ({cart.pointsSpent} utilisés sur {balance})
                </span>
              )}
            </p>
            {earned > 0 && (
              <p className="-mt-2 text-xs text-muted">
                +{earned} {earned < 2 ? "point" : "points"}{" "}
                avec cette commande,
                crédités à l&rsquo;encaissement.
              </p>
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
                      <div className="flex flex-wrap gap-1.5">
                        {reward.items
                          .filter((item) => !isUnavailable(item))
                          .map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={(event) => {
                                // Safari ne donne pas le focus au bouton touché :
                                // la feuille d'options le lui rendra (voir Sheet).
                                event.currentTarget.focus({ preventScroll: true });
                                offer(item, reward);
                              }}
                              className="min-h-11 rounded-full border border-ember-2/40 px-3.5 py-2 text-xs font-medium transition-colors hover:bg-surface-raised"
                            >
                              {added === `${reward.id}/${item.id}` ? "Ajouté ✓" : `+ ${item.name}`}
                            </button>
                          ))}
                      </div>
                    ) : (
                      nextTier?.id === reward.id && (
                        <p className="text-xs text-faint">
                          {/* Les points de cette commande comptent pour la
                              suite : « Encore 50 » à qui en gagne 26 ce soir
                              disait faux. */}
                          {missingAfter(reward) <= 0
                            ? "À portée à votre prochaine visite, avec les points de cette commande."
                            : `Encore ${missingAfter(reward)} ${missingAfter(reward) < 2 ? "point" : "points"}${earned > 0 ? " après cette commande" : ""}.`}
                        </p>
                      )
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {picking && (
        <OptionsModal
          item={picking.item}
          reward={{ id: picking.reward.id, points: picking.reward.points }}
          onClose={() => setPicking(null)}
          onAdded={() => flashAdded(`${picking.reward.id}/${picking.item.id}`)}
        />
      )}
    </section>
  );
}
