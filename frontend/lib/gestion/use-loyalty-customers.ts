"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LIST_PAGE_SIZES, LIST_SEARCH_DEBOUNCE_MS } from "./constants";
import { loadLoyaltyCustomers, type LoyaltyCustomer } from "./fidelite";

const normalize = (search: string) => search.trim().toLowerCase().replace(/\s/g, "");

/**
 * Les clients du programme, page par page : la base trie, cherche et compte.
 * Seule la dernière requête partie écrit : une réponse lente à une frappe
 * ancienne n'écrase pas la suivante.
 */
export function useLoyaltyCustomers(etablissementId: string) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState<number>(LIST_PAGE_SIZES[0]);
  const [customers, setCustomers] = useState<LoyaltyCustomer[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const latest = useRef(0);

  const load = useCallback(
    async (limit: number, offset: number) => {
      const request = ++latest.current;
      setLoading(true);
      try {
        const page = await loadLoyaltyCustomers(etablissementId, query, limit, offset);
        if (request !== latest.current) return;
        // Un client arrivé entre deux pages décale la suivante : pas de doublon.
        setCustomers((current) =>
          offset === 0
            ? page.customers
            : [...new Map([...current, ...page.customers].map((row) => [row.id, row])).values()]
        );
        setTotal(page.total);
        setError(null);
      } catch (failure) {
        if (request === latest.current) setError(failure);
      } finally {
        if (request === latest.current) setLoading(false);
      }
    },
    [etablissementId, query]
  );

  useEffect(() => {
    const first = () => load(pageSize, 0);
    void first();
  }, [load, pageSize]);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(normalize(search)), LIST_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  return {
    search,
    setSearch,
    query,
    pageSize,
    setPageSize,
    customers,
    total,
    loading,
    error,
    showMore: () => load(pageSize, customers.length),
    /** Après un geste : les mêmes lignes relues, la liste ne se replie pas. */
    reload: () => load(Math.max(customers.length, pageSize), 0),
  };
}
