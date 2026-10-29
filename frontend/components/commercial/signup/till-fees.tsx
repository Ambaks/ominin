import { cardClass } from "@/components/commercial/space/ui";
import { cardOffer, SAVING_EXAMPLE } from "@/lib/commercial/card-offer";
import { tillFees } from "@/lib/commercial/tills";
import { formatPrice } from "@/lib/menu/format";

const percent = (value: number) => `${value.toLocaleString("fr-FR")}\u00a0%`;

/*
 * Sous la question de la caisse, pour le commercial : ce que la caisse du
 * restaurant prend sur un paiement carte, et l'offre Stripe d'Ominin au
 * comptoir quand elle est plus basse. Un argument de vente, rien n'est enregistré.
 */
export function TillFees({ till }: { till: string }) {
  const { fees, source } = tillFees(till);
  const offer = fees.kind === "percent" ? cardOffer(fees) : null;

  return (
    <div className={`${cardClass} rise flex flex-col gap-2 text-sm`}>
      {fees.kind === "percent" && (
        <p>
          Chez {till}{"\u00a0"}: <span className="font-semibold">{percent(fees.percent)}{fees.fixedCents > 0 && ` + ${formatPrice(fees.fixedCents / 100)}`}</span> par paiement carte
        </p>
      )}
      {fees.kind === "none" && <p>{till} ne prend pas de commission sur vos paiements.</p>}
      {fees.kind === "check" && <p className="text-muted">Frais de carte de {till}{"\u00a0"}: à vérifier avec le restaurant.</p>}
      {offer && (
        <>
          <p>
            Avec la caisse Stripe d’Ominin{"\u00a0"}: <span className="ember-text font-semibold">{percent(offer.percent)}</span> au comptoir
          </p>
          <p className="text-muted">
            Pour {SAVING_EXAMPLE.paymentsPerMonth.toLocaleString("fr-FR")} paiements de {formatPrice(SAVING_EXAMPLE.basket)} par mois{"\u00a0"}:{" "}
            <span className="font-semibold text-foreground">{formatPrice(offer.monthlySaving)}</span> d’économie par mois.
          </p>
          <p className="text-muted">Vous gardez {till} et Ominin s’y branche, ou vous passez à la caisse Stripe d’Ominin.</p>
          <p className="text-xs text-faint">Tarif proposé, à confirmer avec Ominin.</p>
        </>
      )}
      {source && (
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-xs text-faint underline decoration-hairline underline-offset-4">
          Tarif public relevé le {source.readOn.split("-").reverse().join("/")}
        </a>
      )}
    </div>
  );
}
