import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PaidBurst } from "@/components/club/booking-live";
import { ClubFooter, ClubTop } from "@/components/club/chrome";
import { SeatRing, type SeatShare } from "@/components/club/seat-ring";
import { ShareJoin, ShareMeter } from "@/components/club/share-live";
import { formatCents, formatHours, formatNight, formatNightShort, tableName } from "@/lib/club/format";
import { clubHref } from "@/lib/club/links";
import { fetchShareByToken } from "@/lib/club/public";

/* Une part payée par un autre ami change la table : relue à chaque visite. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Une table à partager",
  robots: { index: false, follow: false, nocache: true },
};

type Params = Promise<{ slug: string; shareToken: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export default async function SharePage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ slug, shareToken }, query] = await Promise.all([params, searchParams]);
  const table = await fetchShareByToken(shareToken);
  if (!table || table.club.slug !== slug) notFound();

  // ?part=<paiement> : la personne qui vient de payer, revenue du paiement.
  const yours = typeof query.part === "string" ? table.payers.find((payer) => payer.id === query.part) : undefined;
  const shares: SeatShare[] = table.payers.map((payer) => ({
    id: payer.id,
    name: payer.name,
    amountCents: payer.amountCents,
    tone: payer.id === yours?.id ? "you" : payer.organiser ? "organiser" : "friend",
  }));
  const complete = table.remainingCents <= 0;
  const cancelled = Boolean(table.event.cancelledAt) || table.status === "annulee" || table.status === "remboursee";
  // Confirmée, ni annulée ni complète, mais fermée : la soirée a commencé.
  const started = !cancelled && !table.open && (table.status === "payee" || table.status === "arrivee");
  const joinable = table.open && !complete && table.seatsLeft > 0 && !yours;
  const night = capitalize(formatNight(table.event.startsAt));
  const where = tableName(table.table.zone, table.table.label);

  return (
    <main className="club-page club-share-page">
      <ClubTop slug={slug} name={table.club.name} />
      {yours && <PaidBurst target={`.club-seat[data-fresh]`} param="part" />}

      <section className="club-share-layout" data-chapter>
        <header className="club-share-hero">
          <p className="club-label">Invitation</p>
          <h1 className="club-h1">
            {yours ? "Votre place est prise" : `${table.organiser} vous invite à sa table`}
          </h1>
          <p className="club-date-chip">
            {night} · <span className="club-mono">{formatHours(table.event.startsAt, table.event.endsAt)}</span>
          </p>
          <p className="club-lead">
            {table.event.title} · {where} · {table.partySize} pers.
          </p>
        </header>

        <div className="club-share-board">
          <SeatRing
            seats={table.partySize}
            priceCents={table.priceCents}
            shares={shares}
            label={table.table.label}
            freshId={yours?.id ?? table.payers.at(-1)?.id}
          />
          <ShareMeter paidCents={table.paidCents} priceCents={table.priceCents} />
          <ul className="club-payers" aria-label="Déjà à table">
            {table.payers.map((payer) => (
              <li key={payer.id} data-you={payer.id === yours?.id || undefined}>
                <span>
                  {payer.id === yours?.id ? "Vous" : payer.name}
                  {payer.organiser && <span className="club-pill-tag">Hôte</span>}
                </span>
                <span className="club-mono">{formatCents(payer.amountCents)}</span>
              </li>
            ))}
          </ul>
        </div>

        {yours ? (
          <div className="club-share-state" data-tone="success" role="status">
            <p className="club-sheet-title">C&rsquo;est réglé.</p>
            <p className="club-lead">
              {`Votre part de ${formatCents(yours.amountCents)} est payée : votre reçu arrive par e-mail. À l’entrée, présentez-vous avec ${table.organiser.split(" ")[0]}, pièce d’identité à la main.`}
            </p>
          </div>
        ) : cancelled ? (
          <div className="club-share-state" data-tone="muted" role="status">
            <p className="club-sheet-title">Soirée annulée</p>
            <p className="club-lead">Les parts déjà payées sont remboursées automatiquement.</p>
          </div>
        ) : complete ? (
          <div className="club-share-state" data-tone="success" role="status">
            <p className="club-sheet-title">Table entièrement payée</p>
            <p className="club-lead">Toutes les parts sont réglées. Belle soirée à toute la table.</p>
          </div>
        ) : started ? (
          <div className="club-share-state" data-tone="muted" role="status">
            <p className="club-sheet-title">La soirée a commencé</p>
            <p className="club-lead">
              Le lien est fermé : le reste, <strong className="club-mono">{formatCents(table.remainingCents)}</strong>, se
              règle à l&rsquo;entrée.
            </p>
          </div>
        ) : joinable ? (
          <section className="club-share-join" aria-labelledby="part-titre">
            <h2 id="part-titre" className="club-h2">
              Payer votre part
            </h2>
            <p className="club-lead">
              Reste <strong className="club-mono">{formatCents(table.remainingCents)}</strong> pour {table.seatsLeft}{" "}
              place{table.seatsLeft > 1 ? "s" : ""}. Choisissez votre montant, frais de service en plus.
            </p>
            <ShareJoin
              shareToken={table.shareToken}
              provider={table.club.paymentProvider}
              minimumCents={table.minimumCents}
              remainingCents={table.remainingCents}
              feePercent={table.feePercent}
              conditions={table.club.conditions}
              recap={`${capitalize(formatNightShort(table.event.startsAt))} · ${where}`}
            />
          </section>
        ) : (
          <div className="club-share-state" data-tone="muted" role="status">
            <p className="club-sheet-title">Toutes les parts sont prises</p>
            <p className="club-lead">Le reste se règle à l&rsquo;entrée.</p>
          </div>
        )}

        <Link href={clubHref(`/${slug}/${table.event.slug}`)} className="club-text-link">
          Voir la soirée
        </Link>
      </section>

      <ClubFooter name={table.club.name} address={table.club.address} phone={null} />
    </main>
  );
}
