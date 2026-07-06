"use client";

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
      className={`relative h-6 w-11 shrink-0 rounded-full transition-all ${
        checked ? "ember-gradient" : "border border-hairline bg-surface"
      } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
    >
      <span
        className={`absolute top-1 size-4 rounded-full transition-all ${
          checked ? "left-6 bg-background" : "left-1 bg-muted"
        }`}
      />
    </button>
  );
}
