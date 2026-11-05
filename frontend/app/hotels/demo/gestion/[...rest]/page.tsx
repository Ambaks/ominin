import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { demoNotFound, gestion } from "@/lib/hotels-demo-data";

/*
 * Toute adresse inconnue de la gestion : le 404 de l'hôtel, dans la coquille.
 * La coquille n'affiche la page qu'une fois l'état chargé, après le rendu
 * serveur : le titre d'onglet vient donc d'ici, la page de not-found.tsx.
 */

export const metadata: Metadata = { title: gestion.seo.page(demoNotFound.title) };

export default function HotelsDemoGestionUnknown() {
  notFound();
}
