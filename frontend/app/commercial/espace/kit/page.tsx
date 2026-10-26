import { ShareLink } from "@/components/commercial/space/share-link";
import { PageTitle, SectionTitle, cardClass, ghostButton } from "@/components/commercial/space/ui";
import type { CommercialAccount } from "@/lib/commercial/api";
import { LEGAL_PATHS } from "@/lib/legal/constants";
import { DEMO_SLUG } from "@/lib/menu/format";
import { getRestaurant } from "@/lib/menu-data";
import { collectSiteUrl, menuSiteUrl, shopSiteUrl, siteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/*
 * Kit : ce qu'on montre au gérant. Le deck, les démos (celle d'Ominin et
 * celles que l'admin a choisies dans les réglages), et les offres telles que
 * les publient les pages publiques — le commercial n'en promet pas d'autres
 * (article 2.2).
 */
export default async function KitPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("commercial_account");
  const account = data as unknown as CommercialAccount;
  const demos = [
    { name: "Démo Ominin", url: `${menuSiteUrl}/m/${DEMO_SLUG}` },
    ...account.kit_demo_slugs.flatMap((slug) => {
      const restaurant = getRestaurant(slug);
      return restaurant ? [{ name: restaurant.name, url: `${menuSiteUrl}/demo/${slug}` }] : [];
    }),
  ];
  const offers = [
    { name: "Menu : commande et paiement à table", url: `${menuSiteUrl}#tarifs` },
    { name: "Collect : click & collect", url: collectSiteUrl },
    { name: "Shop : boutique en ligne", url: shopSiteUrl },
    { name: "Conditions générales et tarifs", url: `${siteUrl}${LEGAL_PATHS.cgv}` },
  ];

  return (
    <div className="flex flex-col gap-7">
      <PageTitle sub="Ce que vous montrez au gérant.">Kit</PageTitle>

      <section className="flex flex-col gap-2.5">
        <SectionTitle>Présentation</SectionTitle>
        <a href="/api/commercial/deck" target="_blank" className={`${cardClass} flex items-center justify-between gap-3`}>
          <span>
            <span className="block font-medium">Deck Ominin</span>
            <span className="text-sm text-muted">PDF, à montrer sur votre téléphone</span>
          </span>
          <span className={ghostButton}>Ouvrir</span>
        </a>
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
        <SectionTitle>Offres et prix en vigueur</SectionTitle>
        <ul className="flex flex-col gap-2">
          {offers.map((offer) => (
            <li key={offer.url}>
              <a href={offer.url} target="_blank" rel="noopener" className={`${cardClass} block font-medium`}>
                {offer.name}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
