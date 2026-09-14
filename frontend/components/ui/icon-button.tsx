import type { ButtonHTMLAttributes } from "react";

/*
 * Bouton à icône seule. Sur une tablette, le doigt n'a pas la précision de la
 * souris : la cible fait 44 px, la taille qu'Apple recommande, et 36 px
 * suffisent devant un écran avec souris. Le fond et le bord le font
 * ressortir — une croix grise sans contour, on ne la voit pas et on la rate.
 */
const TONES = {
  neutral: "hover:border-ember-2/40 hover:text-foreground",
  danger: "hover:border-ember-3/50 hover:text-ember-3",
} as const;

export function IconButton({
  tone = "neutral",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  "aria-label": string;
  tone?: keyof typeof TONES;
}) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-hairline bg-surface text-muted transition-colors active:bg-surface-raised disabled:pointer-events-none disabled:opacity-30 lg:pointer-fine:size-9 ${TONES[tone]} ${className}`}
    />
  );
}
