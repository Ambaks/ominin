"use client";

import { usePathname } from "next/navigation";

/*
 * Sur admin.ominin.com le proxy sert des chemins nus (/carte) ; en mode
 * inerte l'app vit sous ominin.com/admin/carte. usePathname renvoie le chemin
 * visible par le navigateur (la réécriture du proxy est interne), donc le
 * préfixe se déduit du chemin lui-même — déterministe côté serveur et client.
 */
export function useAdminBasePath(): { basePath: string; localPath: string } {
  const pathname = usePathname();
  const basePath =
    pathname === "/admin" || pathname.startsWith("/admin/") ? "/admin" : "";
  const localPath = pathname.slice(basePath.length) || "/";
  return { basePath, localPath };
}

/** Même déduction hors hook (redirections du store, déconnexion). */
export function adminLoginPath(): string {
  const { pathname } = window.location;
  const basePath =
    pathname === "/admin" || pathname.startsWith("/admin/") ? "/admin" : "";
  return `${basePath}/connexion`;
}
