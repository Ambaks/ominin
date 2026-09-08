import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CreateShopForm } from "@/components/shop/gestion/create-shop-form";
import { getShopSession } from "@/lib/shop/server";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Votre boutique — Ominin Shop", robots: { index: false, follow: false } };

export default async function CreateShopPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");
  if (await getShopSession()) redirect("/gestion");
  return <CreateShopForm />;
}
