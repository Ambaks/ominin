import { StatTile } from "@/components/gestion/ui";

/** Tuile de statistique de l'admin : un cadre de verre du kit, chiffre sur plaque. */
export function StatCard({
  label,
  value,
  href,
  hint,
  alert,
}: {
  label: string;
  value: string;
  /** Sans href, la tuile est purement informative. */
  href?: string;
  hint?: string;
  /** Valeur en problème (suivis en retard…). */
  alert?: boolean;
}) {
  return <StatTile label={label} value={value} href={href} baseline={hint} entity={alert ? "problem" : "none"} />;
}
