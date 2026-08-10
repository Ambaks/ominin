"use client";

import { usePathname } from "next/navigation";
import { ThemeProvider } from "next-themes";

// The public menu (/m/...) is its own theme surface. It renders inside the
// landing page's demo iframe, and next-themes keeps every same-origin document
// that shares a storageKey in sync via the `storage` event — so without a
// separate key the demo's light/dark toggle would flip the whole marketing site
// (and vice versa). A dedicated menu key makes the two independent.
const MENU_STORAGE_KEY = "ominin-menu-theme";

// Deux formes selon le host : /m/... sur menu.ominin.com (chemin réécrit par
// le proxy), /menu/m/... sur le domaine principal quand le sous-domaine est
// inerte.
const MENU_PATHS = ["/m/", "/menu/m/"];

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMenu = MENU_PATHS.some((p) => pathname.startsWith(p));
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey={isMenu ? MENU_STORAGE_KEY : undefined}
    >
      {children}
    </ThemeProvider>
  );
}
