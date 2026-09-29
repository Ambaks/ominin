"use client";

/**
 * Le titre d'une section reçoit le focus après un saut (onglet, lien vers la
 * carte) : le lecteur d'écran lit où l'on arrive, et l'anneau du clavier
 * entoure un titre, pas une section de 1 500 px.
 */
export function focusSectionHeading(section: Element | null) {
  section?.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
}

/** La flèche de « La carte » : les polices de marque n'ont pas toutes « ↓ ». */
export function ArrowDown() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3"
    >
      <path d="M6 1.5v9M2.5 7 6 10.5 9.5 7" />
    </svg>
  );
}

/**
 * Lien vers la carte (main#carte) : défile dans la page sans empiler
 * d'entrée d'historique — une entrée sans état, au « Retour » d'une feuille,
 * faisait recharger la page (voir Sheet) — ni écrire d'ancre dans l'adresse,
 * et pose le focus sur la première section, comme l'aurait fait l'ancre.
 */
export function CarteLink({
  className,
  style,
  children,
}: {
  className: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <a
      href="#carte"
      onClick={(event) => {
        const carte = document.getElementById("carte");
        if (!carte) return;
        event.preventDefault();
        carte.scrollIntoView({
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        });
        focusSectionHeading(carte.querySelector("section"));
      }}
      className={className}
      style={style}
    >
      {children}
    </a>
  );
}
