/*
 * Briques de l'espace commercial, sur le kit ember glass de la gestion :
 * plaques pour tout ce qui se lit, bouton plein en braise pour l'action
 * principale, filets pour le reste. Cibles d'au moins 44 px : l'outil se
 * tient d'une main.
 */

import { Plate, Shimmer } from "@/components/gestion/ui";

export const primaryButton = "g-btn g-btn-primary g-press";
export const ghostButton = "g-btn g-btn-secondary g-press";
export const dangerButton = "g-btn g-btn-danger g-press";
export const cardClass = "g-plate p-4";

export function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="g-eyebrow">{children}</h2>
      {aside}
    </div>
  );
}

export function PageTitle({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div>
      <h1 className="font-display text-g-h2 tracking-tight">{children}</h1>
      {sub && <p className="mt-1 text-g-body text-muted">{sub}</p>}
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Plate className="flex flex-col items-center gap-3 border-dashed px-6 py-10 text-center">
      <p className="text-g-body text-muted">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={ghostButton}>
          Réessayer
        </button>
      )}
    </Plate>
  );
}

export function Skeleton() {
  return (
    <div aria-busy className="flex flex-col gap-3">
      <Shimmer className="h-20" />
      <Shimmer className="h-20" />
      <Shimmer className="h-20" />
    </div>
  );
}

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

/** Message d'une erreur de la base, tel quel : les fonctions écrivent en français. */
export const errorMessage = (cause: unknown) =>
  cause instanceof Error ? cause.message : "Une erreur est survenue.";

/** Groupe de pastilles sous un intitulé : un <label> ne doit pas envelopper des boutons. */
export function FieldGroup({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="group" aria-label={label} className="g-field">
      <span className="g-field-label">
        {label}
        {required && <b aria-hidden>*</b>}
      </span>
      {children}
      {hint && <span className="g-field-hint">{hint}</span>}
    </div>
  );
}

/** Choix multiple parmi des pastilles. */
export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { id: T; label: string }[];
  value: readonly T[];
  onChange: (next: T[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const on = value.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((id) => id !== option.id) : [...value, option.id])}
            className={`g-btn g-press ${on ? "g-btn-primary" : "g-btn-secondary"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Un seul choix parmi des pastilles. */
export function Choice<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { id: T; label: string }[];
  value: T | undefined;
  onChange: (next: T) => void;
}) {
  return <Chips options={options} value={value ? [value] : []} onChange={(next) => onChange(next.at(-1) ?? value!)} />;
}
