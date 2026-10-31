"use client";

import { useEffect, useState } from "react";
import { Funnel, StatTile, VolumeBar } from "@/components/admin/charts";
import { ComboParfait } from "@/components/admin/clients/combo";
import { PaymentCards } from "@/components/admin/clients/payment-cards";
import { useToast } from "@/components/ui/toast";
import { ITEM_RANKING_COUNT } from "@/lib/admin/constants";
import { formatDayLong, formatEuros, formatPercent } from "@/lib/admin/format";
import {
  conversionRate,
  fetchFunnel,
  fetchItemRanking,
  fetchMeasures,
  fetchPaymentCards,
  paymentFailure,
  type ClientOverview,
  type Funnel as FunnelData,
  type ItemRanking,
  type Measures,
  type PaymentCardRow,
  type Period,
} from "@/lib/admin/metrics";

/*
 * Ce que fait le menu, pas ce qu'il rapporte. L'entonnoir répond à « où on
 * perd les gens », le palmarès à « ce qu'on regarde contre ce qui se vend » —
 * l'écart entre les deux est la seule donnée qu'un restaurateur ne peut
 * obtenir nulle part ailleurs, et le meilleur argument de vente d'Ominin.
 * Consulter, c'est ouvrir la fiche d'un plat (menu_item_views) ; une touche
 * « Ajouter » est un ajout (menu_item_clicks), jamais une consultation.
 */

const count = (n: number, one: string, many: string) =>
  `${n} ${n > 1 ? many : one}`;

export function ClientAnalytique({
  client,
  period,
}: {
  client: ClientOverview;
  period: Period;
}) {
  const toast = useToast();
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [items, setItems] = useState<ItemRanking[] | null>(null);
  const [measures, setMeasures] = useState<Measures | null>(null);
  const [cards, setCards] = useState<PaymentCardRow[] | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect --
       Remise à zéro volontaire : la période a changé, l'écran repart en
       chargement. La suite des setState, elle, suit la réponse réseau. */
    setFunnel(null);
    setItems(null);
    setMeasures(null);
    setCards(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    Promise.all([
      fetchFunnel(client.etablissement_id, period),
      fetchItemRanking(client.etablissement_id, period),
      fetchMeasures(client.etablissement_id, period),
      fetchPaymentCards(client.etablissement_id, period),
    ])
      .then(([nextFunnel, nextItems, nextMeasures, nextCards]) => {
        setFunnel(nextFunnel);
        setItems(nextItems);
        setMeasures(nextMeasures);
        setCards(nextCards);
      })
      .catch((error) =>
        toast.error(
          error instanceof Error ? error.message : "Une erreur est survenue."
        )
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.etablissement_id, period.from, period.to]);

  const topViews = Math.max(1, ...(items ?? []).map((item) => item.views));
  const ranked = (items ?? []).slice(0, ITEM_RANKING_COUNT);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Visites" value={String(client.sessions)} />
        <StatTile
          label="Conversion"
          value={formatPercent(
            conversionRate(client.sessions, client.converted)
          )}
          hint="visites ayant abouti à une commande"
        />
        <StatTile label="Commandes" value={String(client.converted)} />
        <StatTile
          label="Fiches ouvertes"
          value={String(measures?.views ?? 0)}
          hint={count(funnel?.item_clicks ?? 0, "touche « Ajouter »", "touches « Ajouter »")}
        />
      </div>

      <section className="rounded-2xl border border-hairline bg-surface p-5">
        <h2 className="font-display text-lg font-medium">Entonnoir</h2>
        <p className="mt-1 mb-4 text-xs text-muted">
          Part des visites ayant atteint chaque étape.
        </p>
        {funnel === null ? (
          <div aria-busy className="shimmer h-40 rounded-2xl" />
        ) : (
          <Funnel
            steps={[
              { label: "Menu ouvert", value: funnel.sessions },
              { label: "Catégorie", value: funnel.categories },
              { label: "Plat choisi", value: funnel.plats },
              { label: "Panier", value: funnel.paniers },
              { label: "Commande", value: funnel.commandes },
              { label: "Paiement", value: funnel.paiements },
            ]}
          />
        )}
      </section>

      <section className="rounded-2xl border border-hairline bg-surface p-5">
        <h2 className="font-display text-lg font-medium">
          Consulté contre vendu
        </h2>
        <p className="mt-1 mb-4 text-xs text-muted">
          Un plat très consulté qui ne se vend pas est un plat mal décrit, mal
          photographié ou mal placé. Un plat peut aussi s&apos;ajouter sans que
          sa fiche soit ouverte.{" "}
          {measures?.views_since
            ? `Fiches comptées depuis le ${formatDayLong(measures.views_since)}.`
            : "Aucune fiche comptée pour l’instant."}
        </p>
        {items === null ? (
          <div aria-busy className="shimmer h-52 rounded-2xl" />
        ) : ranked.length === 0 ? (
          <p className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-hairline text-sm text-muted">
            Aucun plat consulté, ajouté ou vendu sur la période.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-[10px] uppercase tracking-[0.18em] text-faint">
                  <th className="py-2 font-semibold">Plat</th>
                  <th className="w-32 py-2 font-semibold">Consultations</th>
                  <th className="py-2 text-right font-semibold">Fiches</th>
                  <th className="py-2 text-right font-semibold">Ajouts</th>
                  <th className="py-2 text-right font-semibold">Vendus</th>
                  <th className="py-2 text-right font-semibold">Recette</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((item) => (
                  <tr
                    key={item.item_id}
                    className="border-b border-hairline last:border-0"
                  >
                    <td className="py-2.5 pr-3">{item.name}</td>
                    <td className="py-2.5 pr-3">
                      <VolumeBar ratio={item.views / topViews} />
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      {item.views}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      {item.clicks}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      {item.sold}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-muted">
                      {formatEuros(item.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <PaymentAttempts measures={measures} />

      <PaymentCards rows={cards} />

      <ComboParfait etablissementId={client.etablissement_id} period={period} />
    </div>
  );
}

function PaymentAttempts({ measures }: { measures: Measures | null }) {
  const failure = measures && paymentFailure(measures);
  return (
    <section className="rounded-2xl border border-hairline bg-surface p-5">
      <h2 className="font-display text-lg font-medium">Paiement en ligne</h2>
      <p className="mt-1 mb-4 text-xs text-muted">
        Une tentative expirée ou échouée supprime sa commande, souvent repassée
        aussitôt : ce n&apos;est pas toujours une vente perdue.{" "}
        {measures?.attempts_since
          ? `Tentatives comptées depuis le ${formatDayLong(measures.attempts_since)}.`
          : "Aucune tentative comptée pour l’instant."}
        {measures
          ? ` Sur la période : ${measures.attempts_open} en cours, ${measures.refused} avec un refus de carte.`
          : null}
      </p>
      {measures === null || failure === null ? (
        <div aria-busy className="shimmer h-24 rounded-2xl" />
      ) : failure.closed === 0 ? (
        <p className="flex h-24 items-center justify-center rounded-2xl border border-dashed border-hairline text-sm text-muted">
          Aucune tentative terminée sur la période.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Taux d'échec"
            value={formatPercent(failure.rate)}
            hint={`${failure.failures} sur ${count(failure.closed, "tentative terminée", "tentatives terminées")}`}
          />
          <StatTile label="Réussis" value={String(measures.succeeded)} />
          <StatTile
            label="Expirés ou échoués"
            value={String(failure.failures)}
            hint={`${measures.failed} après un refus de carte, ${measures.expired} sans`}
          />
          <StatTile label="Passés au comptoir" value={String(measures.counter)} />
        </div>
      )}
    </section>
  );
}
