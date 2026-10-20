"use client";

import { useId, useState } from "react";

const control =
  "peer w-full border-0 border-b border-line bg-transparent px-0 pb-3 pt-2 text-[1.0625rem] text-fg outline-none transition-colors duration-300 placeholder:text-muted/60 focus:border-accent-text";

export function Field({
  label,
  name,
  type = "text",
  required,
  multiline,
  placeholder,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  multiline?: boolean;
  placeholder?: string;
  autoComplete?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col-reverse gap-2">
      {multiline ? (
        <textarea id={id} name={name} required={required} placeholder={placeholder} rows={4} className={`${control} resize-none`} />
      ) : (
        <input id={id} name={name} type={type} required={required} placeholder={placeholder} autoComplete={autoComplete} className={control} />
      )}
      <label htmlFor={id} className="label text-muted transition-colors duration-300 peer-focus:text-accent-text">
        {label}
        {required && <span aria-hidden> *</span>}
      </label>
    </div>
  );
}

/* Choix unique présenté en pastilles : une vraie radio dessous, donc clavier et lecteurs d'écran inchangés. */
export function Choices({
  legend,
  name,
  options,
}: {
  legend: string;
  name: string;
  options: readonly string[];
}) {
  const [value, setValue] = useState<string | null>(null);
  return (
    <fieldset>
      <legend className="label mb-4 text-muted">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option}
            className={`cursor-pointer border px-4 py-2.5 text-[0.95rem] transition-colors duration-300 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-text ${
              value === option
                ? "border-accent bg-accent text-accent-ink"
                : "border-line text-fg hover:border-fg"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => setValue(option)}
              className="sr-only"
            />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
