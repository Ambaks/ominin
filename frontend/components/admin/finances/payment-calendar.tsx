import { formatEuros } from "@/lib/admin/format";
import type { LedgerEntry } from "@/lib/admin/finances";

const WEEK_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/** Le mois en semaines, du lundi au dimanche ; les abonnements en premier chaque jour. */
export function PaymentCalendar({
  month,
  today,
  entries,
}: {
  month: string;
  today: string;
  entries: readonly LedgerEntry[];
}) {
  const [year, monthNumber] = month.split("-").map(Number);
  const dayCount = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const leading = (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const days = Array.from({ length: dayCount }, (_, index) => index + 1);

  return (
    <div className="grid grid-cols-7 gap-1">
      {WEEK_DAYS.map((day) => (
        <p key={day} className="pb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-faint">
          {day}
        </p>
      ))}
      {Array.from({ length: leading }, (_, index) => (
        <div key={`vide-${index}`} />
      ))}
      {days.map((day) => {
        const date = `${month}-${String(day).padStart(2, "0")}`;
        const dayEntries = entries
          .filter((entry) => entry.date === date)
          .sort((a, b) => Number(Boolean(b.subscription)) - Number(Boolean(a.subscription)));
        return (
          <div
            key={date}
            title={dayEntries
              .map((entry) => `${entry.label} · ${formatEuros(entry.amountCents / 100)}`)
              .join("\n")}
            className={`flex min-h-14 min-w-0 flex-col gap-1 rounded-lg border p-1 lg:min-h-20 lg:p-1.5 ${
              date === today ? "border-ember-2/60" : "border-hairline"
            }`}
          >
            <span className={`text-xs tabular-nums ${date === today ? "font-semibold text-ember-1" : "text-faint"}`}>
              {day}
            </span>
            {dayEntries.map((entry) => (
              <span
                key={entry.key}
                className={`truncate rounded px-1 py-0.5 text-[10px] font-medium ${
                  entry.subscription
                    ? "bg-ember-2/15 text-foreground"
                    : "border border-hairline text-muted"
                }`}
              >
                {entry.label}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
