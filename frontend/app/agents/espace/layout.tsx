import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AgentsShell } from "@/components/agents/espace/shell";
import { AgentsProvider } from "@/lib/agents/context";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Votre agent — Ominin Agents",
  robots: { index: false, follow: false },
};

/*
 * Garde serveur de l'espace (défense en profondeur derrière le proxy). La
 * première visite crée le profil de l'agent, vide et non activé : sous RLS,
 * le client n'y pose que son user_id — l'activation reste à Ominin.
 */
export default async function AgentsEspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { error } = await supabase
    .from("agents_profiles")
    .upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });
  if (error) throw new Error(error.message);

  return (
    <AgentsProvider>
      <AgentsShell email={user.email ?? ""}>{children}</AgentsShell>
    </AgentsProvider>
  );
}
