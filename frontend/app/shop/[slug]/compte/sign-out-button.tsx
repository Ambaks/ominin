"use client";

import { LogoutIcon } from "@/components/shop/icons";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton({ redirectTo }: { redirectTo: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        await createClient().auth.signOut();
        window.location.assign(redirectTo);
      }}
      className="inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-shop-accent-deep transition hover:bg-shop-tint"
    >
      <LogoutIcon className="size-4" /> Me déconnecter
    </button>
  );
}
