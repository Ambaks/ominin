import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { demoNotFound, demoSeo, gestion } from "@/lib/hotels-demo-data";

/*
 * Une adresse sous un QR : le 404 de l'hôtel. Le titre d'onglet vient d'ici :
 * après l'hydratation, le navigateur garde celui de la page, pas celui de
 * not-found.tsx.
 */

export const metadata: Metadata = { title: gestion.seo.page(demoNotFound.title), description: demoSeo.description };

export default function HotelsDemoQrUnknown() {
  notFound();
}
