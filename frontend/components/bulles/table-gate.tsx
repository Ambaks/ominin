"use client";

import { createContext, useContext, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { CLUB_TIMING } from "@/components/club/timing";
import { bulleTableUrl, bulleUrl } from "@/lib/bulles/links";
import { capitalize, formatBulleNight } from "@/lib/bulles/format";
import { formatCents, formatHours } from "@/lib/club/format";
import { tableParam } from "@/lib/menu/table-param";
import { useQueryParam } from "@/lib/menu/use-query-param";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

/*
 * Le menu QR posé dans une bulle : on n'y commande qu'une fois toutes les
 * places du groupe payées et le créneau commencé (orders_bulle_payee le refuse
 * en base). Tant qu'une réservation concerne la table, une page aux couleurs
 * de la bulle remplace la carte : le créneau, le reste, le bouton pour payer.
 * La table se relit : dès que le reste est réglé, par qui que ce soit, la carte
 * s'ouvre sur tous les téléphones, sans recharger. Sans réservation, la carte
 * se lit et le panier ne propose pas d'envoyer une commande qui serait refusée,
 * jusqu'à ce que l'accueil ouvre la table : elle commande alors comme une autre.
 */

type TableState = Database["public"]["Functions"]["bulle_table_etat"]["Returns"][number];

const BlockContext = createContext<string | null>(null);

/** Pourquoi la table ne peut pas commander ; null si elle le peut (ou n'est pas une bulle). */
export function useBulleOrderBlock(): string | null {
  return useContext(BlockContext);
}

function blockOf(state: TableState | null): string | null {
  if (!state || state.ordering) return null;
  if (!state.reservation_status) return "Demandez à l'accueil d'ouvrir la table ou réservez la bulle.";
  if (state.reste_cents > 0) return `Encore ${formatCents(state.reste_cents)} à payer pour commander.`;
  return "Toutes les places sont payées : la carte s'ouvre au début de votre créneau.";
}

export function BulleTableGate({
  slug,
  enabled,
  dayEndHour,
  children,
}: {
  slug: string;
  /** Bascule du jour de service : un créneau d'après minuit reste au soir réservé. */
  dayEndHour: number;
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
    // Les places se paient pendant qu'on regarde la page : la table se relit.
    const timer = window.setInterval(read, CLUB_TIMING.refresh);
    document.addEventListener("visibilitychange", read);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", read);
    };
  }, [slug, table, enabled]);

  const block = blockOf(state);
  const gated = Boolean(state?.reservation_status && block);
  // Aucun conteneur autour de la carte : les thèmes visent les enfants directs
  // de [data-menu-root] (le velours, l'en-tête, le pied). Fermée, la carte est
  // cachée par la feuille de style (.bulle-gate), pas retirée : elle et son
  // panier reviennent tels quels.
  return (
    <BlockContext.Provider value={block}>
      {state && block && table && gated && <BulleGate slug={slug} table={table} state={state} message={block} dayEndHour={dayEndHour} />}
      {state && block && !gated && <BulleBanner slug={slug} state={state} message={block} />}
      {children}
    </BlockContext.Provider>
  );
}

/** Ni nom ni téléphone : qui scanne n'a pas à savoir qui a réservé. */
function BulleGate({
  slug,
  table,
  state,
  message,
  dayEndHour,
}: {
  slug: string;
  table: number;
  state: TableState;
  message: string;
  dayEndHour: number;
}) {
  // Le reste se compte en argent (bulle_reste_cents) : un changement de taille le rend exact.
  const left = state.reste_cents;
  return (
    <main
      className="bulle-gate flex min-h-dvh flex-col items-center justify-center gap-6 bg-[#0a0e1c] px-6 py-10 text-center text-[#fbf3e8]"
      style={
        {
          "--bulle": state.bulle_color,
          backgroundImage: "radial-gradient(90% 60% at 50% 30%, color-mix(in srgb, var(--bulle) 70%, transparent), transparent)",
        } as CSSProperties
      }
    >
      <span
        aria-hidden
        className="size-32 rounded-full border border-white/30"
        style={{
          background: "radial-gradient(circle at 32% 28%, rgb(255 255 255 / 0.6), var(--bulle) 45%, color-mix(in srgb, var(--bulle) 55%, black))",
        }}
      />
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">{state.bulle_name}</h1>
        <p className="tabular-nums opacity-85">
          {capitalize(formatBulleNight(state.starts_at, dayEndHour, true))} · {formatHours(state.starts_at, state.ends_at)}
        </p>
      </div>
      {left > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-sm opacity-85">Reste à payer</p>
          <p className="text-5xl font-semibold tabular-nums">{formatCents(left)}</p>
        </div>
      )}
      <p role="status" className="max-w-xs leading-snug">
        {state.can_pay || left === 0 ? message : "Le paiement de cette réservation est en cours."}
      </p>
      {state.can_pay && (
        <a
          href={bulleTableUrl(slug, table)}
          className="inline-flex min-h-12 w-full max-w-xs items-center justify-center rounded-full bg-[#fbf3e8] px-6 font-semibold text-[#0a0e1c]"
        >
          Payer {formatCents(left)}
        </a>
      )}
      {left > 0 && (
        <p className="max-w-xs text-sm opacity-75">La carte s&rsquo;ouvre ici toute seule une fois le reste réglé, ou à l&rsquo;accueil.</p>
      )}
    </main>
  );
}

function BulleBanner({ slug, state, message }: { slug: string; state: TableState; message: string }) {
  return (
    <aside
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-surface-raised px-4 py-3"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden className="size-8 shrink-0 rounded-full" style={{ background: state.bulle_color }} />
        <p className="text-sm leading-snug">
          <strong className="font-semibold">{state.bulle_name}</strong>
          <br />
          <span className="text-muted">{message}</span>
        </p>
      </div>
      <a href={bulleUrl(slug)} className="ember-gradient inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold text-background">
        Réserver
      </a>
    </aside>
  );
}
