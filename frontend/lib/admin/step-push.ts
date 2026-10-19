import {
  isAssignee,
  isOwner,
  OWNER_LABELS,
  OWNERS,
  ownersOf,
  type Owner,
} from "@/lib/admin/owners";
import { notifyOwners } from "@/lib/admin/push";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Ce que le suivi du projet fait sonner. Le titre dit qui a fait quoi sur
 * quelle étape (c'est ce qu'on lit sur l'écran verrouillé), le corps donne
 * le contexte, et les boutons permettent de répondre sans ouvrir l'admin.
 */

export type StepEvent = "assigned" | "blocked" | "done";

/** Qui tient ce compte : l'identité choisie sur ses appareils notifiés. */
export async function ownerOfUser(userId: string): Promise<Owner | null> {
  const { data } = await createAdminClient()
    .from("admin_push_subscriptions")
    .select("owner")
    .eq("user_id", userId);
  const owners = [...new Set((data ?? []).map((row) => row.owner))];
  return owners.length === 1 && isOwner(owners[0]) ? owners[0] : null;
}

const firstLine = (text: string) => text.split("\n", 1)[0].trim();

/** Notifie un évènement sur une étape ; faux si l'étape n'existe pas. */
export async function notifyStepEvent(
  stepId: string,
  event: StepEvent,
  actorId: string,
  note?: string,
): Promise<boolean> {
  const db = createAdminClient();
  const { data: step } = await db
    .from("projet_steps")
    .select(
      "title, detail, owner, status, client_id, projet_clients (name), projet_chantiers (title)",
    )
    .eq("id", stepId)
    .maybeSingle();
  if (!step) return false;

  const actorOwner = await ownerOfUser(actorId);
  const actor = actorOwner ? OWNER_LABELS[actorOwner] : null;
  const where = step.projet_clients?.name ?? step.projet_chantiers?.title ?? "Projet";
  const url = step.client_id ? `/projet/${step.client_id}` : "/projet";
  const base = { tag: `etape-${stepId}`, url, step: stepId };

  if (event === "assigned" && isAssignee(step.owner)) {
    const title =
      step.owner === "both"
        ? `${actor ? `${actor} : à faire` : "À faire"} ensemble — ${step.title}`
        : `${actor ? `${actor} te confie` : "Pour toi"} : ${step.title}`;
    await notifyOwners(
      ownersOf(step.owner),
      {
        ...base,
        title,
        body: [where, firstLine(step.detail)].filter(Boolean).join(" · "),
        actions: ["done"],
      },
      actorId,
    );
  } else if (event === "blocked" && step.status === "blocked") {
    await notifyOwners(
      OWNERS,
      {
        ...base,
        title: `${actor ? `${actor} bloque` : "Bloqué"} : ${step.title}`,
        body: note ? `${note} (${where})` : where,
        actions: ["take", "unblock"],
      },
      actorId,
    );
  } else if (event === "done") {
    const { count } = step.client_id
      ? await db
          .from("projet_steps")
          .select("id", { count: "exact", head: true })
          .eq("client_id", step.client_id)
          .neq("status", "done")
      : { count: null };
    if (count === 0) {
      await notifyOwners(
        OWNERS,
        {
          title: `${where} est interfacé de bout en bout`,
          body: "Toutes les étapes de sa pipeline sont faites.",
          tag: `client-${step.client_id}`,
          url,
        },
        actorId,
      );
    } else if (step.owner === "both") {
      await notifyOwners(
        OWNERS,
        {
          ...base,
          title: `${actor ? `${actor} a fini` : "Fait"} : ${step.title}`,
          body: where,
        },
        actorId,
      );
    }
  }
  return true;
}
