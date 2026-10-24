"use client";

import { useCart } from "@/lib/menu/cart";
import { useLoyaltyMember } from "@/lib/menu/loyalty-member";

/*
 * Sous un plat que la fidélité peut offrir, pour un téléphone reconnu : ce
 * qu'il manque, ou que c'est déjà gagné. Le palier le moins cher qui le
 * contient : c'est celui que le client atteindra d'abord.
 *
 * `compact` (les cartes de la carte) : l'étoile, la jauge qui se remplit et
 * « 250 pts » ou « Offert » ; la phrase entière reste pour le lecteur
 * d'écran, et dans la fiche du plat.
 */
export function RewardHint({ itemId, compact }: { itemId: string; compact?: boolean }) {
  const { loyalty } = useCart();
  const { member } = useLoyaltyMember();
  const points = member?.points;
  if (!loyalty || points == null) return null;
  const reward = loyalty.rewards.find((r) => r.items.some((i) => i.id === itemId));
  if (!reward) return null;
  const missing = reward.points - points;
  const earned = missing <= 0;
  const sentence = earned
    ? "C’est offert avec vos points, depuis le panier"
    : `Encore ${missing} ${missing === 1 ? "point" : "points"} et c’est offert`;
  const star = (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5 shrink-0">
      <path d="M8 1.5l1.9 4.6 4.6 1.9-4.6 1.9L8 14.5l-1.9-4.6L1.5 8l4.6-1.9z" fill="currentColor" />
    </svg>
  );
  const bar = (
    <span
      aria-hidden
      className={`reward-hint-bar overflow-hidden rounded-full bg-hairline ${
        compact ? "h-1 min-w-0 max-w-28 flex-1" : "h-[3px] w-16 shrink-0"
      }`}
    >
      <i
        className="block h-full rounded-full bg-linear-to-r from-ember-2 to-ember-1"
        style={{ width: `${earned ? 100 : Math.round((points / reward.points) * 100)}%` }}
      />
    </span>
  );

  if (compact) {
    return (
      <p
        data-earned={earned || undefined}
        className="reward-hint flex items-center gap-1.5 text-[11px] font-semibold text-ember-1"
      >
        <span className="sr-only">{sentence}</span>
        {star}
        {bar}
        <span aria-hidden className="shrink-0 tabular-nums">
          {earned ? "Offert" : `${missing} pts`}
        </span>
      </p>
    );
  }

  return (
    <p className="flex items-center gap-2 text-xs font-medium text-ember-1">
      {earned ? star : bar}
      <span>{sentence}</span>
    </p>
  );
}
