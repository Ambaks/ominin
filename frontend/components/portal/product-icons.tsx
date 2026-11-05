import type { ProductId } from "@/lib/portal-data";

/* Un glyphe par produit, trait 1,75, couleur courante : la tuile de la rangée. */
const paths: Record<ProductId, React.ReactNode> = {
  menu: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <path d="M14 14h3v3h-3zM20 14v.01M17 20h4M14 20v.01" />
    </>
  ),
  club: <path d="M5 4h14l-7 8zM12 12v7M8.5 21h7" />,
  agents: <path d="M21 3 10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5z" />,
  shop: <path d="M6 8h12l1 13H5zM9 8a3 3 0 0 1 6 0" />,
  collect: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  clip: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="m10 9 5 3-5 3z" />
    </>
  ),
};

export function ProductIcon({ id }: { id: ProductId }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths[id]}
    </svg>
  );
}
