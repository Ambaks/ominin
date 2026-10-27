"use client";

/* 28 × 48 px à l'œil, 44 px de zone tactile (marge invisible autour). */
export function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-all before:absolute before:-inset-2 before:content-[''] ${
        checked ? "ember-gradient" : "border border-hairline bg-surface"
      } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
    >
      <span
        className={`absolute top-1 size-5 rounded-full transition-all ${
          checked ? "left-6 bg-background" : "left-1 bg-muted"
        }`}
      />
    </button>
  );
}
