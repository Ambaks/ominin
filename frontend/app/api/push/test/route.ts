import { NextResponse } from "next/server";
import { sendToSubscriptions } from "@/lib/push/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/*
 * Notification d'essai : le membre vérifie depuis la page Notifications que
 * ses appareils sonnent vraiment, sans attendre une commande. Envoyée à tous
 * ses appareils abonnés, préférences ignorées (c'est un test de tuyauterie).
 */

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: subscriptions, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!subscriptions.length) {
    return NextResponse.json(
      { error: "Aucun appareil abonné : activez d'abord les notifications." },
      { status: 404 }
    );
  }

  await sendToSubscriptions(subscriptions, {
    title: "Notification d'essai",
    body: "Tout fonctionne : les commandes arriveront ici.",
    tag: "essai",
    url: "/gestion/notifications",
    event: "essai",
  });
  return NextResponse.json({ ok: true });
}
