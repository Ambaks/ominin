import { Fragment } from "react";

/**
 * Le nom, un mot par <span> : un thème peut le colorer mot à mot, comme une
 * enseigne bicolore (.theme-o-crousti-poulet), ou y passer un reflet qui
 * reprend le mot (data-word, .theme-le-novelty). Sans thème, rien ne change.
 */
export function NameWords({ name }: { name: string }) {
  return name.split(" ").map((word, i) => (
    <Fragment key={i}>
      {i > 0 && " "}
      <span data-word={word}>{word}</span>
    </Fragment>
  ));
}
