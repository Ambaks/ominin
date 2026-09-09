"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ImportIcon } from "@/components/admin/icons";
import { PillTabs } from "@/components/ui/pill-tabs";
import { Toggle } from "@/components/ui/toggle";
import * as api from "@/lib/admin/api";
import { useAdminBasePath } from "@/lib/admin/base-path";
import {
  CATEGORY_ALIASES,
  IMPORT_HEADERS,
} from "@/lib/admin/constants";
import { isEmptyRow, parseCsv } from "@/lib/admin/csv";
import { normalizeText } from "@/lib/admin/format";
import { useAdmin } from "@/lib/admin/store";
import type { RestaurantCategory } from "@/lib/admin/types";

type RowStatus = "valid" | "warning" | "duplicate" | "invalid";

interface ParsedRow {
  /** Numéro de ligne dans le fichier (en-tête = 1). */
  line: number;
  status: RowStatus;
  reasons: string[];
  /** Null pour les lignes invalides. */
  values: api.ImportRow | null;
}

interface Analysis {
  fileName: string;
  rows: ParsedRow[];
  ignoredHeaders: string[];
}

type Phase =
  | { name: "select"; error?: string }
  | { name: "preview"; analysis: Analysis; includeDuplicates: boolean }
  | { name: "importing"; total: number; done: number }
  | {
      name: "done";
      inserted: number;
      skippedDuplicates: number;
      invalid: number;
      failedMessage?: string;
      remaining: api.ImportRow[];
    };

const STATUS_META: Record<RowStatus, { label: string; classes: string }> = {
  valid: { label: "Valide", classes: "border-status-signed/40 text-status-signed" },
  warning: {
    label: "Avertissement",
    classes: "border-status-appointment/40 text-status-appointment",
  },
  duplicate: {
    label: "Doublon",
    classes: "border-status-contacted/40 text-status-contacted",
  },
  invalid: { label: "Invalide", classes: "border-status-lost/40 text-status-lost" },
};

const EMAIL_SHAPE = /^\S+@\S+\.\S+$/;

function parseCoordinate(
  raw: string,
  min: number,
  max: number
): { value: number | null; dropped: boolean } {
  if (!raw.trim()) return { value: null, dropped: false };
  const parsed = Number(raw.trim().replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return { value: null, dropped: true };
  }
  return { value: parsed, dropped: false };
}

export default function ImportPage() {
  const state = useAdmin();
  const { basePath } = useAdminBasePath();
  const [phase, setPhase] = useState<Phase>({ name: "select" });
  const [previewTab, setPreviewTab] = useState<"all" | "problems">("all");

  /** Clés de dédoublonnage contre l'existant : nom+ville, téléphone, email. */
  const existingKeys = useMemo(() => {
    const nameCity = new Set<string>();
    const phones = new Set<string>();
    const emails = new Set<string>();
    for (const lead of state?.leads ?? []) {
      nameCity.add(
        `${normalizeText(lead.name)}|${normalizeText(lead.city ?? "")}`
      );
      const phone = (lead.phone ?? "").replace(/\D/g, "");
      if (phone) phones.add(phone);
      if (lead.email) emails.add(normalizeText(lead.email));
    }
    return { nameCity, phones, emails };
  }, [state?.leads]);

  const analyse = async (file: File) => {
    // Numéros de ligne du fichier réel, sauts vides compris : « Ligne N »
    // doit correspondre à ce que l'utilisateur voit dans son tableur.
    const numbered = parseCsv(await file.text())
      .map((cells, index) => ({ cells, line: index + 1 }))
      .filter((row) => !isEmptyRow(row.cells));
    if (numbered.length < 2) {
      setPhase({
        name: "select",
        error: "Fichier vide ou sans lignes de données.",
      });
      return;
    }
    const headerCells = numbered[0].cells;
    const headers = headerCells.map((cell) => normalizeText(cell.trim()));
    const column = (name: (typeof IMPORT_HEADERS)[number]) =>
      headers.indexOf(name);
    if (column("name") === -1) {
      setPhase({
        name: "select",
        error: "Colonne « name » introuvable dans l'en-tête.",
      });
      return;
    }
    const ignoredHeaders = headerCells.filter(
      (cell) =>
        !(IMPORT_HEADERS as readonly string[]).includes(
          normalizeText(cell.trim())
        )
    );

    const seenInFile = new Set<string>();
    const rows: ParsedRow[] = numbered.slice(1).map(({ cells, line }) => {
      const cell = (name: (typeof IMPORT_HEADERS)[number]) => {
        const at = column(name);
        return at === -1 ? "" : (cells[at] ?? "").trim();
      };
      const reasons: string[] = [];
      const name = cell("name");
      if (!name) {
        return {
          line,
          status: "invalid",
          reasons: ["nom manquant"],
          values: null,
        };
      }

      const lat = parseCoordinate(cell("latitude"), -90, 90);
      const lng = parseCoordinate(cell("longitude"), -180, 180);
      if (lat.dropped || lng.dropped) {
        reasons.push("coordonnées invalides, ignorées");
      }
      // Un point sans son pendant n'est pas plaçable sur la carte.
      const hasBoth = lat.value !== null && lng.value !== null;

      let email = cell("email");
      if (email && !EMAIL_SHAPE.test(email)) {
        reasons.push("email malformé, ignoré");
        email = "";
      }

      const rawCategory = cell("category");
      let category: RestaurantCategory = "restaurant";
      if (rawCategory) {
        const match = CATEGORY_ALIASES[normalizeText(rawCategory)];
        if (match) category = match;
        else reasons.push(`catégorie « ${rawCategory} » inconnue → Restaurant`);
      }

      const city = cell("city");
      const phone = cell("phone").replace(/\D/g, "");
      const key = `${normalizeText(name)}|${normalizeText(city)}`;
      let duplicate: string | null = null;
      if (seenInFile.has(key)) duplicate = "doublon dans le fichier";
      else if (existingKeys.nameCity.has(key)) duplicate = "nom+ville déjà en base";
      else if (phone && existingKeys.phones.has(phone))
        duplicate = "téléphone déjà en base";
      else if (email && existingKeys.emails.has(normalizeText(email)))
        duplicate = "email déjà en base";
      seenInFile.add(key);

      const values: api.ImportRow = {
        name,
        address: cell("address"),
        city,
        postalCode: cell("postal_code"),
        latitude: hasBoth ? lat.value : null,
        longitude: hasBoth ? lng.value : null,
        phone: cell("phone"),
        email,
        website: cell("website"),
        menuUrl: cell("menu_url"),
        category,
      };
      if (duplicate) {
        return { line, status: "duplicate", reasons: [duplicate, ...reasons], values };
      }
      return {
        line,
        status: reasons.length > 0 ? "warning" : "valid",
        reasons,
        values,
      };
    });

    setPreviewTab("all");
    setPhase({
      name: "preview",
      analysis: { fileName: file.name, rows, ignoredHeaders },
      includeDuplicates: false,
    });
  };

  const runImport = async (
    toImport: api.ImportRow[],
    alreadyInserted: number,
    skippedDuplicates: number,
    invalid: number
  ) => {
    setPhase({ name: "importing", total: toImport.length, done: 0 });
    try {
      const inserted = await api.importRestaurants(toImport, (done, total) =>
        setPhase({ name: "importing", total, done })
      );
      setPhase({
        name: "done",
        inserted: alreadyInserted + inserted,
        skippedDuplicates,
        invalid,
        remaining: [],
      });
    } catch (error) {
      const failed = error instanceof api.ImportError ? error : null;
      setPhase({
        name: "done",
        inserted: alreadyInserted + (failed?.inserted ?? 0),
        skippedDuplicates,
        invalid,
        failedMessage:
          error instanceof Error ? error.message : "Une erreur est survenue.",
        remaining: failed ? toImport.slice(failed.inserted) : toImport,
      });
    }
  };

  const startImport = (analysis: Analysis, includeDuplicates: boolean) => {
    const importable = analysis.rows
      .filter(
        (row) =>
          row.values !== null &&
          (row.status !== "duplicate" || includeDuplicates)
      )
      .map((row) => row.values as api.ImportRow);
    const skippedDuplicates = includeDuplicates
      ? 0
      : analysis.rows.filter((row) => row.status === "duplicate").length;
    const invalid = analysis.rows.filter(
      (row) => row.status === "invalid"
    ).length;
    void runImport(importable, 0, skippedDuplicates, invalid);
  };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-medium">Import CSV</h1>
      <p className="max-w-2xl text-sm text-muted lg:hidden">
        L’import est prévu pour un grand écran — il reste utilisable ici.
      </p>

      {phase.name === "select" && (
        <div className="flex flex-col gap-4">
          <label className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border border-dashed border-hairline px-6 py-14 text-center transition-colors hover:border-ember-2/40">
            <ImportIcon className="size-8 text-faint" />
            <span className="font-display text-lg font-medium">
              Choisir un fichier CSV
            </span>
            <span className="max-w-md text-sm text-muted">
              En-têtes attendus : {IMPORT_HEADERS.join(", ")} — colonnes dans
              n’importe quel ordre, délimiteur virgule ou point-virgule.
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void analyse(file);
              }}
            />
          </label>
          {phase.error && (
            <p className="text-sm text-ember-3">{phase.error}</p>
          )}
        </div>
      )}

      {phase.name === "preview" && (
        <PreviewStep
          analysis={phase.analysis}
          includeDuplicates={phase.includeDuplicates}
          previewTab={previewTab}
          onTab={setPreviewTab}
          onToggleDuplicates={(value) =>
            setPhase({ ...phase, includeDuplicates: value })
          }
          onCancel={() => setPhase({ name: "select" })}
          onConfirm={() => startImport(phase.analysis, phase.includeDuplicates)}
        />
      )}

      {phase.name === "importing" && (
        <div className="flex max-w-xl flex-col gap-3 rounded-2xl border border-hairline bg-surface p-6">
          <p className="text-sm font-medium">
            Import en cours… {phase.done} / {phase.total}
          </p>
          <div className="h-2 rounded-full bg-surface-raised">
            <div
              className="h-2 rounded-full bg-chart-mark transition-all"
              style={{
                width: `${phase.total ? Math.round((phase.done / phase.total) * 100) : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {phase.name === "done" && (
        <div className="flex max-w-xl flex-col gap-4 rounded-2xl border border-hairline bg-surface p-6">
          <p className="font-display text-lg font-medium">
            {phase.failedMessage ? "Import interrompu" : "Import terminé"}
          </p>
          <ul className="flex flex-col gap-1 text-sm text-muted">
            <li>{phase.inserted} restaurant(s) importé(s)</li>
            {phase.skippedDuplicates > 0 && (
              <li>{phase.skippedDuplicates} doublon(s) écarté(s)</li>
            )}
            {phase.invalid > 0 && (
              <li>{phase.invalid} ligne(s) invalide(s) ignorée(s)</li>
            )}
            {phase.failedMessage && (
              <li className="text-ember-3">
                {phase.remaining.length} ligne(s) restante(s) —{" "}
                {phase.failedMessage}
              </li>
            )}
          </ul>
          <div className="flex flex-wrap gap-2">
            {phase.failedMessage && phase.remaining.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  void runImport(
                    phase.remaining,
                    phase.inserted,
                    phase.skippedDuplicates,
                    phase.invalid
                  )
                }
                className="ember-gradient rounded-full px-4 py-2 text-sm font-semibold text-background"
              >
                Réessayer les lignes restantes
              </button>
            )}
            <Link
              href={`${basePath}/restaurants`}
              className="rounded-full border border-hairline px-4 py-2 text-sm font-semibold text-muted transition-colors hover:text-foreground"
            >
              Voir la liste
            </Link>
            <Link
              href={`${basePath}/carte`}
              className="rounded-full border border-hairline px-4 py-2 text-sm font-semibold text-muted transition-colors hover:text-foreground"
            >
              Voir la carte
            </Link>
            <button
              type="button"
              onClick={() => setPhase({ name: "select" })}
              className="rounded-full border border-hairline px-4 py-2 text-sm font-semibold text-muted transition-colors hover:text-foreground"
            >
              Nouvel import
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewStep({
  analysis,
  includeDuplicates,
  previewTab,
  onTab,
  onToggleDuplicates,
  onCancel,
  onConfirm,
}: {
  analysis: Analysis;
  includeDuplicates: boolean;
  previewTab: "all" | "problems";
  onTab: (tab: "all" | "problems") => void;
  onToggleDuplicates: (value: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const count = (status: RowStatus) =>
    analysis.rows.filter((row) => row.status === status).length;
  const importCount =
    count("valid") + count("warning") + (includeDuplicates ? count("duplicate") : 0);
  const visible =
    previewTab === "all"
      ? analysis.rows
      : analysis.rows.filter((row) => row.status !== "valid");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">{analysis.fileName}</span>
        <span className="text-faint">·</span>
        {(Object.keys(STATUS_META) as RowStatus[]).map((status) => (
          <span
            key={status}
            className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_META[status].classes}`}
          >
            {count(status)} {STATUS_META[status].label.toLowerCase()}
            {count(status) > 1 ? "s" : ""}
          </span>
        ))}
      </div>
      {analysis.ignoredHeaders.length > 0 && (
        <p className="text-xs text-faint">
          Colonnes ignorées : {analysis.ignoredHeaders.join(", ")}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <PillTabs
          tabs={[
            { id: "all", label: "Toutes les lignes" },
            {
              id: "problems",
              label: "Problèmes",
              count: visible === analysis.rows
                ? analysis.rows.filter((row) => row.status !== "valid").length
                : visible.length,
            },
          ]}
          activeId={previewTab}
          onSelect={(id) => onTab(id as "all" | "problems")}
        />
        <div className="flex items-center gap-2.5">
          <span className="text-sm text-muted">Importer aussi les doublons</span>
          <Toggle
            checked={includeDuplicates}
            onChange={onToggleDuplicates}
            label="Importer aussi les doublons"
          />
        </div>
      </div>

      <div className="max-h-96 overflow-auto rounded-2xl border border-hairline bg-surface">
        <table className="w-full min-w-140 text-sm">
          <thead className="sticky top-0 bg-surface">
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-faint">
              <th className="px-4 py-2.5">Ligne</th>
              <th className="px-4 py-2.5">Nom</th>
              <th className="px-4 py-2.5">Ville</th>
              <th className="px-4 py-2.5">Statut</th>
              <th className="px-4 py-2.5">Détail</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.line} className="border-t border-hairline">
                <td className="px-4 py-2 tabular-nums text-faint">{row.line}</td>
                <td className="px-4 py-2">{row.values?.name ?? "—"}</td>
                <td className="px-4 py-2 text-muted">
                  {row.values?.city ?? "—"}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUS_META[row.status].classes}`}
                  >
                    {STATUS_META[row.status].label}
                  </span>
                </td>
                <td className="px-4 py-2 text-xs text-muted">
                  {row.reasons.join(" · ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-hairline px-4 py-2 text-sm font-semibold text-muted transition-colors hover:text-foreground"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={importCount === 0}
          className="ember-gradient rounded-full px-5 py-2 text-sm font-semibold text-background disabled:opacity-50"
        >
          Importer {importCount} restaurant{importCount > 1 ? "s" : ""}
        </button>
      </div>
    </div>
  );
}
