import type { Metadata } from "next";
import { CartBar } from "@/components/menu/cart-bar";
import { CategoryNav } from "@/components/menu/category-nav";
import { MenuSection } from "@/components/menu/menu-section";
import { DAY_NAMES, groupOpeningHours, type OpeningHours } from "@/lib/collect/hours";
import { CartProvider } from "@/lib/menu/cart";
import { formatPrice } from "@/lib/menu/format";
import { restaurantThemeClass } from "@/lib/menu-data";
import { contact, cyprienHref, formatSlots, pickupShop, telHref } from "@/lib/sites/cyprien";
import { CategoryGlide } from "./category-glide";
import { OpenStatus } from "./open-status";
import { CYPRIEN_SLUG, getShop } from "./shop";
import "./commander.css";

/*
 * La commande en ligne du site : la carte de la boutique en base (articles,
 * options, prix et disponibilités tenus par l'équipe depuis son espace),
 * payée en ligne sur le compte de la boulangerie, retirée au 55 rue de la
 * République à l'heure choisie. Le moteur est celui du click & collect
 * d'Ominin : place_order fait foi pour les prix, les créneaux et les délais.
 */
// Rendue à la demande, comme la page collect de chaque restaurant (route
// dynamique) : rien ne lit la base au moment du build.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Commander en ligne",
  description:
    "Pains, viennoiseries, pâtisseries et gâteaux à partager : commandez et réglez en ligne, retirez à la boulangerie, 55 rue de la République à Toulouse.",
  alternates: { canonical: cyprienHref("/commander") },
};

const STEPS = [
  { title: "Composez", body: "Pains, viennoiseries, pâtisseries, gâteaux à partager." },
  { title: "Choisissez votre heure", body: "Aujourd’hui, demain ou le jour de la fête." },
  { title: "Retirez en boutique", body: "Réglé en ligne : on vous le tend, c’est tout." },
] as const;

/** « Du mardi au samedi : 7 h 30 – 14 h et 16 h – 20 h · Le dimanche : 7 h 45 – 14 h ». */
function hoursText(hours: OpeningHours): string {
  return groupOpeningHours(hours)
    .map(({ first, last, ranges }) => {
      const days =
        first === last
          ? `Le ${DAY_NAMES[first - 1].toLowerCase()}`
          : `Du ${DAY_NAMES[first - 1].toLowerCase()} au ${DAY_NAMES[last - 1].toLowerCase()}`;
      return `${days}\u00a0: ${formatSlots(ranges)}`;
    })
    .join(" · ");
}

function Unavailable() {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center gap-4 px-5 py-28 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-ember-1">
        Commande en ligne
      </p>
      <h1 className="font-display text-4xl font-medium tracking-tight">Bientôt ouverte</h1>
      <p className="leading-relaxed text-muted">
        La commande en ligne n&apos;est pas encore ouverte. Pour un gâteau ou une
        commande particulière, appelez-nous au{" "}
        <a href={telHref(contact.phone)} className="font-semibold text-ember-1 underline-offset-4 hover:underline">
          {contact.phone}
        </a>
        .
      </p>
    </section>
  );
}

export default async function CommanderPage() {
  const data = await getShop();
  if (!data) return <Unavailable />;
  const {
    id,
    restaurant,
    onlinePayment,
    onlineMinOrder,
    closedItems,
    paymentProvider,
    squareLocationId,
    openingHours,
    collectSlotMinutes,
  } = data;

  // Payée à la commande : sans encaisseur en ligne ni horaires, rien ne se
  // commande. La démonstration tient lieu d'encaisseur (aucun débit).
  const payable =
    onlinePayment &&
    (paymentProvider === "stripe" ||
      paymentProvider === "demo" ||
      (paymentProvider === "square" && squareLocationId !== null));
  if (!data.active || !payable || !openingHours) return <Unavailable />;

  const categoryLinks = restaurant.categories.map(({ id, name }) => ({ id, name }));
  // Le plus long délai de la carte, annoncé avant même d'ouvrir un gâteau.
  const longest = restaurant.categories
    .flatMap((category) =>
      category.items.map((item) => ({ category: category.name, hours: item.noticeHours ?? 0 }))
    )
    .reduce((max, entry) => (entry.hours > max.hours ? entry : max), { category: "", hours: 0 });

  return (
    <CartProvider
      config={{
        slug: CYPRIEN_SLUG,
        tableNumber: null,
        orderingEnabled: true,
        restaurantName: restaurant.name,
        onlinePayment: true,
        paymentProvider,
        squareLocationId,
        onlineMinOrder,
        etablissementId: id,
        closedItems,
        collect: {
          hours: openingHours,
          slotMinutes: collectSlotMinutes,
          confirmationPath: cyprienHref("/commander/confirmation"),
        },
      }}
    >
      <div
        data-menu-root
        className={`${restaurantThemeClass(CYPRIEN_SLUG) ?? ""} cy-order flex flex-1 flex-col text-foreground`}
      >
        <section className="cy-order-hero mx-auto w-full max-w-2xl px-5 pb-8 pt-12 sm:pt-16 lg:max-w-5xl lg:px-10 lg:pt-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-ember-1">
            Click &amp; collect
          </p>
          <h1 className="mt-3 font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Commander en ligne
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted lg:text-lg">
            Réglez en ligne, passez le chercher au {pickupShop.street}{" "}
            à l&apos;heure qui vous convient.
          </p>

          <ol className="mt-8 grid gap-3 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="flex gap-3 rounded-2xl border border-hairline bg-surface px-4 py-4"
              >
                <span className="font-display text-2xl leading-none text-ember-1">{index + 1}</span>
                <span>
                  <span className="block font-semibold">{step.title}</span>
                  <span className="mt-0.5 block text-sm leading-snug text-muted">{step.body}</span>
                </span>
              </li>
            ))}
          </ol>

          <dl className="mt-5 flex flex-col gap-1.5 text-sm text-muted">
            <div className="flex flex-wrap items-center gap-x-2">
              <dt className="sr-only">Boutique</dt>
              <dd>
                <OpenStatus hours={openingHours} />
              </dd>
            </div>
            <div>
              <dt className="sr-only">Horaires de retrait</dt>
              <dd>{hoursText(openingHours)}</dd>
            </div>
            {longest.hours > 0 && (
              <div>
                <dt className="sr-only">Délai de commande</dt>
                <dd>
                  {longest.category} : à commander {longest.hours}&nbsp;h à l&apos;avance.
                </dd>
              </div>
            )}
            {onlineMinOrder !== null && (
              <div>
                <dt className="sr-only">Minimum</dt>
                <dd>Commande minimum {formatPrice(onlineMinOrder)}.</dd>
              </div>
            )}
          </dl>
        </section>

        <CartBar />
        <CategoryNav categories={categoryLinks} themeLocked />
        <CategoryGlide />
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-16 px-5 pb-32 pt-8 sm:pt-10 lg:max-w-5xl lg:gap-24 lg:px-10 lg:py-14">
          {restaurant.categories.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">
              La carte en ligne se prépare : revenez bientôt.
            </p>
          ) : (
            restaurant.categories.map((category, index) => (
              <MenuSection key={category.id} category={category} first={index === 0} />
            ))
          )}
        </div>
      </div>
    </CartProvider>
  );
}
