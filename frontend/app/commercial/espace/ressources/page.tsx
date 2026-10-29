import { ShareLink } from "@/components/commercial/space/share-link";
import { PageTitle, SectionTitle, cardClass, ghostButton } from "@/components/commercial/space/ui";
import { DECKS } from "@/lib/commercial/decks";
import { requireRunningContract } from "@/lib/commercial/session";
import { DEMO_SLUG } from "@/lib/menu/format";
import { getRestaurant } from "@/lib/menu-data";
import { commercialPrefix, menuSiteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Les tutos du fondateur, dans public/commercial/tutos ; gardés hors ligne par public/commercial-sw.js. */
const TUTOS = [
  { name: "Tuto Stripe", file: "tuto-stripe.pdf", draft: false },
  { name: "Tuto HubRise", file: "tuto-hubrise.pdf", draft: true },
  { name: "Fiches caisses HubRise", file: "fiches-caisses-hubrise.pdf", draft: true },
];

/*
 * Ressources : ce que le commercial montre au gérant (les decks par type
 * d'établissement, le deck PDF, les démos), son guide de vente, réglé par
 * l'admin, et les tutos pour brancher Stripe et la caisse.
 */
export default async function RessourcesPage() {
  const account = await requireRunningContract();
  const { data: guideUrl, error } = await (await createClient()).rpc("commercial_guide_url");
  if (error) throw new Error(error.message);
  const demos = [
    { name: "Démo Ominin", url: `${menuSiteUrl}/m/${DEMO_SLUG}` },
    ...account.kit_demo_slugs.flatMap((slug) => {
      const restaurant = getRestaurant(slug);
      return restaurant ? [{ name: restaurant.name, url: `${menuSiteUrl}/demo/${slug}` }] : [];
    }),
  ];

  return (
    <div className="flex flex-col gap-7">
      <PageTitle sub="Ce que tu montres au gérant, et ce qui t’aide à vendre.">Ressources</PageTitle>

      <section className="flex flex-col gap-2.5">
        <SectionTitle>Présentation</SectionTitle>
        <ul className="grid grid-cols-2 gap-2">
          {DECKS.map((deck) => (
            <li key={deck.kind}>
              <a href={`${commercialPrefix}/espace/ressources/decks/${deck.kind}`} className={`${cardClass} block`}>
                <span className="block font-medium">{deck.label}</span>
                <span className="text-sm text-muted">Le deck, plein écran</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="text-xs text-faint">{"Un deck par type d’établissement. Ouvre chacun une fois avec du réseau : il reste lisible hors ligne."}</p>
        <a href={`${commercialPrefix}/espace/ressources/deck`} target="_blank" className={`${cardClass} flex items-center justify-between gap-3`}>
          <span>
            <span className="block font-medium">Deck Ominin (PDF)</span>
            <span className="text-sm text-muted">PDF, à montrer au gérant sur ton téléphone</span>
          </span>
          <span className={ghostButton}>Ouvrir</span>
        </a>
        {guideUrl && (
          <a href={guideUrl} target="_blank" rel="noopener" className={`${cardClass} flex items-center justify-between gap-3`}>
            <span>
              <span className="block font-medium">Guide de vente</span>
              <span className="text-sm text-muted">Comment se passe une vente, les objections, ta commission</span>
            </span>
            <span className={ghostButton}>Ouvrir</span>
          </a>
        )}
      </section>

      <section className="flex flex-col gap-2.5">
        <SectionTitle>Démos</SectionTitle>
        <ul className="flex flex-col gap-2">
          {demos.map((demo) => (
            <li key={demo.url} className={`${cardClass} flex items-center justify-between gap-3`}>
              <a href={demo.url} target="_blank" rel="noopener" className="min-w-0 flex-1">
                <span className="block truncate font-medium">{demo.name}</span>
                <span className="block truncate text-sm text-muted">{demo.url.replace(/^https?:\/\//, "")}</span>
              </a>
              <ShareLink url={demo.url} title={demo.name} />
            </li>
          ))}
        </ul>
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
