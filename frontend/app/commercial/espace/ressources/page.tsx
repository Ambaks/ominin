import { Presentations } from "@/components/commercial/space/presentations";
import { PageTitle, SectionTitle, cardClass, ghostButton } from "@/components/commercial/space/ui";
import { DECKS } from "@/lib/commercial/decks";
import { requireRunningContract } from "@/lib/commercial/session";
import { commercialPrefix } from "@/lib/site";

export const dynamic = "force-dynamic";

/** Les tutos du fondateur, dans public/commercial/tutos ; gardés hors ligne par public/commercial-sw.js. */
const TUTOS = [
  { name: "Tuto Stripe", file: "tuto-stripe.pdf", draft: false },
  { name: "Tuto HubRise", file: "tuto-hubrise.pdf", draft: true },
  { name: "Fiches caisses HubRise", file: "fiches-caisses-hubrise.pdf", draft: true },
];

/*
 * Ressources : le guide du commercial (interne), ce qu'il montre au gérant (la
 * plaquette ou le deck et la démo de chaque type d'établissement), et les tutos
 * pour brancher Stripe et la caisse.
 */
export default async function RessourcesPage() {
  await requireRunningContract();

  return (
    <div className="flex flex-col gap-7">
      <PageTitle sub="Ce que tu montres au gérant, et ce qui t’aide à vendre.">Ressources</PageTitle>

      <section className="flex flex-col gap-2.5">
        <SectionTitle>Le guide du commercial</SectionTitle>
        <a href={`${commercialPrefix}/espace/ressources/deck`} target="_blank" className={`${cardClass} flex items-center justify-between gap-3`}>
          <span>
            <span className="block font-medium">Guide du commercial (PDF)</span>
            <span className="text-sm text-muted">Toutes les infos pour vendre. Interne : ne le montre pas au gérant.</span>
          </span>
          <span className={ghostButton}>Ouvrir</span>
        </a>
      </section>

      <section className="flex flex-col gap-2.5">
        <SectionTitle>Présentations et démos</SectionTitle>
        <Presentations kinds={DECKS.map(({ kind, label }) => ({ kind, label }))} />
        <p className="text-xs text-faint">{"Une plaquette ou un deck, et une démo, par type d’établissement. Ouvre chacun une fois avec du réseau : il reste lisible hors ligne."}</p>
      </section>

      <section className="flex flex-col gap-2.5">
        <SectionTitle>Tutos</SectionTitle>
        <ul className="flex flex-col gap-2">
          {TUTOS.map((tuto) => (
            <li key={tuto.file}>
              <a href={`/commercial/tutos/${tuto.file}`} target="_blank" className={`${cardClass} flex items-center justify-between gap-3`}>
                <span>
                  <span className="block font-medium">{tuto.name}</span>
                  <span className="text-sm text-muted">{tuto.draft ? "Version provisoire, à finaliser" : "PDF"}</span>
                </span>
                <span className={ghostButton}>Ouvrir</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="text-xs text-faint">Ouvre chacun une fois avec du réseau : il reste lisible hors ligne.</p>
      </section>
    </div>
  );
}
