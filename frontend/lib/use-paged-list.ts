"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LIST_PAGE_SIZES, LIST_SEARCH_DEBOUNCE_MS } from "@/lib/gestion/constants";
import type { ListPage } from "@/lib/supabase/result";

const trimmed = (search: string) => search.trim();

/**
 * Une longue liste, page par page : la base trie, cherche et compte. Une
 * `fetchPage` nouvelle (un filtre changé) repart de la première page, et seule
 * la dernière requête partie écrit : une réponse lente à une frappe ancienne
 * n'écrase pas la suivante.
 */
export function usePagedList<Row>({
  fetchPage,
  rowId,
  normalize = trimmed,
  enabled = true,
}: {
  /** Stable (useCallback) : son identité décide du rechargement. */
  fetchPage: (search: string, limit: number, offset: number) => Promise<ListPage<Row>>;
  rowId: (row: Row) => string;
  normalize?: (search: string) => string;
  /** Faux : rien n'est demandé (l'onglet qui porte la liste est fermé). */
  enabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState<number>(LIST_PAGE_SIZES[0]);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const latest = useRef(0);
  const rowIdRef = useRef(rowId);

  const load = useCallback(
    async (limit: number, offset: number) => {
      const request = ++latest.current;
      setLoading(true);
      try {
        const page = await fetchPage(query, limit, offset);
        if (request !== latest.current) return;
        // Une ligne arrivée entre deux pages décale la suivante : pas de doublon.
        setRows((current) =>
          offset === 0
            ? page.rows
            : [...new Map([...current, ...page.rows].map((row) => [rowIdRef.current(row), row])).values()]
        );
        setTotal(page.total);
        setError(null);
      } catch (failure) {
        if (request === latest.current) setError(failure);
      } finally {
        if (request === latest.current) setLoading(false);
      }
    },
    [fetchPage, query]
  );

  useEffect(() => {
    if (!enabled) return;
    const first = () => load(pageSize, 0);
    void first();
  }, [enabled, load, pageSize]);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(normalize(search)), LIST_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, normalize]);

  return {
    search,
    setSearch,
    query,
    pageSize,
    setPageSize,
    rows,
    total,
    loading,
    error,
    showMore: () => load(pageSize, rows.length),
    /** Après un geste : les mêmes lignes relues, la liste ne se replie pas. */
    reload: () => load(Math.max(rows.length, pageSize), 0),
  };
}
