import type { ReactNode } from "react";

export type LegalSection = { id: string; title: string; body: ReactNode };

/** Texte légal : sommaire collant à gauche, articles à droite. */
export function LegalText({ sections }: { sections: LegalSection[] }) {
  return (
    <div className="cy-wrap cy-legal">
      <nav aria-label="Sommaire">
        <ol>
          {sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`}>{section.title}</a>
            </li>
          ))}
        </ol>
      </nav>
      <div>
        {sections.map((section) => (
          <section key={section.id} id={section.id} aria-labelledby={`${section.id}-titre`}>
            <h2 id={`${section.id}-titre`}>{section.title}</h2>
            <div className="cy-prose">{section.body}</div>
          </section>
        ))}
      </div>
    </div>
  );
}
