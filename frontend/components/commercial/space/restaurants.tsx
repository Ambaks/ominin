"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PlusIcon, SearchIcon } from "@/components/admin/icons";
import { inputClass } from "@/components/ui/field";
import { formatRelative } from "@/lib/admin/format";
import * as api from "@/lib/commercial/api";
import { frenchDate } from "@/lib/legal/format";
import { spaceHref } from "./shell";
import {
  ErrorNote,
  PageTitle,
  SectionTitle,
  Skeleton,
  StatePill,
  cardClass,
  errorMessage,
  ghostButton,
  primaryButton,
} from "./ui";

function ResultRow({ result }: { result: api.SearchResult }) {
  return (
    <li>
      <Link
        href={spaceHref(`/restaurants/${result.id}`)}
        className={`${cardClass} flex items-center justify-between gap-3`}
      >
        <span className="min-w-0">
          <span className="block truncate font-medium">{result.name}</span>
          <span className="block truncate text-sm text-muted">
            {[result.address, result.city].filter(Boolean).join(", ") || "Adresse inconnue"}
          </span>
        </span>
        <StatePill state={result.state} />
      </Link>
    </li>
  );
}

/*
 * Restaurants : chercher dans la base commune (chaque recherche compte dans
 * le quota du jour, d'où une recherche à l'envoi et non à la frappe), puis
 * les siens, par étape. Ajouter à la main en dernier recours.
 */
export function RestaurantsScreen() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<api.SearchResult[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [mine, setMine] = useState<api.MyRestaurant[] | null>(null);
  const [mineError, setMineError] = useState<string | null>(null);

  const loadMine = () =>
    api.myRestaurants().then(setMine, (cause: unknown) => setMineError(errorMessage(cause)));
  useEffect(() => void loadMine(), []);

  const onSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      setResults(await api.search(query));
    } catch (cause) {
      setSearchError(errorMessage(cause));
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="flex flex-col gap-7">
      <PageTitle>Restaurants</PageTitle>

      <form onSubmit={onSearch} className="flex gap-2" role="search">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nom, rue ou téléphone"
          aria-label="Rechercher un restaurant"
          enterKeyHint="search"
          className={inputClass}
        />
        <button type="submit" disabled={searching} className={`${primaryButton} px-4`} aria-label="Rechercher">
          <SearchIcon className="size-5" />
        </button>
      </form>

      {searchError && <ErrorNote message={searchError} />}
      {results && !searchError && (
        <section className="flex flex-col gap-2.5">
          <SectionTitle>Résultats</SectionTitle>
          {results.length ? (
            <ul className="flex flex-col gap-2">
              {results.map((result) => (
                <ResultRow key={result.id} result={result} />
              ))}
            </ul>
          ) : (
            <div className={`${cardClass} flex flex-col items-center gap-3 py-6 text-center`}>
              <p className="text-sm text-muted">Aucun restaurant ne correspond. Il n’est peut-être pas encore dans la base.</p>
              <Link href={`${spaceHref("/restaurants/nouveau")}?nom=${encodeURIComponent(query)}`} className={ghostButton}>
                <PlusIcon className="size-4" />
                L’ajouter
              </Link>
            </div>
          )}
        </section>
      )}

      <section className="flex flex-col gap-2.5">
        <SectionTitle
          aside={
            <Link href={spaceHref("/restaurants/nouveau")} className="text-sm font-semibold text-ember-1">
              + Ajouter
            </Link>
          }
        >
          Mes restaurants
        </SectionTitle>
        {mineError ? (
          <ErrorNote message={mineError} onRetry={() => void loadMine()} />
        ) : !mine ? (
          <Skeleton />
        ) : mine.length === 0 ? (
          <p className={`${cardClass} text-sm text-muted`}>
            Aucun restaurant déclaré. Cherchez-en un, puis déclarez-le depuis sa fiche : il vous est réservé une fois confirmé.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {mine.map((item) => (
              <li key={item.id}>
                <Link
                  href={spaceHref(`/restaurants/${item.restaurant_id}`)}
                  className={`${cardClass} flex items-center justify-between gap-3`}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{item.name}</span>
                    <span className="block truncate text-sm text-muted">
                      {item.status === "pending"
                        ? `En attente · confirmée au plus tard le ${frenchDate(item.confirm_deadline)}`
                        : item.next_task_at
                          ? `Relance ${formatRelative(item.next_task_at)}`
                          : item.reserved_until
                            ? `Réservé jusqu’au ${frenchDate(item.reserved_until)}`
                            : ""}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-ember-2/10 px-2.5 py-1 text-xs font-bold text-ember-1">
                    {item.step ? `Étape ${item.step}/5` : "À démarrer"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
