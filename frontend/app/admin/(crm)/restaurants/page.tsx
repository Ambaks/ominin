"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { FilterBar } from "@/components/admin/filter-bar";
import { PlusIcon } from "@/components/admin/icons";
import { CreateRestaurantModal } from "@/components/admin/restaurants/create-modal";
import { LeadStatusBadge } from "@/components/admin/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/admin/api";
import { useAdminBasePath } from "@/lib/admin/base-path";
import { CATEGORY_LABELS, STATUS_LABELS, PRIORITY_LABELS } from "@/lib/admin/constants";
import { toCsv, downloadCsv, type CsvColumn } from "@/lib/admin/csv";
import { formatDate, formatRelative } from "@/lib/admin/format";
import { useFilteredLeads } from "@/lib/admin/filters";
import { sortLeads, type LeadSortKey } from "@/lib/admin/selectors";
import { useAdmin } from "@/lib/admin/store";

/*
 * Export : les colonnes techniques gardent les en-têtes de l'import
 * (name, address, latitude…) pour qu'un export se réimporte tel quel ;
 * les colonnes commerciales, en français, sont ignorées par l'import.
 */
function exportColumns(
  nextRdvByRestaurant: Map<string, string>
): CsvColumn<api.ExportRow>[] {
  return [
    { header: "name", value: (row) => row.restaurant.name },
    { header: "address", value: (row) => row.restaurant.address },
    { header: "city", value: (row) => row.restaurant.city },
    { header: "postal_code", value: (row) => row.restaurant.postalCode },
    { header: "latitude", value: (row) => row.restaurant.latitude },
    { header: "longitude", value: (row) => row.restaurant.longitude },
    { header: "phone", value: (row) => row.restaurant.phone },
    { header: "email", value: (row) => row.restaurant.email },
    { header: "website", value: (row) => row.restaurant.website },
    { header: "menu_url", value: (row) => row.restaurant.menuUrl },
    { header: "category", value: (row) => row.restaurant.category },
    { header: "Statut", value: (row) => STATUS_LABELS[row.lead.status] },
    { header: "Priorité", value: (row) => PRIORITY_LABELS[row.lead.priority] },
    {
      header: "Valeur estimée",
      value: (row) => row.lead.estimatedValue,
    },
    {
      header: "Dernier contact",
      value: (row) =>
        row.lead.lastContactAt ? formatDate(row.lead.lastContactAt) : null,
    },
    {
      header: "Prochaine relance",
      value: (row) =>
        row.lead.nextFollowUpAt ? formatDate(row.lead.nextFollowUpAt) : null,
    },
    {
      header: "Prochain RDV",
      value: (row) => {
        const startAt = nextRdvByRestaurant.get(row.restaurant.id);
        return startAt ? formatDate(startAt) : null;
      },
    },
    { header: "Propriétaire", value: (row) => row.restaurant.ownerName },
    {
      header: "Contact principal",
      value: (row) =>
        row.mainContact
          ? `${row.mainContact.firstName} ${row.mainContact.lastName ?? ""}`.trim()
          : null,
    },
    {
      header: "Téléphone contact",
      value: (row) => row.mainContact?.phone ?? null,
    },
    { header: "Email contact", value: (row) => row.mainContact?.email ?? null },
    { header: "Activités", value: (row) => row.activityCount },
    { header: "Tâches ouvertes", value: (row) => row.openTaskCount },
    {
      header: "Notes importantes",
      value: (row) => row.restaurant.importantNotes,
    },
  ];
}

const COLUMNS: { key: LeadSortKey; label: string }[] = [
  { key: "name", label: "Nom" },
  { key: "city", label: "Ville" },
  { key: "category", label: "Catégorie" },
  { key: "status", label: "Statut" },
  { key: "lastContactAt", label: "Dernier contact" },
  { key: "nextFollowUpAt", label: "Relance" },
];

export default function RestaurantsPage() {
  const state = useAdmin();
  const leads = useFilteredLeads();
  const toast = useToast();
  const router = useRouter();
  const { basePath, localPath } = useAdminBasePath();
  const [sort, setSort] = useState<{ key: LeadSortKey; dir: 1 | -1 }>({
    key: "name",
    dir: 1,
  });
  const [creating, setCreating] = useState(false);
  const [exporting, setExporting] = useState(false);

  const sorted = useMemo(
    () => sortLeads(leads, sort.key, sort.dir),
    [leads, sort]
  );

  const toggleSort = (key: LeadSortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === 1 ? -1 : 1 }
        : { key, dir: 1 }
    );

  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows = await api.fetchExportRows(
        sorted.map((lead) => lead.restaurantId)
      );
      const nextRdv = new Map<string, string>();
      for (const rdv of state?.appointments ?? []) {
        if (!nextRdv.has(rdv.restaurantId)) {
          nextRdv.set(rdv.restaurantId, rdv.startAt);
        }
      }
      downloadCsv(
        `ominin-restaurants-${new Date().toISOString().slice(0, 10)}.csv`,
        toCsv(rows, exportColumns(nextRdv))
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-medium">Restaurants</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void exportCsv()}
            disabled={exporting || sorted.length === 0}
            className="rounded-full border border-hairline px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground disabled:opacity-50"
          >
            {exporting ? "Export…" : `Exporter (${sorted.length})`}
          </button>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="ember-gradient flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-background"
          >
            <PlusIcon className="size-4" />
            Nouveau
          </button>
        </div>
      </div>

      <FilterBar />

      {sorted.length === 0 ? (
        <EmptyState
          title="Aucun restaurant"
          body="Ajustez les filtres, créez une fiche ou importez un CSV."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-hairline bg-surface">
          <table className="w-full min-w-160 text-sm">
            <thead>
              <tr className="text-left">
                {COLUMNS.map((column) => (
                  <th key={column.key} className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      aria-sort={
                        sort.key === column.key
                          ? sort.dir === 1
                            ? "ascending"
                            : "descending"
                          : undefined
                      }
                      className="text-xs font-semibold uppercase tracking-wider text-faint transition-colors hover:text-foreground"
                    >
                      {column.label}
                      {sort.key === column.key && (
                        <span className="ml-1">
                          {sort.dir === 1 ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((lead) => {
                const overdue =
                  lead.nextFollowUpAt !== null &&
                  lead.nextFollowUpAt < new Date().toISOString();
                return (
                  <tr
                    key={lead.restaurantId}
                    onClick={() =>
                      router.push(
                        `${basePath}${localPath}?lead=${lead.restaurantId}`
                      )
                    }
                    className="cursor-pointer border-t border-hairline transition-colors hover:bg-surface-raised"
                  >
                    <td className="px-4 py-3 font-medium">{lead.name}</td>
                    <td className="px-4 py-3 text-muted">{lead.city ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">
                      {CATEGORY_LABELS[lead.category]}
                    </td>
                    <td className="px-4 py-3">
                      <LeadStatusBadge status={lead.status} />
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {lead.lastContactAt
                        ? formatRelative(lead.lastContactAt)
                        : "Jamais"}
                    </td>
                    <td
                      className={`px-4 py-3 ${
                        overdue ? "font-semibold text-ember-3" : "text-muted"
                      }`}
                    >
                      {lead.nextFollowUpAt
                        ? formatRelative(lead.nextFollowUpAt)
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <CreateRestaurantModal
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            router.push(`${basePath}${localPath}?lead=${id}`);
          }}
        />
      )}
    </div>
  );
}
