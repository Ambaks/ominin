import type { PillarId } from "@/lib/menu-landing-data";

/* Un glyphe par pilier, trait 1,75, couleur courante (même dessin que les tuiles du portail). */
const paths: Record<PillarId, React.ReactNode> = {
  satisfaction: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 14a4 4 0 0 0 7 0M9.5 9.5v.01M14.5 9.5v.01" />
    </>
  ),
  couts: <path d="M4 7h10a6 6 0 0 1 0 12H8M4 7l3-3M4 7l3 3M12 11v4M10 13h4" />,
  ventes: <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />,
  donnees: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
};

export function PillarIcon({ id }: { id: PillarId }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden>
      {paths[id]}
    </svg>
  );
}
