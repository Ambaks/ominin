import { Chip } from "@/components/gestion/ui";

/** Vente saisie sur la caisse Popina : elle se lit ici, elle se modifie sur la caisse. */
export function TillChip() {
  return (
    <span title="Saisie sur la caisse : elle se modifie sur la caisse.">
      <Chip>Caisse</Chip>
    </span>
  );
}
