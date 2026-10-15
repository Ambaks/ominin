import { formatSlot, mapsHref, telHref, type MidiPlace } from "@/lib/sites/cyprien";
import { Arrow, ExternalLink, vars } from "./ui";

/** « 09:30 » → 9,5. */
function toHour(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours + minutes / 60;
}

/*
 * Le midi d’un coup d’œil : une règle des heures, de la première ouverture à
 * la dernière fermeture, et pour chaque adresse sa plage d’ouverture, qui se
 * dessine quand elle entre à l’écran. Tout se lit aussi en texte, coordonnées
 * comprises.
 */
export function MidiHours({ places }: { places: readonly MidiPlace[] }) {
  // Un seul jeu d’horaires par adresse : du lundi au vendredi.
  const rows = places.map((place) => ({ place, days: place.hours[0].label, slots: place.hours[0].slots }));
  const slots = rows.flatMap((row) => row.slots);
  const start = Math.floor(Math.min(...slots.map(([open]) => toHour(open))));
  const end = Math.ceil(Math.max(...slots.map(([, close]) => toHour(close))));
  const at = (hour: number) => ((hour - start) / (end - start)) * 100;
  const ticks = Array.from({ length: end - start + 1 }, (_, index) => start + index);

  return (
    <div className="cy-midi-hours" style={vars({ "--hours": end - start })}>
      <div className="cy-midi-grid" aria-hidden="true">
        <span />
        <div className="cy-midi-axis" data-reveal="list">
          {ticks.map((hour, index) => (
            <span key={hour} style={{ left: `${at(hour)}%`, ...vars({ "--i": index }) }}>
              {hour}&nbsp;h
            </span>
          ))}
        </div>
      </div>
      <ul>
        {rows.map(({ place, days, slots: placeSlots }, index) => (
          <li key={place.id} className="cy-midi-grid cy-midi-row" data-reveal="up" data-delay={index || undefined}>
            <div className="cy-midi-place">
              <h3>{place.name.replace("Cyprien le midi ", "")}</h3>
              <p>
                {place.street}, {place.city}
              </p>
              <p className="cy-midi-links">
                <a href={telHref(place.phone)} className="cy-chip">
                  {place.phone}
                </a>
                <a href={`mailto:${place.email}`} className="cy-chip">
                  Écrire
                </a>
                <ExternalLink href={mapsHref(place.name, place.street, place.city)} className="cy-chip">
                  Itinéraire <Arrow />
                </ExternalLink>
              </p>
            </div>
            <div className="cy-midi-track">
              {placeSlots.map((slot) => (
                <p
                  key={slot[0]}
                  className="cy-midi-bar"
                  style={{
                    left: `${at(toHour(slot[0]))}%`,
                    width: `${at(toHour(slot[1])) - at(toHour(slot[0]))}%`,
                  }}
                >
                  <span className="sr-only">{days}, </span>
                  {formatSlot(slot)}
                </p>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
