import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Page introuvable" };

/* Toute adresse inconnue du site passe par la page 404 du site, dans sa mise en page. */
export default function Introuvable() {
  notFound();
}
