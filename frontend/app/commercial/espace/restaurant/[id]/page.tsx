import Link from "next/link";
import { PageTitle, SectionTitle, cardClass, ghostButton, primaryButton, telHref } from "@/components/commercial/space/ui";
import type { RestaurantRecap } from "@/lib/commercial/api";
import { requireRunningContract } from "@/lib/commercial/session";
import { SIGNUP_KINDS } from "@/lib/commercial/signup-form";
import { REFUSAL_REASONS } from "@/lib/commercial/visit";
import { frenchDate } from "@/lib/legal/format";
import { commercialPrefix } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const spaceHref = (path: string) => `${commercialPrefix}/espace${path}`;

const linkLabel = (done: boolean, later: boolean) => (done ? "Branché" : later ? "Plus tard" : "À faire");

function Rows({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className={`${cardClass} flex flex-col gap-2 text-sm`}>
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3">
          <dt className="text-muted">{label}</dt>
          <dd className="min-w-0 text-right">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* Le récap d'un restaurant du tableau de bord : ce que le commercial a récupéré à chaque passage. */
export default async function RecapPage({ params }: PageProps<"/commercial/espace/restaurant/[id]">) {
  await requireRunningContract();
  const { id } = await params;
  const { data, error } = await (await createClient()).rpc("commercial_restaurant_recap", { p_restaurant: id });
  if (error) throw new Error(error.message);
  const recap = data as unknown as RestaurantRecap;
  const { signup, client } = recap;

  return (
    <div className="flex flex-col gap-7">
      <PageTitle sub={recap.address}>{recap.name}</PageTitle>

      {client && (
        <Rows
          rows={[
            ["Client depuis", frenchDate(client.commission_from)],
            ["Ta commission jusqu’au", frenchDate(client.commission_until)],
          ]}
        />
      )}

      {signup && (
        <section className="flex flex-col gap-2.5">
          <SectionTitle>Inscription du {frenchDate(signup.at)}</SectionTitle>
          <Rows
            rows={[
              ["Type", SIGNUP_KINDS.find((kind) => kind.id === signup.kind)?.label ?? "—"],
              ["Responsable", signup.manager_name ?? "—"],
              ...(signup.manager_phone ? [["Téléphone", <a key="tel" href={telHref(signup.manager_phone)} className="underline">{signup.manager_phone}</a>] as [string, React.ReactNode]] : []),
              ...(signup.manager_email ? [["E-mail", signup.manager_email] as [string, React.ReactNode]] : []),
              ["Compte", signup.account ? "Créé" : "Pas encore"],
              ["Stripe", linkLabel(signup.stripe, signup.stripe_later)],
              ["HubRise", linkLabel(signup.hubrise, signup.hubrise_later)],
              ["Photos du menu", String(signup.photos)],
              ["Inscription", signup.finished_at ? `Terminée le ${frenchDate(signup.finished_at)}` : "En cours"],
            ]}
          />
          {!signup.finished_at && (
            <Link href={`${spaceHref(`/inscription/${recap.id}`)}?qr=1`} className={primaryButton}>
              Suivre l’inscription
            </Link>
          )}
        </section>
      )}

      {recap.visits.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <SectionTitle>Visites</SectionTitle>
          <ul className="flex flex-col gap-2">
            {recap.visits.map((visit) => (
              <li key={visit.at} className={`${cardClass} flex flex-col gap-1 text-sm`}>
                <span className="font-medium">
                  {frenchDate(visit.at)} ·{" "}
                  {visit.outcome === "absent"
                    ? "Responsable absent"
                    : `Pas intéressé (${REFUSAL_REASONS.find((reason) => reason.id === visit.reason)?.label ?? "—"})`}
                </span>
                {visit.contact_name && <span>{visit.contact_name}</span>}
                {visit.contact_phone && (
                  <a href={telHref(visit.contact_phone)} className="underline">
                    {visit.contact_phone}
                  </a>
                )}
                {visit.contact_email && <span>{visit.contact_email}</span>}
                {visit.note && <span className="text-muted">{visit.note}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {!client && (
        <Link href={spaceHref(`/visite/${recap.id}`)} className={ghostButton}>
          J’y retourne
        </Link>
      )}
    </div>
  );
}
