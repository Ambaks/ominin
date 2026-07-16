import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ClipShell } from "@/components/clip/espace/shell";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Votre espace — Ominin Clip",
  robots: { index: false, follow: false },
};

/*
 * Garde serveur de l'espace clipper (défense en profondeur derrière la garde
 * du proxy) + chrome commun. Les pages enfants sont des composants client
 * alimentés par lib/clip/store.
 */
export default async function ClipEspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <ClipShell>{children}</ClipShell>;
}
