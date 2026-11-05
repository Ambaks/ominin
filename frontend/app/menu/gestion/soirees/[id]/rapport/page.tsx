"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  BackToSoirees,
  ClubLoadError,
  ClubLocked,
  ClubSkeleton,
  NightNotFound,
} from "@/components/gestion/soirees/club-states";
import { Money } from "@/components/gestion/soirees/money";
import { ErrorNotice, GlassButton, Notice, Plate, ReserveGerant, SectionHeading, Shimmer } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import { downloadBlob, downloadCsv } from "@/lib/admin/csv";
import { formatCents, formatDateTime, formatHours, formatNightShort } from "@/lib/club/format";
import {
  ETAT_LABELS,
  RAPPORT_PERIMETRE,
  rapportCsv,
  rapportFilename,
  rapportSections,
  SOURCE_LABELS,
  type Rapport,
} from "@/lib/club/rapport";
import * as clubApi from "@/lib/gestion/club-api";
import { useClub, useClubLoadError } from "@/lib/gestion/club-store";
import { describeError } from "@/lib/gestion/errors";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";

/*
 * Le rapport financier d'une soirée (direction) : réservations, acomptes et
 * tables, puis le détail par zone, par réservation et par paiement. Calculé
 * en base depuis les paiements enregistrés (club_rapport) ; exporté tel quel
 * en Excel et en PDF.
 */

const rise = (index: number) => ({ "--g-i": index }) as CSSProperties;

/** Un détail replié : la page reste courte, le chiffre est dans le titre. */
function Detail({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <Plate className="overflow-hidden">
      <details className="group">
        <summary className="flex min-h-g-control cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-g-label font-semibold [&::-webkit-details-marker]:hidden">
          <span>
            {title} · <span className="tabular-nums">{count}</span>
          </span>
          <svg viewBox="0 0 24 24" className="size-4 text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </summary>
        <div className="overflow-x-auto border-t border-hairline">{children}</div>
      </details>
    </Plate>
  );
}

const TH = "px-4 py-2.5 text-left text-g-meta font-medium text-muted whitespace-nowrap";
const TD = "px-4 py-2.5 text-g-body whitespace-nowrap";
const NUM = `${TD} text-right tabular-nums`;

export default function RapportPage() {
  const { id } = useParams<{ id: string }>();
  const state = useGestion();
  const { can, hasFeature } = useGestionAccess();
  const club = useClub();
  const clubError = useClubLoadError();
  const toast = useToast();
  const gerant = can("soirees.edit");
  const [rapport, setRapport] = useState<Rapport | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [exporting, setExporting] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // Lu une fois le club chargé, pas à chaque mouvement de la soirée : un
  // rapport est une photo, « établi le » le date.
  const ready = club !== null;
  useEffect(() => {
    if (!gerant || !ready) return;
    let current = true;
    clubApi.fetchRapport(id).then(
      (next) => {
        if (!current) return;
        setRapport(next);
        setError(null);
      },
      (failure: unknown) => {
        if (current) setError(failure);
      }
    );
    return () => {
      current = false;
    };
  }, [gerant, ready, id, attempt]);
  const retry = () => {
    setError(null);
    setAttempt((value) => value + 1);
  };

  if (!state) return null;
  if (!hasFeature("soirees")) return <ClubLocked />;
  if (!gerant) return <ReserveGerant ask="lire les rapports financiers" />;
  if (!club) return clubError ? <ClubLoadError message={clubError} /> : <ClubSkeleton />;
  const event = club.events.find((candidate) => candidate.id === id);
  if (!event) return <NightNotFound />;

  const filename = rapportFilename(event.title, event.startsAt);
  const exportPdf = async () => {
    if (!rapport) return;
    setExporting(true);
    try {
      const { rapportPdf } = await import("@/lib/club/rapport-pdf");
      const bytes = await rapportPdf(state.etablissement.name, event, rapport);
      downloadBlob(`${filename}.pdf`, new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
    } catch (failure) {
      toast.error(describeError(failure).message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="soirees-page flex flex-col gap-5">
      <div className="g-rise flex flex-col gap-2" style={rise(0)}>
        <BackToSoirees />
        <SectionHeading
          level={1}
          title={`Rapport · ${event.title}`}
          sub={`${formatNightShort(event.startsAt)} · ${formatHours(event.startsAt, event.endsAt)}${
            rapport ? ` · établi le ${formatDateTime(rapport.genere_le)}` : ""
          }`}
          right={
            <div className="flex flex-wrap items-center gap-3">
              <GlassButton disabled={!rapport} onClick={() => rapport && downloadCsv(`${filename}.csv`, rapportCsv(rapport, event.title))}>
                Exporter en Excel
              </GlassButton>
              <GlassButton variant="primary" disabled={!rapport || exporting} onClick={() => void exportPdf()}>
                {exporting ? "Un instant…" : "Exporter en PDF"}
              </GlassButton>
            </div>
          }
        />
      </div>

      {event.cancelledAt && <Notice title="Soirée annulée" text="Ses tables ont été remboursées ou annulées : le rapport le montre." />}

      {error ? (
        <ErrorNotice error={error} onRetry={retry} />
      ) : !rapport ? (
        <div aria-busy className="flex flex-col gap-3">
          <Shimmer className="h-32" />
          <Shimmer className="h-32" />
        </div>
      ) : (
        <>
          <div className="g-rise grid gap-g-gap lg:grid-cols-3" style={rise(1)}>
            {rapportSections(rapport.totaux).map((section) => (
              <Plate key={section.title} className="flex flex-col gap-3 p-5">
                <h2 className="g-eyebrow">{section.title}</h2>
                <dl className="flex flex-col divide-y divide-hairline">
                  {section.chiffres.map((chiffre) => (
                    <div key={chiffre.label} className="flex items-baseline justify-between gap-4 py-2.5">
                      <dt className="min-w-0">
                        <span className="block text-g-body">{chiffre.label}</span>
                        {chiffre.hint && <span className="block text-g-meta text-muted">{chiffre.hint}</span>}
                      </dt>
                      <dd className="shrink-0 text-g-h2 tabular-nums">
                        {chiffre.money ? <Money cents={chiffre.value} /> : chiffre.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Plate>
            ))}
          </div>

          <p className="g-rise text-g-meta text-muted" style={rise(2)}>
            {RAPPORT_PERIMETRE}
          </p>

          <section className="g-rise flex flex-col gap-3" style={rise(2)} aria-label="Par zone">
            <h2 className="font-display text-g-h2">Par zone</h2>
            <Plate className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-hairline">
                  <tr>
                    <th className={TH}>Zone</th>
                    <th className={`${TH} text-right`}>Réservations</th>
                    <th className={`${TH} text-right`}>Honorées</th>
                    <th className={`${TH} text-right`}>Acomptes nets</th>
                    <th className={`${TH} text-right`}>En attente</th>
                    <th className={`${TH} text-right`}>Sur place</th>
                    <th className={`${TH} text-right`}>Reste</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {rapport.zones.map((zone) => (
                    <tr key={zone.zone_id}>
                      <td className={`${TD} font-medium`}>{zone.name}</td>
                      <td className={NUM}>{zone.reservations}</td>
                      <td className={NUM}>{zone.honorees}</td>
                      <td className={NUM}>{formatCents(zone.acomptes_nets_cents)}</td>
                      <td className={NUM}>{formatCents(zone.acomptes_en_attente_cents)}</td>
                      <td className={NUM}>{formatCents(zone.sur_place_cents)}</td>
                      <td className={NUM}>{formatCents(zone.reste_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Plate>
          </section>

          <div className="g-rise flex flex-col gap-3" style={rise(3)}>
            <Detail title="Détail des réservations" count={rapport.reservations.length}>
              <table className="w-full">
                <thead className="border-b border-hairline">
                  <tr>
                    <th className={TH}>Nom</th>
                    <th className={TH}>Zone · table</th>
                    <th className={TH}>Prise</th>
                    <th className={TH}>État</th>
                    <th className={`${TH} text-right`}>Prix</th>
                    <th className={`${TH} text-right`}>Acompte net</th>
                    <th className={`${TH} text-right`}>Sur place</th>
                    <th className={`${TH} text-right`}>Reste</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {rapport.reservations.map((ligne) => (
                    <tr key={ligne.booking_id}>
                      <td className={`${TD} font-medium`}>{ligne.name}</td>
                      <td className={TD}>
                        {ligne.zone_name} · {ligne.table_label ?? "à placer"}
                      </td>
                      <td className={TD}>{SOURCE_LABELS[ligne.source]}</td>
                      <td className={TD}>{ETAT_LABELS[ligne.etat]}</td>
                      <td className={NUM}>{formatCents(ligne.price_cents)}</td>
                      <td className={NUM}>
                        {formatCents(ligne.en_ligne_cents - ligne.rembourse_cents)}
                        {ligne.en_attente_cents > 0 && (
                          <span className="block text-g-meta text-muted">+ {formatCents(ligne.en_attente_cents)} en attente</span>
                        )}
                      </td>
                      <td className={NUM}>{formatCents(ligne.sur_place_cents)}</td>
                      <td className={NUM}>{formatCents(ligne.reste_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Detail>

            <Detail title="Paiements et remboursements" count={rapport.paiements.length}>
              {rapport.paiements.length === 0 ? (
                <p className="px-5 py-4 text-g-body text-muted">Aucun paiement enregistré.</p>
              ) : (
                <table className="w-full">
                  <thead className="border-b border-hairline">
                    <tr>
                      <th className={TH}>Payé le</th>
                      <th className={TH}>Par</th>
                      <th className={TH}>Moyen</th>
                      <th className={TH}>Remboursé le</th>
                      <th className={`${TH} text-right`}>Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {rapport.paiements.map((paiement) => (
                      <tr key={paiement.id}>
                        <td className={`${TD} tabular-nums`}>{formatDateTime(paiement.paid_at)}</td>
                        <td className={TD}>{paiement.name}</td>
                        <td className={TD}>{paiement.method === "en_ligne" ? "En ligne" : "Sur place"}</td>
                        <td className={`${TD} tabular-nums`}>{formatDateTime(paiement.refunded_at) || "—"}</td>
                        <td className={`${NUM} ${paiement.status === "remboursee" ? "text-muted line-through" : ""}`}>
                          {formatCents(paiement.amount_cents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Detail>
          </div>
        </>
      )}
    </div>
  );
}
