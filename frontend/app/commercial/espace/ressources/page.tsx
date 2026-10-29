import { ShareLink } from "@/components/commercial/space/share-link";
import { PageTitle, SectionTitle, cardClass, ghostButton } from "@/components/commercial/space/ui";
import { requireRunningContract } from "@/lib/commercial/session";
import { LEGAL_PATHS } from "@/lib/legal/constants";
import { collectOffer, pricingSection } from "@/lib/landing-data";
import { DEMO_SLUG, formatPrice } from "@/lib/menu/format";
import { shopOffer } from "@/lib/shop-landing-data";
import { getRestaurant } from "@/lib/menu-data";
import { collectSiteUrl, commercialPrefix, menuSiteUrl, shopSiteUrl, siteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/*
 * Ressources : ce que le commercial montre au gérant (le deck, les démos, les
 * offres telles que les publient les pages publiques — il n'en promet pas
 * d'autres, article 2.2) et son guide de vente, réglé par l'admin.
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
  const [connect] = pricingSection.plans;
  const offers = [
    {
      name: `Menu · ${connect.name}`,
      // Sans abonnement : la commission seule, pas « 0,00 €/mois ».
      price: `${connect.price ? `${formatPrice(connect.price)}${pricingSection.perMonth} + ` : ""}${connect.commission!.percent} % ${connect.commission!.basis}`,
      url: `${menuSiteUrl}#tarifs`,
    },
    {
      name: `Collect · ${collectOffer.name}`,
      price: `${formatPrice(collectOffer.price)}${pricingSection.perMonth} + ${collectOffer.commission.percent} % ${collectOffer.commission.basis}`,
      url: collectSiteUrl,
    },
    {
      name: collectOffer.bundle.name,
      price: `${collectOffer.commission.percent} % à emporter, ${collectOffer.bundle.menuCommission.percent} % ${collectOffer.bundle.menuCommission.basis}`,
      url: collectSiteUrl,
    },
    {
      name: `Shop · ${shopOffer.name}`,
      price: `${formatPrice(shopOffer.monthlyPrice)}${pricingSection.perMonth} + ${shopOffer.commissionPercent} % de chaque commande payée`,
      url: shopSiteUrl,
    },
  ];

  return (
    <div className="flex flex-col gap-7">
      <PageTitle sub="Ce que tu montres au gérant, et ce qui t’aide à vendre.">Ressources</PageTitle>

      <section className="flex flex-col gap-2.5">
        <SectionTitle>Présentation</SectionTitle>
        <a href={`${commercialPrefix}/espace/ressources/deck`} target="_blank" className={`${cardClass} flex items-center justify-between gap-3`}>
          <span>
            <span className="block font-medium">Deck Ominin</span>
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
        <SectionTitle>Offres et prix en vigueur</SectionTitle>
        <ul className="flex flex-col gap-2">
          {offers.map((offer) => (
            <li key={offer.name}>
              <a href={offer.url} target="_blank" rel="noopener" className={`${cardClass} block`}>
                <span className="block font-medium">{offer.name}</span>
                <span className="block text-sm text-muted">{offer.price}</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="text-xs text-faint">
          Les prix des pages publiques, ni plus ni moins : tu ne négocies rien (article 2.2).{" "}
          <a href={`${siteUrl}${LEGAL_PATHS.cgv}`} target="_blank" rel="noopener" className="underline">
            Conditions générales et tarifs
          </a>
        </p>
      </section>

      <section className="flex flex-col gap-2.5">
        <SectionTitle>Simulateur</SectionTitle>
        <a href={`${menuSiteUrl}/devis`} target="_blank" rel="noopener" className={`${cardClass} flex items-center justify-between gap-3`}>
          <span>
            <span className="block font-medium">Le devis du restaurant</span>
            <span className="text-sm text-muted">Offre, tables, branchements : le prix en direct, avec lui.</span>
          </span>
          <span className={ghostButton}>Ouvrir</span>
        </a>
      </section>
    </div>
  );
}
