"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import * as api from "@/lib/commercial/api";
import { euros } from "@/lib/commercial/labels";
import { frenchDate } from "@/lib/legal/format";
import { InstallTip } from "./install-tip";
import { spaceHref } from "./shell";
import { ErrorNote, PageTitle, SectionTitle, Skeleton, cardClass, errorMessage } from "./ui";

type Filter = "all" | api.DashboardRestaurant["status"];

const COUNTERS: { filter: Filter; label: string }[] = [
  { filter: "all", label: "Visités" },
  { filter: "waiting", label: "En attente" },
  { filter: "signed", label: "Signés" },
  { filter: "not_interested", label: "Pas intéressés" },
];

const MISSING: Record<NonNullable<api.DashboardRestaurant["missing"]>[number], string> = {
  account: "le compte",
  stripe: "Stripe",
  hubrise: "HubRise",
};

function detail(place: api.DashboardRestaurant): string {
  switch (place.status) {
    case "signed":
      return place.commission_until ? `Client · commission jusqu’au ${frenchDate(place.commission_until)}` : "Client";
    case "waiting":
      return `Inscription : reste ${place.missing?.map((key) => MISSING[key]).join(" et ") || "à finir"}`;
    case "not_interested":
      return "Pas intéressé";
    case "absent":
      return "Responsable absent · à rappeler";
  }
}

/* Chaque ligne ouvre le récap du restaurant : ce que le commercial a récupéré. */
function Row({ place }: { place: api.DashboardRestaurant }) {
  return (
    <li>
      <Link href={spaceHref(`/restaurant/${place.id}`)} className={`${cardClass} flex items-center justify-between gap-3`}>
        <span className="min-w-0">
          <span className="block truncate font-medium">{place.name}</span>
          <span className="block text-sm text-muted">{detail(place)}</span>
        </span>
        {place.status === "signed" && <span className="shrink-0 font-display">{euros(place.earned_cents ?? 0)}</span>}
      </Link>
    </li>
  );
}

/*
 * Le tableau de bord : ce que le commercial a visité, ce qui attend, ce qui
 * a signé, et ce que ses clients lui ont rapporté — la commission du relevé,
 * calculée à la lecture.
 */
export function DashboardScreen() {
  const [data, setData] = useState(api.dashboard.last);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(() => api.dashboard().then(setData, (cause: unknown) => setError(errorMessage(cause))), []);
  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <ErrorNote message={error} onRetry={() => void load()} />;
  if (!data) return <Skeleton />;

  const { restaurants } = data;
  const signed = restaurants.filter((place) => place.status === "signed");
  const earned = signed.reduce((sum, place) => sum + (place.earned_cents ?? 0), 0);
  const month = signed.reduce((sum, place) => sum + (place.month_cents ?? 0), 0);
  const count = (key: Filter) => (key === "all" ? restaurants.length : restaurants.filter((place) => place.status === key).length);
  const shown = filter === "all" ? restaurants : restaurants.filter((place) => place.status === filter);

  return (
    <div className="flex flex-col gap-7">
      <InstallTip />
      <PageTitle sub={`${data.percent} % de ce qu’Ominin gagne sur tes clients, pendant ${data.term_months} mois.`}>
        Tableau de bord
      </PageTitle>

      <section className={`${cardClass} flex flex-col gap-1`}>
        <span className="text-sm text-muted">Ce que tes clients t’ont rapporté</span>
        <span className="font-display text-3xl">{euros(earned)}</span>
        <span className="text-sm text-muted">dont {euros(month)} ce mois-ci</span>
      </section>

      <section className="grid grid-cols-2 gap-2.5">
        {COUNTERS.map(({ filter: key, label }) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
            className={`${cardClass} flex flex-col items-start text-left ${filter === key ? "border-ember-1" : ""}`}
          >
            <span className="font-display text-2xl">{count(key)}</span>
            <span className="text-sm text-muted">{label}</span>
          </button>
        ))}
      </section>

      <section className="flex flex-col gap-2.5">
        <SectionTitle>{COUNTERS.find((counter) => counter.filter === filter)!.label}</SectionTitle>
        {shown.length ? (
          <ul className="flex flex-col gap-2">
            {shown.map((place) => (
              <Row key={place.id} place={place} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            Rien pour l’instant. <Link href={spaceHref("/carte")} className="underline">Ouvre la carte</Link> pour attraper ton prochain restaurant.
          </p>
        )}
      </section>
    </div>
  );
}
