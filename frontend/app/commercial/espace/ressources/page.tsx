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

/** Les plaquettes à laisser au gérant, dans public/commercial/plaquettes ; gardées hors ligne comme les tutos. */
const PLAQUETTES = [
  { name: "Plaquette Bar", file: "plaquette-bar.pdf" },
  { name: "Plaquette Club", file: "plaquette-club.pdf" },
  { name: "Plaquette Fast-food", file: "plaquette-fast-food.pdf" },
];

/*
 * Ressources : ce que le commercial montre au gérant (le deck et la démo de
 * chaque type d'établissement, le deck PDF), ses plaquettes, et les tutos pour brancher
 * Stripe et la caisse.
 */
export default async function RessourcesPage() {
  await requireRunningContract();

  return (
    <div className="flex flex-col gap-7">
      <PageTitle sub="Ce que tu montres au gérant, et ce qui t’aide à vendre.">Ressources</PageTitle>

      <section className="flex flex-col gap-2.5">
        <SectionTitle>Présentations et démos</SectionTitle>
        <Presentations kinds={DECKS.map(({ kind, label }) => ({ kind, label }))} />
        <p className="text-xs text-faint">{"Un deck et une démo par type d’établissement. Ouvre chaque deck une fois avec du réseau : il reste lisible hors ligne."}</p>
        <a href={`${commercialPrefix}/espace/ressources/deck`} target="_blank" className={`${cardClass} flex items-center justify-between gap-3`}>
          <span>
            <span className="block font-medium">Deck Ominin (PDF)</span>
            <span className="text-sm text-muted">PDF, à montrer au gérant sur ton téléphone</span>
          </span>
          <span className={ghostButton}>Ouvrir</span>
        </a>
      </section>

      <section className="flex flex-col gap-2.5">
        <SectionTitle>Plaquettes</SectionTitle>
        <ul className="flex flex-col gap-2">
          {PLAQUETTES.map((plaquette) => (
            <li key={plaquette.file}>
              <a href={`/commercial/plaquettes/${plaquette.file}`} target="_blank" className={`${cardClass} flex items-center justify-between gap-3`}>
                <span>
                  <span className="block font-medium">{plaquette.name}</span>
                  <span className="text-sm text-muted">PDF, 8 pages, à montrer au gérant</span>
                </span>
                <span className={ghostButton}>Ouvrir</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="text-xs text-faint">Ouvre chacune une fois avec du réseau : elle reste lisible hors ligne.</p>
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
