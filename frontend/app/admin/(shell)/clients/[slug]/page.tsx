"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { ChevronLeftIcon } from "@/components/admin/icons";
import { ClientActivity } from "@/components/admin/clients/activity";
import { ClientAnalytique } from "@/components/admin/clients/analytique";
import { ClientReglages } from "@/components/admin/clients/reglages";
import { ClientRevenus } from "@/components/admin/clients/revenus";
import { EmptyState } from "@/components/ui/empty-state";
import { PillTabs } from "@/components/ui/pill-tabs";
import { useToast } from "@/components/ui/toast";
import { useAdminBasePath } from "@/lib/admin/base-path";
import {
  CLIENT_PERIOD_DAYS,
  CLIENT_VIEWS,
  type ClientView,
} from "@/lib/admin/constants";
import {
  fetchOverview,
  periodOf,
  type ClientOverview,
} from "@/lib/admin/metrics";

/*
 * La fiche d'un client. Le sous-onglet vit dans l'URL (?vue=) pour rester
 * liable — « regarde l'analytique du BOHO » doit être un lien, pas trois clics.
 */

const PERIOD_TABS = CLIENT_PERIOD_DAYS.map((days) => ({
  id: String(days),
  label: `${days} j`,
}));

function isView(value: string | null): value is ClientView {
  return CLIENT_VIEWS.some((view) => view.id === value);
}

function ClientDetail() {
  const toast = useToast();
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const search = useSearchParams();
  const { basePath } = useAdminBasePath();

  const [days, setDays] = useState<number>(CLIENT_PERIOD_DAYS[1]);
  const [client, setClient] = useState<ClientOverview | null | undefined>(
    undefined
  );

  const view: ClientView = isView(search.get("vue"))
    ? (search.get("vue") as ClientView)
    : "revenus";

  const selectView = useCallback(
    (next: string) => {
      // replace : les sous-onglets n'encombrent pas le bouton retour.
      router.replace(`${basePath}/clients/${params.slug}?vue=${next}`, {
        scroll: false,
      });
    },
    [router, basePath, params.slug]
  );

  useEffect(() => {
    // La vue d'ensemble sert de source : une seule fonction, et la fiche
    // dispose du taux de commission et de l'état d'encaissement.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOverview(periodOf(days))
      .then((rows) =>
        setClient(rows.find((row) => row.slug === params.slug) ?? null)
      )
      .catch((error) =>
        toast.error(
          error instanceof Error ? error.message : "Une erreur est survenue."
        )
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug, days]);

  if (client === undefined) {
    return (
      <div aria-busy className="flex flex-col gap-4">
        <div className="shimmer h-9 w-52 rounded-xl" />
        <div className="shimmer h-64 rounded-2xl" />
      </div>
    );
  }

  if (client === null) {
    return (
      <EmptyState
        title="Client introuvable"
        body="Cet établissement n'existe pas, ou n'est pas un client d'Ominin."
        action={
          <Link
            href={`${basePath}/clients`}
            className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background"
          >
            Revenir à la liste
          </Link>
        }
      />
    );
  }

  const period = periodOf(days);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Link
            href={`${basePath}/clients`}
            className="inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-foreground"
          >
            <ChevronLeftIcon className="size-3.5" />
            Clients
          </Link>
          <h1 className="mt-1 truncate font-display text-2xl font-medium">
            {client.name}
          </h1>
        </div>
        {view !== "reglages" && (
          <PillTabs
            tabs={PERIOD_TABS}
            activeId={String(days)}
            onSelect={(id) => setDays(Number(id))}
          />
        )}
      </div>

      <PillTabs
        tabs={CLIENT_VIEWS.map((item) => ({ id: item.id, label: item.label }))}
        activeId={view}
        onSelect={selectView}
      />

      {view === "revenus" && <ClientRevenus client={client} period={period} />}
      {view === "analytique" && (
        <ClientAnalytique client={client} period={period} />
      )}
      {view === "activite" && (
        <ClientActivity etablissementId={client.etablissement_id} />
      )}
      {view === "reglages" && <ClientReglages client={client} />}
    </div>
  );
}

export default function ClientDetailPage() {
  return (
    <Suspense fallback={<div aria-busy className="shimmer h-96 rounded-2xl" />}>
      <ClientDetail />
    </Suspense>
  );
}
