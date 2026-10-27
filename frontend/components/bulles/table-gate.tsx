"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { CLUB_TIMING } from "@/components/club/timing";
import { formatStartMinutes } from "@/lib/bulles/format";
import { bulleUrl, partageUrl } from "@/lib/bulles/links";
import { parisParts } from "@/lib/collect/hours";
import { tableParam } from "@/lib/menu/table-param";
import { useQueryParam } from "@/lib/menu/use-query-param";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

/*
 * Le menu QR posé dans une bulle : on n'y commande qu'une fois toutes les
 * places du groupe payées (orders_bulle_payee le refuse en base). Le menu le
 * dit d'entrée — ce qui manque et le lien pour le payer — et le panier ne
 * propose pas d'envoyer une commande qui serait refusée.
 */

type TableState = Database["public"]["Functions"]["bulle_table_etat"]["Returns"][number];

const BlockContext = createContext<string | null>(null);

/** Pourquoi la table ne peut pas commander ; null si elle le peut (ou n'est pas une bulle). */
export function useBulleOrderBlock(): string | null {
  return useContext(BlockContext);
}

function blockOf(state: TableState | null): string | null {
  if (!state || state.ordering) return null;
  if (!state.reservation_status) return `${state.bulle_name} n'est pas réservée en ce moment.`;
  const left = state.party_size - state.places_paid;
  if (left > 0) return `Encore ${left} place${left > 1 ? "s" : ""} à payer pour commander.`;
  return "Toutes les places sont payées : la carte s'ouvre au début de votre créneau.";
}

export function BulleTableGate({
  slug,
  enabled,
  children,
}: {
  slug: string;
  /** L'établissement a des bulles : sans elles, aucune table n'en est une. */
  enabled: boolean;
  children: ReactNode;
}) {
  const table = tableParam(useQueryParam("table") ?? undefined);
  const [state, setState] = useState<TableState | null>(null);

  useEffect(() => {
    if (!enabled || !table) return;
    let cancelled = false;
    const read = () => {
      if (document.hidden) return;
      void createClient()
        .rpc("bulle_table_etat", { p_slug: slug, p_table: table })
        .then(({ data }) => {
          if (!cancelled) setState(data?.[0] ?? null);
        });
    };
    read();
    // Les places se paient pendant qu'on lit la carte : la table se relit.
    const timer = window.setInterval(read, CLUB_TIMING.refresh);
    document.addEventListener("visibilitychange", read);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", read);
    };
  }, [slug, table, enabled]);

  const block = blockOf(state);
  return (
    <BlockContext.Provider value={block}>
      {state && block && <BulleBanner slug={slug} state={state} message={block} />}
      {children}
    </BlockContext.Provider>
  );
}

function BulleBanner({ slug, state, message }: { slug: string; state: TableState; message: string }) {
  const canPay = state.share_token && state.places_paid > 0 && state.places_paid < state.party_size;
  const href = canPay && state.share_token ? partageUrl(slug, state.share_token) : bulleUrl(slug);
  const starts = state.starts_at ? formatStartMinutes(parisParts(new Date(state.starts_at)).minutes) : null;
  return (
    <aside
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-surface-raised px-4 py-3"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden className="size-8 shrink-0 rounded-full" style={{ background: state.bulle_color }} />
        <p className="text-sm leading-snug">
          <strong className="font-semibold">
            {state.bulle_name}
            {starts ? ` · ${starts}` : ""}
          </strong>
          <br />
          <span className="text-muted">{message}</span>
        </p>
      </div>
      {(canPay || !state.reservation_status) && (
        <a href={href} className="ember-gradient inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold text-background">
          {canPay ? "Payer les places" : "Réserver"}
        </a>
      )}
    </aside>
  );
}
