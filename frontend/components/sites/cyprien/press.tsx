import type { ReactNode } from "react";
import { formatPressDate, type PressItem } from "@/lib/sites/cyprien";
import { Arrow, vars } from "./ui";

export type PressLead = Extract<PressItem, { title: string }>;

/** Dit une fois par page, par aria-describedby, que les liens de la presse ouvrent un nouvel onglet. */
const NEW_TAB_NOTE = "presse-nouvel-onglet";

export function NewTabNote() {
  return (
    <span id={NEW_TAB_NOTE} hidden>
      S’ouvre dans un nouvel onglet
    </span>
  );
}

/** Un mot d’une ou deux lettres ne finit jamais une ligne : il passe avec le suivant. */
function bindShortWords(text: string): string {
  return text.replace(/(?<=^|\s)([\p{L}\p{N}]{1,2}) /gu, "$1\u00a0");
}

/** Entre guillemets, le titre de la parution ; en italique, notre résumé quand elle n’en a pas. */
function Headline({ item }: { item: PressItem }) {
  return item.title !== undefined ? (
    `«\u00a0${bindShortWords(item.title)}\u00a0»`
  ) : (
    <span className="cy-press-summary">{bindShortWords(item.summary)}</span>
  );
}

/** Le titre ouvre la parution ; son lien couvre toute la fiche (.cy-press-item). */
function PressLink({ item, children }: { item: PressItem; children: ReactNode }) {
  return item.url ? (
    <a href={item.url} target="_blank" rel="noopener noreferrer" className="cy-press-link" aria-describedby={NEW_TAB_NOTE}>
      {children}
    </a>
  ) : (
    children
  );
}

/** Le titre et la date. Après le titre dans le document, avant lui à l’écran. */
function PressMeta({ item, kind = false }: { item: PressItem; kind?: boolean }) {
  return (
    <p className="cy-press-meta">
      <span className="cy-press-outlet">{item.outlet}</span>
      <span>
        {kind && `${item.kind} · `}
        <time dateTime={item.date}>{formatPressDate(item.date)}</time>
      </span>
    </p>
  );
}

function Cue({ item, label }: { item: PressItem; label: string }) {
  return (
    item.url && (
      <span className="cy-press-cue" aria-hidden="true">
        {label}
        <Arrow />
      </span>
    )
  );
}

/**
 * La une de l’accueil : l’article fondateur en grand, les brèves en colonne.
 * Le double filet de tête se trace à l’entrée, puis le filet de colonne.
 */
export function PressFront({ lead, briefs }: { lead: PressLead; briefs: PressItem[] }) {
  return (
    <div className="cy-press-sheet" data-reveal="sheet">
      <NewTabNote />
      <article className="cy-press-item cy-press-lead" data-reveal="up" data-delay="1">
        <h3 className="cy-press-lead-title">
          <PressLink item={lead}>
            <span className="cy-guillemet">«</span>
            {`\u00a0${bindShortWords(lead.title)}\u00a0`}
            <span className="cy-guillemet">»</span>
          </PressLink>
        </h3>
        <PressMeta item={lead} />
        {lead.standfirst && <p className="cy-press-standfirst">{lead.standfirst}</p>}
        <Cue item={lead} label="Lire l’article" />
      </article>
      <ul className="cy-press-briefs" data-reveal="list" style={vars({ "--d": "0.25s" })}>
        {briefs.map((item, index) => (
          <li key={`${item.outlet}-${item.date}`} className="cy-press-item" style={vars({ "--i": index })}>
            <h3 className="cy-press-brief-title">
              <PressLink item={item}>
                <Headline item={item} />
              </PressLink>
            </h3>
            <PressMeta item={item} />
            <Cue item={item} label="Lire" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Une ligne de la revue de presse, sous son année. */
export function PressRow({ item }: { item: PressItem }) {
  return (
    <li className="cy-press-item cy-press-row" data-reveal="up">
      <h4 className="cy-press-row-title">
        <PressLink item={item}>
          <Headline item={item} />
        </PressLink>
      </h4>
      <PressMeta item={item} kind />
      <Cue item={item} label="Lire" />
    </li>
  );
}
