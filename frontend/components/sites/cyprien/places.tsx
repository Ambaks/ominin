import { formatSlots, mapsHref, telHref, type Hours, type Shop } from "@/lib/sites/cyprien";
import { OpenNow } from "./open-now";
import { Arrow, ExternalLink, vars } from "./ui";

function HoursList({ hours, closed }: { hours: Hours; closed?: string }) {
  return (
    <dl className="cy-hours" data-reveal="list">
      {hours.map((entry, index) => (
        <div key={entry.label} style={vars({ "--i": index })}>
          <dt>{entry.label}</dt>
          <dd>{formatSlots(entry.slots)}</dd>
        </div>
      ))}
      {closed && (
        <div style={vars({ "--i": hours.length })}>
          <dt>{closed}</dt>
          <dd>Fermé</dd>
        </div>
      )}
    </dl>
  );
}

type Heading = "h2" | "h3";

export function ShopCard({ shop, as: Title = "h3" }: { shop: Shop; as?: Heading }) {
  const titleId = `boutique-${shop.id}`;
  return (
    <article className="cy-place" aria-labelledby={titleId}>
      <p className="cy-place-kicker">{shop.since}</p>
      <Title id={titleId} className="cy-place-name">
        {shop.name}
      </Title>
      <address className="cy-place-address">
        {shop.street}
        <br />
        {shop.city}
      </address>
      {shop.hours ? (
        <>
          <OpenNow hours={shop.hours} />
          <HoursList hours={shop.hours} closed={shop.closed} />
        </>
      ) : (
        <>
          <p className="cy-place-call">Horaires : nous appeler</p>
          <p className="cy-place-note">Les horaires de cette boutique ne sont pas encore en ligne : un appel suffit.</p>
        </>
      )}
      <p className="cy-place-note">{shop.transport}</p>
      {shop.pickup && <p className="cy-place-pickup">Retrait des commandes passées en ligne</p>}
      <ul className="cy-place-actions">
        <li>
          <a href={telHref(shop.phone)} className="cy-chip">
            {shop.phone}
          </a>
        </li>
        <li>
          <ExternalLink href={mapsHref(`Boulangerie Cyprien`, shop.street, shop.city)} className="cy-chip">
            Itinéraire <Arrow />
          </ExternalLink>
        </li>
      </ul>
    </article>
  );
}
