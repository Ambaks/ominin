"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { EmptyState } from "@/components/ui/empty-state";
import { useGestion } from "@/lib/gestion/store";
import type { Table } from "@/lib/gestion/types";

/* 512 px : net à l'impression (~4 cm de côté) sans alourdir la page. */
const QR_PNG_WIDTH = 512;

/** Data URLs PNG des QR codes, indexées par id de table. */
function useQrCodes(tables: Table[] | undefined, slug: string | undefined) {
  const [codes, setCodes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!tables || !slug) return;
    const origin = window.location.origin;
    let cancelled = false;
    Promise.all(
      tables.map(async (table) => {
        const url = await QRCode.toDataURL(
          `${origin}/m/${slug}?table=${table.number}`,
          { width: QR_PNG_WIDTH }
        );
        return [table.id, url] as const;
      })
    ).then((entries) => {
      if (!cancelled) setCodes(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [tables, slug]);

  return codes;
}

function QrImage({
  dataUrl,
  tableNumber,
  className,
}: {
  dataUrl?: string;
  tableNumber: number;
  className: string;
}) {
  return dataUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt={`QR code de la table ${tableNumber}`}
      className={className}
    />
  ) : (
    <div aria-busy className={`shimmer ${className}`} />
  );
}

export default function QrPage() {
  const state = useGestion();
  const codes = useQrCodes(state?.tables, state?.etablissement.slug);

  if (!state) return null;

  const tables = [...state.tables].sort((a, b) => a.number - b.number);

  return (
    <>
      <div className="flex flex-col gap-8 print:hidden">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-medium tracking-tight lg:text-3xl">
              QR codes
            </h1>
            <p className="mt-1 text-sm text-muted">
              Un code par table, qui ouvre votre menu en ligne. Imprimez la
              planche ou téléchargez chaque code.
            </p>
          </div>
          {tables.length > 0 && (
            <button
              type="button"
              onClick={() => window.print()}
              className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background"
            >
              Imprimer la planche
            </button>
          )}
        </div>

        {tables.length === 0 ? (
          <EmptyState
            title="Aucune table"
            body="Les QR codes sont générés à partir de vos tables."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tables.map((table) => (
              <div
                key={table.id}
                className="flex flex-col items-center gap-3 rounded-2xl border border-hairline bg-surface p-5"
              >
                <div className="rounded-xl bg-white p-2">
                  <QrImage
                    dataUrl={codes[table.id]}
                    tableNumber={table.number}
                    className="size-36 rounded-lg"
                  />
                </div>
                <p className="font-display text-lg font-medium">
                  Table {table.number}
                </p>
                {codes[table.id] && (
                  <a
                    href={codes[table.id]}
                    download={`table-${table.number}-qr.png`}
                    className="text-xs font-semibold text-ember-1 transition-opacity hover:opacity-80"
                  >
                    Télécharger PNG
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <section className="hidden print:block">
        <div className="grid grid-cols-2 gap-6">
          {tables.map((table) => (
            <div
              key={table.id}
              className="break-inside-avoid rounded-2xl border border-neutral-300 bg-white p-6 text-center text-neutral-900"
            >
              <p className="font-display text-lg font-semibold">
                {state.etablissement.name}
              </p>
              <QrImage
                dataUrl={codes[table.id]}
                tableNumber={table.number}
                className="mx-auto mt-4 size-44"
              />
              <p className="mt-4 text-2xl font-semibold">
                Table {table.number}
              </p>
              <p className="mt-1 text-sm text-neutral-500">
                Scannez pour consulter le menu
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
