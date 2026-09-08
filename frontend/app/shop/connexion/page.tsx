import type { Metadata } from "next";
import { ShopLoginForm } from "@/components/shop/gestion/login-form";

export const metadata: Metadata = { title: "Connexion — Ominin Shop", robots: { index: false, follow: false } };

export default async function ShopConnexionPage({ searchParams }: PageProps<"/shop/connexion">) {
  const { error } = await searchParams;
  return <ShopLoginForm authError={error === "auth"} />;
}
