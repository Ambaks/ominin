"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ThemeProvider, useTheme } from "next-themes";

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

/*
 * Choix de thème partagé entre produits : le localStorage est cloisonné par
 * origine (portail, menu, collect, clip, admin = cinq origines), un cookie
 * posé sur .ominin.com est le seul canal commun. Le script inline du layout
 * racine le recopie dans le localStorage avant next-themes au chargement ;
 * ici, chaque changement de thème met le cookie à jour. Un an, comme la
 * préférence qu'il représente ; hors production (localhost), pas d'attribut
 * domain — le partage inter-sous-domaines n'y existe pas.
 */
const THEME_COOKIE = "ominin-theme";
const THEME_COOKIE_MAX_AGE_S = 31_536_000;

function ThemeCookieSync() {
  const { theme } = useTheme();
  useEffect(() => {
    if (theme !== "light" && theme !== "dark") return;
    const domain = window.location.hostname.endsWith("ominin.com")
      ? "; domain=.ominin.com"
      : "";
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${THEME_COOKIE_MAX_AGE_S}; SameSite=Lax${domain}${secure}`;
  }, [theme]);
  return null;
}

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
      {/* Le menu QR (clé dédiée) ne doit pas écraser le choix partagé. */}
      {!isMenu && <ThemeCookieSync />}
      {children}
    </ThemeProvider>
  );
}
