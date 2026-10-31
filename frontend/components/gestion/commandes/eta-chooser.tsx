import { GlassButton } from "@/components/gestion/ui";
import { COLLECT_ETA_CHOICES_MIN } from "@/lib/gestion/constants";
import { XIcon } from "../icons";

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
      <span className="text-g-meta text-muted">Prête dans&nbsp;:</span>
      {COLLECT_ETA_CHOICES_MIN.map((minutes) => (
        <GlassButton
          key={minutes}
          className="tabular-nums"
          onClick={() => onChoose(new Date(Date.now() + minutes * 60_000).toISOString())}
        >
          {minutes} min
        </GlassButton>
      ))}
      <GlassButton onClick={() => onChoose()}>Sans estimation</GlassButton>
      <GlassButton variant="icon" aria-label="Fermer le choix de délai" onClick={onClose}>
        <XIcon />
      </GlassButton>
    </div>
  );
}
