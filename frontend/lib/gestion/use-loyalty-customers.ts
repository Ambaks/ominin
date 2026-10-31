"use client";

import { useCallback } from "react";
import { usePagedList } from "@/lib/use-paged-list";
import { loadLoyaltyCustomers, type LoyaltyCustomer } from "./fidelite";

const normalize = (search: string) => search.trim().toLowerCase().replace(/\s/g, "");
const rowId = (customer: LoyaltyCustomer) => customer.id;

/** Les clients du programme, page par page. */
export function useLoyaltyCustomers(etablissementId: string) {
  const fetchPage = useCallback(
    async (search: string, limit: number, offset: number) => {
      const page = await loadLoyaltyCustomers(etablissementId, search, limit, offset);
      return { rows: page.customers, total: page.total };
    },
    [etablissementId]
  );
  const list = usePagedList({ fetchPage, rowId, normalize });
  return { ...list, customers: list.rows };
}
