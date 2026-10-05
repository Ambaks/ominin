"use client";

import { usePathname } from "next/navigation";
import { isProduct, type Product } from "./products";

/*
 * Sur admin.ominin.com le proxy sert des chemins nus (/carte) ; en mode
 * inerte l'app vit sous ominin.com/admin/carte. Le produit affiché, lui, est
 * un segment que le proxy retire (/menu/carte sert /carte). usePathname
 * renvoie le chemin visible par le navigateur (la réécriture du proxy est
 * interne), donc racine et produit se déduisent du chemin lui-même —
 * déterministe côté serveur et client.
 */
export interface AdminLocation {
  /** "" sur admin.ominin.com, "/admin" en mode inerte. */
  rootPath: string;
  /** Racine et produit affiché : un lien qui part d'ici garde la vue. */
  basePath: string;
  /** Écran courant, sans racine ni produit. */
  localPath: string;
  /** null : vue d'ensemble, tous produits confondus. */
  product: Product | null;
}

export function useAdminBasePath(): AdminLocation {
  const pathname = usePathname();
  const rootPath =
    pathname === "/admin" || pathname.startsWith("/admin/") ? "/admin" : "";
  const [, segment = ""] = pathname.slice(rootPath.length).split("/");
  const product = isProduct(segment) ? segment : null;
  const basePath = product ? `${rootPath}/${product}` : rootPath;
  const localPath = pathname.slice(basePath.length) || "/";
  return { rootPath, basePath, localPath, product };
}

/** Lien vers un écran sous une base : l'accueil n'ajoute pas de « / » final. */
export function adminHref(basePath: string, localPath: string): string {
  return localPath === "/" ? basePath || "/" : `${basePath}${localPath}`;
}

/** Même déduction hors hook (redirections du store, déconnexion). */
export function adminLoginPath(): string {
  const { pathname } = window.location;
  const basePath =
    pathname === "/admin" || pathname.startsWith("/admin/") ? "/admin" : "";
  return `${basePath}/connexion`;
}
