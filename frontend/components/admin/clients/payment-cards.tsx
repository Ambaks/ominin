import { formatPercent } from "@/lib/admin/format";
import type { PaymentCardRow } from "@/lib/admin/metrics";

const countryNames = new Intl.DisplayNames("fr", { type: "region" });

const GROUPS: {
  dimension: string;
  title: string;
  label: (value: string) => string;
}[] = [
  {
    dimension: "funding",
    title: "Type",
    label: (value) =>
      ({ debit: "Débit", credit: "Crédit", prepaid: "Prépayée" })[value] ?? value,
  },
  {
    dimension: "country",
    title: "Pays d'émission",
    label: (value) => countryNames.of(value) ?? value,
  },
  {
    dimension: "three_ds",
    title: "3-D Secure",
    label: (value) =>
      ({
        none: "Sans 3-D Secure",
        authenticated: "Authentifiée",
        attempt_acknowledged: "Tentative reconnue",
        exempted: "Exemptée",
        failed: "Échouée",
        not_supported: "Non prise en charge",
        processing_error: "Erreur de traitement",
      })[value] ?? value,
  },
  {
    dimension: "brand",
    title: "Marque",
    label: (value) =>
      ({ visa: "Visa", mastercard: "Mastercard", amex: "American Express" })[value] ?? value,
  },
  {
    dimension: "wallet",
    title: "Saisie",
    label: (value) =>
      ({ none: "Carte saisie", apple_pay: "Apple Pay", google_pay: "Google Pay" })[value] ?? value,
  },
];

/*
 * Ce que coûte chaque encaissement dépend de la carte : débit ou crédit, pays
 * d'émission, 3-D Secure. Chaque critère a son propre total : Square ne donne
 * que la marque et le type, et une carte refusée pas toujours son 3-D Secure.
 */
export function PaymentCards({ rows }: { rows: PaymentCardRow[] | null }) {
  return (
    <section className="rounded-2xl border border-hairline bg-surface p-5">
      <h2 className="font-display text-lg font-medium">Cartes</h2>
      <p className="mt-1 mb-4 text-xs text-muted">
        Tentatives terminées dont la carte est connue. Square ne donne que le
        type et la marque, Stripe aussi le pays et le 3-D Secure.
      </p>
      {rows === null ? (
        <div aria-busy className="shimmer h-40 rounded-2xl" />
      ) : rows.length === 0 ? (
        <p className="flex h-24 items-center justify-center rounded-2xl border border-dashed border-hairline text-sm text-muted">
          Aucune carte connue sur la période.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {GROUPS.map(({ dimension, title, label }) => {
            const group = rows.filter((row) => row.dimension === dimension);
            if (group.length === 0) return null;
            const total = group.reduce((sum, row) => sum + row.attempts, 0);
            return (
              <table key={dimension} className="w-full self-start text-sm">
                <thead>
                  <tr className="border-b border-hairline text-left text-[10px] uppercase tracking-[0.18em] text-faint">
                    <th className="py-2 font-semibold">{title}</th>
                    <th className="py-2 text-right font-semibold">Tentatives</th>
                    <th className="py-2 pl-3 text-right font-semibold">Part</th>
                    <th className="py-2 pl-3 text-right font-semibold">Réussite</th>
                  </tr>
                </thead>
                <tbody>
                  {group.map((row) => (
                    <tr key={row.value} className="border-b border-hairline last:border-0">
                      <td className="py-2.5 pr-3">{label(row.value)}</td>
                      <td className="py-2.5 text-right tabular-nums">{row.attempts}</td>
                      <td className="py-2.5 pl-3 text-right tabular-nums">
                        {formatPercent(row.attempts / total)}
                      </td>
                      <td className="py-2.5 pl-3 text-right tabular-nums text-muted">
                        {formatPercent(row.succeeded / row.attempts)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })}
        </div>
      )}
    </section>
  );
}
