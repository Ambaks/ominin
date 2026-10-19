"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { useCart } from "@/lib/menu/cart";
import {
  maskContact,
  nextReward,
  type GarlandMotif,
  type LoyaltyHistoryEntry,
} from "@/lib/menu/loyalty";
import { useLoyaltyMember } from "@/lib/menu/loyalty-member";
import { Garland, LoyaltyCard, RewardDrawing } from "./loyalty-card";
import { Sheet } from "./sheet";

/*
 * « Ma carte », ouverte depuis la pastille de points : la carte du
 * restaurant, la guirlande vers les récompenses, ce que chacune coûte encore,
 * et la carte ligne à ligne. Les récompenses s'ajoutent toujours depuis le
 * panier ; ici, on voit où l'on en est.
 */

const day = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

function historyLabel(entry: LoyaltyHistoryEntry): string {
  if (entry.kind === "gain") return entry.table ? `Table ${entry.table}` : "Commande";
  if (entry.kind === "depense") {
    if (!entry.rewards) return "Récompense";
    return `${entry.rewards} ${entry.rewards.includes(",") ? "offerts" : "offert"}`;
  }
  return entry.points > 0 ? "Geste de la maison" : "Ajustement";
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function LoyaltyCardSheet({
  brand,
  logo,
  wordmark,
  motif,
  onClose,
}: {
  brand: string;
  logo?: string;
  wordmark?: boolean;
  motif?: GarlandMotif;
  onClose: () => void;
}) {
  const { loyalty } = useCart();
  const { member, forget, loadHistory } = useLoyaltyMember();
  const titleId = useId();
  const [history, setHistory] = useState<LoyaltyHistoryEntry[] | null>(null);
  // « Ce n'est pas moi » : la feuille descend d'abord, le téléphone est
  // oublié une fois qu'elle est partie.
  const forgetting = useRef(false);

  useEffect(() => {
    loadHistory().then(setHistory, () => setHistory([]));
  }, [loadHistory]);

  if (!loyalty || !member || member.points === null) return null;
  const points = member.points;
  const next = nextReward(loyalty, points);

  return (
    <Sheet
      onClosed={() => {
        onClose();
        if (forgetting.current) void forget();
      }}
      backdropCloses
      labelledBy={titleId}
    >
      {(close) => (
        <div className="flex flex-col gap-6 px-5 pb-8 pt-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 id={titleId} className="font-display text-2xl font-medium">
                Ma carte
              </h3>
              <p className="text-xs text-muted">
                Reconnue sur ce téléphone · {maskContact(member.contact)}
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Fermer"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground/5 text-lg text-muted"
            >
              ×
            </button>
          </div>

          <div className="loyalty-card-enter">
            <LoyaltyCard
              brand={brand}
              logo={logo}
              wordmark={wordmark}
              name={member.firstName}
              since={member.since}
              points={points}
            />
          </div>

          <div className="flex flex-col gap-1">
            <p className="flex items-baseline justify-between gap-3 text-[13px] text-muted">
              <span className="shrink-0">
                <span className="font-semibold tabular-nums text-foreground">{points}</span>{" "}
                {points === 1 ? "point" : "points"}
              </span>
              <span className="text-right text-ember-1">
                {next
                  ? `Encore ${next.points - points} pts · ${next.label}`
                  : "Toutes les récompenses sont à portée"}
              </span>
            </p>
            <Garland program={loyalty} points={points} motif={motif} />
          </div>

          <section className="flex flex-col gap-2.5">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-faint">
              Vos récompenses
            </h4>
            <ul className="flex flex-col gap-2.5">
              {loyalty.rewards.map((reward, i) => {
                const ready = points >= reward.points;
                const delay = 1100 + i * 110;
                return (
                  <li
                    key={reward.id}
                    style={{ "--d": `${delay}ms` } as CSSProperties}
                    className={`loyalty-rise grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-3.5 rounded-2xl border px-3.5 py-3 ${
                      ready
                        ? "border-ember-1/35 bg-linear-to-r from-ember-1/10 to-transparent"
                        : "border-hairline bg-foreground/[0.03]"
                    }`}
                  >
                    <span
                      className={`grid size-13 place-items-center rounded-xl ${ready ? "bg-radial from-ember-1/20 to-transparent text-ember-1" : "text-faint"}`}
                    >
                      <span className="size-10">
                        <RewardDrawing label={reward.label} delay={delay + 100} />
                      </span>
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold first-letter:uppercase">{reward.label}</span>
                      {ready ? (
                        <span className="block text-xs text-muted">À ajouter depuis le panier</span>
                      ) : (
                        <span className="loyalty-bar mt-2 block h-[3px] overflow-hidden rounded-full bg-hairline">
                          <i
                            className="block h-full rounded-full bg-linear-to-r from-ember-2 to-ember-1"
                            style={{ width: `${Math.round((points / reward.points) * 100)}%` }}
                          />
                        </span>
                      )}
                    </span>
                    <span
                      className={`whitespace-nowrap text-xs font-semibold ${
                        ready ? "rounded-full bg-ember-1 px-2.5 py-1.5 text-background" : "text-faint"
                      }`}
                    >
                      {ready ? `${reward.points} pts` : `encore ${reward.points - points}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="flex flex-col gap-1">
            <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-faint">
              Historique
            </h4>
            {history === null ? (
              <div className="flex flex-col gap-3" aria-busy="true" aria-label="Chargement de l'historique">
                {[0, 1, 2].map((row) => (
                  <span key={row} className="h-4 animate-pulse rounded bg-foreground/5" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted">
                Vos points apparaîtront ici dès votre première commande réglée.
              </p>
            ) : (
              <ul>
                {history.map((entry) => (
                  <li
                    key={`${entry.at}${entry.kind}`}
                    className="flex justify-between gap-3 border-b border-hairline py-2.5 text-[13.5px] text-muted last:border-b-0"
                  >
                    <span className="min-w-0 truncate">
                      {capitalize(day.format(new Date(entry.at)))} · {historyLabel(entry)}
                    </span>
                    <span
                      className={`shrink-0 font-semibold tabular-nums ${entry.points < 0 ? "text-ember-2" : "text-foreground"}`}
                    >
                      {entry.points > 0 ? `+${entry.points}` : `−${-entry.points}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="flex items-center justify-between gap-4 border-t border-hairline pt-4 text-xs text-muted">
            <span>Vos points se cumulent à chaque commande réglée.</span>
            <button
              type="button"
              onClick={() => {
                forgetting.current = true;
                close();
              }}
              className="shrink-0 font-semibold underline underline-offset-4 hover:text-foreground"
            >
              Ce n&rsquo;est pas moi
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
