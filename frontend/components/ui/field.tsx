/* text-base sur mobile : en dessous de 16px, iOS zoome sur le champ au focus. */
export const inputClass =
  "w-full rounded-xl border border-hairline bg-background px-4 py-2.5 text-base outline-none transition-colors placeholder:text-faint focus:border-ember-2/50 lg:text-sm";

export function Field({
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
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">
        {label}
        {required && <span className="text-ember-2"> *</span>}
      </span>
      {children}
      {hint && <span className="text-xs text-faint">{hint}</span>}
    </label>
  );
}
