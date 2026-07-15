"use client";

import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const signOut = async () => {
    await createClient().auth.signOut();
    // Navigation complète : repasse par le proxy (garde de /espace).
    window.location.assign("/login");
  };

  return (
    <button
      type="button"
      onClick={signOut}
      className="text-sm text-muted transition-colors hover:text-foreground"
    >
      Se déconnecter
    </button>
  );
}
