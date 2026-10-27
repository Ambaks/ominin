import type { Allergen } from "@/lib/menu-data";

const SEED = "M0-3.5c1.9 1.4 2.2 3.8 0 5.5-2.2-1.7-1.9-4.1 0-5.5z";
const LEAFLET = "M0 0c-1.3-2-1.3-4.6 0-6.6 1.3 2 1.3 4.6 0 6.6z";

/** Les quatorze allergènes du règlement, dessinés au trait, à la couleur du texte. */
const PATHS: Record<Allergen, React.ReactNode> = {
  gluten: (
    <path d="M12 21V6.5M12 6.5V3M12 9c-2.2 0-3.5-1.4-3.5-3.5 2.2 0 3.5 1.5 3.5 3.5zm0 0c2.2 0 3.5-1.4 3.5-3.5-2.2 0-3.5 1.5-3.5 3.5zm0 4.5c-2.2 0-3.5-1.4-3.5-3.5 2.2 0 3.5 1.5 3.5 3.5zm0 0c2.2 0 3.5-1.4 3.5-3.5-2.2 0-3.5 1.5-3.5 3.5zm0 4.5c-2.2 0-3.5-1.4-3.5-3.5 2.2 0 3.5 1.5 3.5 3.5zm0 0c2.2 0 3.5-1.4 3.5-3.5-2.2 0-3.5 1.5-3.5 3.5z" />
  ),
  crustaces: (
    <path d="M16 5c-5.5 0-10 3.6-10 8.5 0 3.3 2.6 5.5 6 5.5m4-14c2 0 3.5 1.2 3.5 2.8S18 10.5 16 10.5c-2.8 0-4.5 1.5-4.5 3.6 0 1.6 1 2.6 2.5 2.6M12 19l-2 2.5M12 19l2.5 2M16 5l3.5-2.5M16 5h4.5M9 9.5l2 2.5M7 13.5h3" />
  ),
  oeuf: <path d="M12 3c-3.6 0-6.5 5.2-6.5 10.2a6.5 6.5 0 0 0 13 0C18.5 8.2 15.6 3 12 3z" />,
  poisson: (
    <>
      <path d="M6 12c2.6-3.4 5.8-5 9-5 3 0 5 2.4 6 5-1 2.6-3 5-6 5-3.2 0-6.4-1.6-9-5zm0 0L2.5 8.5v7z" />
      <circle cx="16.5" cy="11" r="0.6" fill="currentColor" />
    </>
  ),
  arachides: (
    <path d="M12 3a4 4 0 0 1 4 4c0 1.4-.6 2.3-1.1 3.1-.4.6-.4 1.2 0 1.8.6.9 1.6 2 1.6 3.6a4.5 4.5 0 0 1-9 0c0-1.6 1-2.7 1.6-3.6.4-.6.4-1.2 0-1.8C8.6 9.3 8 8.4 8 7a4 4 0 0 1 4-4zm-1 4h.01M13 8.5h.01M11 15h.01M13 16.5h.01" />
  ),
  soja: (
    <>
      <path d="M5 18.5c-1-1-1-2.5 0-3.5L14.5 5.5c1-1 2.5-1 3.5 0s1 2.5 0 3.5L8.5 18.5c-1 1-2.5 1-3.5 0zM18 5.5 20.5 3" />
      <circle cx="8" cy="15.5" r="1.3" />
      <circle cx="11.25" cy="12.25" r="1.3" />
      <circle cx="14.5" cy="9" r="1.3" />
    </>
  ),
  lait: (
    <path d="M9 3h6m-5 0v3L8 9v10.5A1.5 1.5 0 0 0 9.5 21h5a1.5 1.5 0 0 0 1.5-1.5V9l-2-3V3M8 13h8" />
  ),
  "fruits-a-coque": (
    <path d="M5 10c0-3 3-5.5 7-5.5S19 7 19 10H5zm1.5 0c0 5 2.5 9 5.5 10.5 3-1.5 5.5-5.5 5.5-10.5M12 4.5v-2" />
  ),
  celeri: (
    <path d="M12 21V11m-3 10 1-8.5m5 8.5-1-8.5M9 21h6m-5-8.5C7 11.5 5.5 9 6 6c3 0 4.5 3 4 6.5zm4 0c3-1 4.5-3.5 4-6.5-3 0-4.5 3-4 6.5zM12 11c-1.5-2.5-1.5-5 0-7.5 1.5 2.5 1.5 5 0 7.5z" />
  ),
  moutarde: (
    <path d="M9 3.5h6V7H9zM7.5 7h9l.5 2v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9zm2 6.5h5" />
  ),
  sesame: (
    <>
      <path d={SEED} transform="translate(8 8) rotate(-30)" />
      <path d={SEED} transform="translate(15.5 8.5) rotate(20)" />
      <path d={SEED} transform="translate(11.5 15) rotate(-5)" />
      <path d={SEED} transform="translate(17.5 16) rotate(40)" />
      <path d={SEED} transform="translate(6 16) rotate(-50)" />
    </>
  ),
  sulfites: <path d="M8 3h8l-.5 5a3.5 3.5 0 0 1-7 0zm4 8.5V20m-3.5 0h7M8.3 6h7.4" />,
  lupin: (
    <>
      <path d="M12 21v-8" />
      {[-64, -32, 0, 32, 64].map((angle) => (
        <path key={angle} d={LEAFLET} transform={`translate(12 13) rotate(${angle})`} />
      ))}
    </>
  ),
  mollusques: (
    <path d="M12 19.5 4.5 11.5C4.5 7 8 4 12 4s7.5 3 7.5 7.5zm0 0L9.2 5M12 19.5 14.8 5M12 19.5 6.2 7.5m5.8 12 5.8-12M10 19.5h4V21h-4z" />
  ),
};

export function AllergenIcon({ allergen, className }: { allergen: Allergen; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {PATHS[allergen]}
    </svg>
  );
}
