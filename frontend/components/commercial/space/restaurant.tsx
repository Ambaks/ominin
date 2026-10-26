"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeftIcon, GlobeIcon, PhoneIcon, RouteIcon } from "@/components/admin/icons";
import { CATEGORY_LABELS } from "@/lib/admin/constants";
import { httpHref } from "@/lib/admin/format";
import * as api from "@/lib/commercial/api";
import { END_LABELS, STATUS_LABELS } from "@/lib/commercial/labels";
import { mapsDirectionsHref } from "@/lib/collect/shared";
import { frenchDate } from "@/lib/legal/format";
import { retainedSummary } from "./retained";
import { spaceHref, useAccount } from "./shell";
import {
  AbandonSheet,
  DeclareOutcome,
  DeclareSheet,
  OptOutSheet,
  PassageSheet,
  PrivacyNotice,
} from "./sheets";
import { ErrorNote, SectionTitle, Skeleton, StatePill, cardClass, errorMessage, ghostButton, primaryButton, telHref } from "./ui";
import { Contacts, FollowUps, Journal, LeaExchanges, RetainedCard, Steps } from "./work";

type Dialog = "declare" | "passage" | "abandon" | "optout" | "privacy" | null;

function Notice({ children }: { children: React.ReactNode }) {
  return <p className={`${cardClass} text-sm leading-relaxed text-muted`}>{children}</p>;
}

function History({ sheet }: { sheet: api.RestaurantSheet }) {
  if (!sheet.history.length) return null;
  return (
    <section className="flex flex-col gap-2.5">
      <SectionTitle>Déjà vu par les commerciaux</SectionTitle>
      <ul className="flex flex-col gap-2">
        {sheet.history.map((entry) => {
          const lines = retainedSummary(entry.retained);
          return (
            <li key={`${entry.declared_at}-${entry.status}`} className={`${cardClass} text-sm`}>
              <p className="font-medium">
                {entry.mine ? "Vous · " : ""}
                {entry.status === "passage"
                  ? "Passage sans suite"
                  : `${STATUS_LABELS[entry.status]}${entry.step ? ` à l’étape ${entry.step}` : ""}`}
                {entry.end_reason ? ` · ${END_LABELS[entry.end_reason]}` : ""}
              </p>
              <p className="text-xs text-faint">
                {frenchDate(entry.declared_at)}
                {entry.ended_at && entry.status !== "passage" ? ` → ${frenchDate(entry.ended_at)}` : ""}
              </p>
              {lines.length > 0 && <p className="mt-1.5 leading-relaxed text-muted">{lines.join(" · ")}</p>}
              {entry.retained.note && <p className="mt-1.5 italic text-muted">« {entry.retained.note} »</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/*
 * La fiche d'un restaurant. Une action principale selon l'état : libre →
 * « Déclarer » ; à soi → les étapes et le travail ; réservé par un autre,
 * client, opposé ou en discussion avec Ominin → pourquoi ce n'est pas la
 * peine d'y aller. L'historique des autres commerciaux est toujours là.
 */
export function RestaurantScreen({ id }: { id: string }) {
  const account = useAccount();
  const [sheet, setSheet] = useState<api.RestaurantSheet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [outcome, setOutcome] = useState<api.DeclareResult | null>(null);

  const load = useCallback(
    () => api.restaurant(id).then(setSheet, (cause: unknown) => setError(errorMessage(cause))),
    [id]
  );
  useEffect(() => void load(), [load]);
  const done = () => {
    setDialog(null);
    void load();
  };

  if (error) return <ErrorNote message={error} onRetry={() => void load()} />;
  if (!sheet) return <Skeleton />;

  const { restaurant, state, mine } = sheet;
  const destination =
    restaurant.latitude !== null && restaurant.longitude !== null
      ? `${restaurant.latitude},${restaurant.longitude}`
      : [restaurant.address, restaurant.city].filter(Boolean).join(", ");
  const free = state.kind === "free" && !state.in_talks;

  return (
    <div className="flex flex-col gap-7">
      <div>
        <Link href={spaceHref("/restaurants")} className="mb-3 inline-flex items-center gap-1 text-sm text-muted">
          <ChevronLeftIcon className="size-4" />
          Restaurants
        </Link>
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-2xl font-medium tracking-tight">{restaurant.name}</h1>
          <StatePill state={state} />
        </div>
        <p className="mt-1 text-sm text-muted">
          {[CATEGORY_LABELS[restaurant.category as keyof typeof CATEGORY_LABELS], restaurant.cuisine]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="text-sm text-muted">
          {[restaurant.address, restaurant.postal_code, restaurant.city].filter(Boolean).join(", ")}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {destination && (
            <a href={mapsDirectionsHref(destination)} target="_blank" rel="noopener" className={ghostButton}>
              <RouteIcon className="size-4" />
              Itinéraire
            </a>
          )}
          {restaurant.phone && (
            <a href={telHref(restaurant.phone)} className={ghostButton}>
              <PhoneIcon className="size-4" />
              Appeler
            </a>
          )}
          {restaurant.website && (
            <a href={httpHref(restaurant.website)} target="_blank" rel="noopener" className={ghostButton}>
              <GlobeIcon className="size-4" />
              Site
            </a>
          )}
        </div>
      </div>

      {mine ? (
        <p className={`${cardClass} border-ember-2/30 text-sm leading-relaxed`}>
          {mine.status === "pending"
            ? `Déclaré le ${frenchDate(mine.declared_at)}. Ominin confirme d’ici le ${frenchDate(mine.confirm_deadline)} ; sans réponse, il vous est réservé de droit ce jour-là.`
            : `Réservé pour vous jusqu’au ${frenchDate(mine.reserved_until!)} : s’il s’inscrit d’ici là, c’est votre Client Apporté.`}
        </p>
      ) : state.kind === "client" ? (
        <Notice>Déjà client d’Ominin : rien à faire ici.</Notice>
      ) : state.kind === "opted_out" ? (
        <Notice>Ce restaurant a demandé à ne plus être contacté. Ne le démarchez pas.</Notice>
      ) : state.kind === "reserved" ? (
        <Notice>
          Réservé par un autre commercial depuis le {frenchDate(state.since!)}
          {state.step ? `, étape ${state.step} sur 5` : ""}. Il redeviendra libre s’il l’abandonne ou si la réservation expire.
        </Notice>
      ) : state.in_talks ? (
        <Notice>En discussion avec Ominin en ce moment : inutile de vous déplacer.</Notice>
      ) : null}

      {free && !account.ended && (
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => setDialog("declare")} className={primaryButton}>
            Déclarer ce restaurant
          </button>
          <button type="button" onClick={() => setDialog("passage")} className={ghostButton}>
            Passage sans suite
          </button>
        </div>
      )}

      {mine && (
        <>
          <Steps sheet={sheet} onChange={() => void load()} />
          <FollowUps sheet={sheet} onChange={() => void load()} />
          <Journal sheet={sheet} onChange={() => void load()} />
          <Contacts sheet={sheet} onChange={() => void load()} />
          <RetainedCard key={mine.retained_updated_at} sheet={sheet} onChange={() => void load()} />
          <LeaExchanges sheet={sheet} />
        </>
      )}

      <History sheet={sheet} />

      <section className="flex flex-col gap-2">
        <button type="button" onClick={() => setDialog("privacy")} className={ghostButton}>
          Montrer la mention d’information (QR)
        </button>
        {(mine || free) && (
          <button type="button" onClick={() => setDialog("optout")} className={ghostButton}>
            Le restaurant ne veut plus être contacté
          </button>
        )}
        {mine && (
          <button type="button" onClick={() => setDialog("abandon")} className={ghostButton}>
            Abandonner ce restaurant
          </button>
        )}
      </section>

      {dialog === "declare" && (
        <DeclareSheet
          restaurant={restaurant}
          products={sheet.products}
          onClose={() => setDialog(null)}
          onDone={(result) => {
            setOutcome(result);
            done();
          }}
        />
      )}
      {outcome && <DeclareOutcome result={outcome} onClose={() => setOutcome(null)} />}
      {dialog === "passage" && (
        <PassageSheet restaurantId={restaurant.id} noteMax={sheet.note_max} onClose={() => setDialog(null)} onDone={done} />
      )}
      {dialog === "abandon" && mine && (
        <AbandonSheet declarationId={mine.id} onClose={() => setDialog(null)} onDone={done} />
      )}
      {dialog === "optout" && <OptOutSheet restaurantId={restaurant.id} onClose={() => setDialog(null)} onDone={done} />}
      {dialog === "privacy" && <PrivacyNotice onClose={() => setDialog(null)} />}
    </div>
  );
}
