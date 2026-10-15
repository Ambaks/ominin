/*
 * 16 px dès qu'un doigt peut toucher l'écran : en dessous, iOS zoome sur le
 * champ au focus — et la page saute. Un iPad en paysage passe le seuil lg,
 * la taille réduite ne vaut donc que pour un écran large ET une souris.
 */
export const inputClass =
  "w-full rounded-xl border border-hairline bg-background px-4 py-2.5 text-base outline-none transition-colors placeholder:text-faint focus:border-ember-2/50 lg:pointer-fine:text-sm";

export function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  /** Erreur à corriger, affichée à la place de l'indication ; aria-invalid se pose sur le champ. */
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">
        {label}
        {required && <span className="text-ember-2"> *</span>}
      </span>
      {children}
      {error ? (
        <span role="alert" className="text-xs font-medium text-ember-3">
          {error}
        </span>
      ) : (
        hint && <span className="text-xs text-faint">{hint}</span>
      )}
    </label>
  );
}
