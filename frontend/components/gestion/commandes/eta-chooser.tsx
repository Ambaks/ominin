import { COLLECT_ETA_CHOICES_MIN } from "@/lib/gestion/constants";

/**
 * « Prête dans : 10 min · 20 min · … » : l'heure annoncée au client d'une
 * commande à emporter « dès que possible », au moment de la prendre en charge.
 */
export function EtaChooser({
  onChoose,
  onClose,
}: {
  /** ISO de l'heure annoncée ; rien quand l'équipe n'en donne pas. */
  onChoose: (estimatedReadyAt?: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted">Prête dans&nbsp;:</span>
      {COLLECT_ETA_CHOICES_MIN.map((minutes) => (
        <button
          key={minutes}
          type="button"
          onClick={() => onChoose(new Date(Date.now() + minutes * 60_000).toISOString())}
          className="rounded-full border border-hairline px-3.5 py-2 text-sm font-semibold tabular-nums transition-colors hover:border-ember-2/40 hover:text-ember-1"
        >
          {minutes} min
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChoose()}
        className="rounded-full border border-hairline px-3.5 py-2 text-sm font-semibold text-muted transition-colors hover:border-ember-2/40"
      >
        Sans estimation
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer le choix de délai"
        className="flex size-11 items-center justify-center rounded-full text-base text-faint transition-colors hover:text-foreground lg:pointer-fine:size-9"
      >
        ✕
      </button>
    </div>
  );
}
