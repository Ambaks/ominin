/*
 * Briques de l'espace commercial, au style de l'admin : cartes à filet,
 * boutons pleins en braise pour l'action principale, contours pour le reste.
 * Cibles d'au moins 44 px : l'outil se tient d'une main.
 */

export const primaryButton =
  "ember-gradient inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold text-background transition-opacity disabled:opacity-60";
export const ghostButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-hairline px-4 text-sm font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground disabled:opacity-60";
export const dangerButton =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-ember-3/50 bg-ember-3/10 px-4 text-sm font-semibold text-ember-3 transition-colors hover:bg-ember-3/20 disabled:opacity-60";
export const cardClass = "rounded-2xl border border-hairline bg-surface p-4";

export function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-faint">{children}</h2>
      {aside}
    </div>
  );
}

export function PageTitle({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div>
      <h1 className="font-display text-2xl font-medium tracking-tight">{children}</h1>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-hairline px-6 py-10 text-center">
      <p className="text-sm text-muted">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={ghostButton}>
          Réessayer
        </button>
      )}
    </div>
  );
}

export function Skeleton() {
  return (
    <div aria-busy className="flex flex-col gap-3">
      <div className="shimmer h-20 rounded-2xl" />
      <div className="shimmer h-20 rounded-2xl" />
      <div className="shimmer h-20 rounded-2xl" />
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
    <div role="group" aria-label={label} className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">
        {label}
        {required && <span className="text-ember-2"> *</span>}
      </span>
      {children}
      {hint && <span className="text-xs text-faint">{hint}</span>}
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
            className={`min-h-11 rounded-full border px-4 text-sm font-medium transition-colors ${
              on ? "border-ember-2/60 bg-ember-2/10 text-foreground" : "border-hairline text-muted"
            }`}
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
