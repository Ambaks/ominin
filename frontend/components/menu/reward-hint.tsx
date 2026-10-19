"use client";

import { useCart } from "@/lib/menu/cart";
import { useLoyaltyMember } from "@/lib/menu/loyalty-member";

/*
 * Sous un plat que la fidélité peut offrir, pour un téléphone reconnu : ce
 * qu'il manque, ou que c'est déjà gagné. Le palier le moins cher qui le
 * contient : c'est celui que le client atteindra d'abord.
 */
export function RewardHint({ itemId }: { itemId: string }) {
  const { loyalty } = useCart();
  const { member } = useLoyaltyMember();
  const points = member?.points;
  if (!loyalty || points == null) return null;
  const reward = loyalty.rewards.find((r) => r.items.some((i) => i.id === itemId));
  if (!reward) return null;
  const missing = reward.points - points;

  return (
    <p className="flex items-center gap-2 text-xs font-medium text-ember-1">
      {missing > 0 ? (
        <>
          <span className="reward-hint-bar h-[3px] w-16 shrink-0 overflow-hidden rounded-full bg-hairline">
            <i
              className="block h-full rounded-full bg-linear-to-r from-ember-2 to-ember-1"
              style={{ width: `${Math.round((points / reward.points) * 100)}%` }}
            />
          </span>
          <span>{`Encore ${missing} ${missing === 1 ? "point" : "points"} et c’est offert`}</span>
        </>
      ) : (
        <>
          <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5 shrink-0">
            <path
              d="M8 1.5l1.9 4.6 4.6 1.9-4.6 1.9L8 14.5l-1.9-4.6L1.5 8l4.6-1.9z"
              fill="currentColor"
            />
          </svg>
          <span>C&rsquo;est offert avec vos points, depuis le panier</span>
        </>
      )}
    </p>
  );
}
