import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { Contribute, TicketWatch } from "@/components/bulles/live";
import { formatBulleNight } from "@/lib/bulles/format";
import { carteUrl } from "@/lib/bulles/links";
import { fetchBulleOffer } from "@/lib/bulles/public";
import { formatCents, formatHours } from "@/lib/club/format";
import { DEFAULT_DAY_END_HOUR } from "@/lib/gestion/constants";
import { tableParam } from "@/lib/menu/table-param";
import { createPublicClient } from "@/lib/supabase/public";

/* Payer le reste depuis la table d'une bulle : l'état change sans ce téléphone, relu à chaque visite. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Payer votre bulle",
  robots: { index: false, follow: false, nocache: true },
};

export default async function BulleTablePage({ params }: PageProps<"/menu/w/[slug]/bulle/table/[table]">) {
  const { slug, table: rawTable } = await params;
  const table = tableParam(rawTable);
  if (!table) notFound();
  const [{ data, error }, offer] = await Promise.all([
    createPublicClient().rpc("bulle_table_etat", { p_slug: slug, p_table: table }),
    fetchBulleOffer(slug),
  ]);
  if (error) throw new Error(error.message);
  const state = data?.[0];
  if (!state) notFound();
  const left = state.reservation_status ? state.party_size - state.places_paid : 0;

  return (
    <div className="bo-bulle-page bo-stack-sm">
      <TicketWatch live={left > 0} />
      <div className="bo-recap" style={{ "--orb": state.bulle_color } as CSSProperties}>
        <span className="bo-orb bo-recap-orb" aria-hidden />
        <div>
          {state.reservation_status && <p className="bo-eyebrow">{formatBulleNight(state.starts_at, offer?.dayEndHour ?? DEFAULT_DAY_END_HOUR)}</p>}
          <p className="bo-recap-title">{state.bulle_name}</p>
          {state.reservation_status && (
            <p className="bo-recap-detail">
              {formatHours(state.starts_at, state.ends_at)}
              {left > 0 && ` · reste ${formatCents(left * state.place_cents)}`}
            </p>
          )}
        </div>
      </div>
      {state.can_pay ? (
        <Contribute target={{ slug, table }} placeCents={state.place_cents} placesLeft={left} allLeft />
      ) : (
        <p className="bo-muted-night bo-text-center">
          {state.reservation_status && left === 0 ? "Toutes les places sont payées." : "Rien à payer pour cette bulle en ce moment."}
        </p>
      )}
      <a className="bo-button bo-button--ghost" href={`${carteUrl(slug)}?table=${table}`}>
        Retour à la carte
      </a>
    </div>
  );
}
