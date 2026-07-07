"use client";

import { useCallback, useEffect, useState } from "react";
import { FeatureLocked } from "@/components/gestion/feature-locked";
import { TrashIcon } from "@/components/gestion/icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { ROLE_LABELS } from "@/lib/gestion/constants";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import type { Role } from "@/lib/gestion/types";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

const ROLES = Object.keys(ROLE_LABELS) as Role[];

function TeamManager({ etablissementId }: { etablissementId: string }) {
  const toast = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [members, setMembers] = useState<Tables<"memberships">[] | null>(null);
  const [invitations, setInvitations] = useState<Tables<"invitations">[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("serveur");
  const [busy, setBusy] = useState(false);
  const [toRemove, setToRemove] = useState<Tables<"memberships"> | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [userResult, membersResult, invitationsResult] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from("memberships")
        .select("*")
        .eq("etablissement_id", etablissementId)
        .order("created_at", { ascending: true }),
      supabase
        .from("invitations")
        .select("*")
        .eq("etablissement_id", etablissementId)
        .order("created_at", { ascending: true }),
    ]);
    if (membersResult.error) throw new Error(membersResult.error.message);
    if (invitationsResult.error)
      throw new Error(invitationsResult.error.message);
    setUserId(userResult.data.user?.id ?? null);
    setMembers(membersResult.data);
    setInvitations(invitationsResult.data);
  }, [etablissementId]);

  useEffect(() => {
    // Faux positif : les setState de load() arrivent après des await
    // (réponse réseau), pas de façon synchrone dans l'effet.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((error) =>
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      )
    );
    // toast est stable (contexte) ; on ne recharge que par établissement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const invite = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const supabase = createClient();
      const email = inviteEmail.trim().toLowerCase();
      const { error } = await supabase.from("invitations").insert({
        etablissement_id: etablissementId,
        email,
        role: inviteRole,
      });
      if (error) throw new Error(error.message);
      setInviteEmail("");
      await load();
      toast.success(`Invitation enregistrée pour ${email}.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (member: Tables<"memberships">, role: Role) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("memberships")
        .update({ role })
        .eq("user_id", member.user_id)
        .eq("etablissement_id", etablissementId);
      if (error) throw new Error(error.message);
      await load();
      toast.success(`${member.email} est maintenant ${ROLE_LABELS[role]}.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    }
  };

  const removeMember = async (member: Tables<"memberships">) => {
    setToRemove(null);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("memberships")
        .delete()
        .eq("user_id", member.user_id)
        .eq("etablissement_id", etablissementId);
      if (error) throw new Error(error.message);
      await load();
      toast.success(`${member.email} a été retiré de l'équipe.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    }
  };

  const cancelInvitation = async (invitation: Tables<"invitations">) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("invitations")
        .delete()
        .eq("id", invitation.id);
      if (error) throw new Error(error.message);
      await load();
      toast.success(`Invitation de ${invitation.email} annulée.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    }
  };

  if (!members) {
    return (
      <div aria-busy className="flex flex-col gap-3">
        <div className="shimmer h-16 rounded-2xl" />
        <div className="shimmer h-16 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex max-w-xl flex-col gap-8">
      <form
        onSubmit={invite}
        className="flex flex-col gap-4 rounded-2xl border border-hairline bg-surface p-5 lg:p-6"
      >
        <h2 className="font-display text-lg font-medium">Inviter un membre</h2>
        <Field
          label="Email"
          required
          hint="S'il a déjà un compte Ominin, il rejoint l'équipe immédiatement ; sinon l'accès s'activera à la création de son compte."
        >
          <input
            type="email"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Rôle">
          <select
            value={inviteRole}
            onChange={(event) => setInviteRole(event.target.value as Role)}
            className={inputClass}
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={busy}
            className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
          >
            Inviter
          </button>
        </div>
      </form>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-medium">Membres</h2>
        {members.map((member) => {
          const isSelf = member.user_id === userId;
          return (
            <div
              key={member.user_id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-hairline bg-surface px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{member.email}</p>
                {isSelf && <p className="text-xs text-faint">Vous</p>}
              </div>
              {isSelf ? (
                <span className="shrink-0 text-sm text-muted">
                  {ROLE_LABELS[member.role]}
                </span>
              ) : (
                <div className="flex shrink-0 items-center gap-2">
                  <select
                    value={member.role}
                    onChange={(event) =>
                      void changeRole(member, event.target.value as Role)
                    }
                    aria-label={`Rôle de ${member.email}`}
                    className="rounded-xl border border-hairline bg-background px-3 py-1.5 text-sm outline-none transition-colors focus:border-ember-2/50"
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setToRemove(member)}
                    title="Retirer de l'équipe"
                    aria-label={`Retirer ${member.email}`}
                    className="rounded-full border border-hairline p-2 text-muted transition-colors hover:border-ember-3/50 hover:text-ember-3"
                  >
                    <TrashIcon className="size-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </section>

      {invitations.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-medium">
            Invitations en attente
          </h2>
          {invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-hairline px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{invitation.email}</p>
                <p className="text-xs text-faint">
                  {ROLE_LABELS[invitation.role]}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void cancelInvitation(invitation)}
                className="shrink-0 text-sm text-muted transition-colors hover:text-ember-3"
              >
                Annuler
              </button>
            </div>
          ))}
        </section>
      )}

      {toRemove && (
        <ConfirmDialog
          title="Retirer ce membre ?"
          message={`${toRemove.email} perdra immédiatement l'accès à l'espace de gestion.`}
          confirmLabel="Retirer"
          destructive
          onConfirm={() => void removeMember(toRemove)}
          onClose={() => setToRemove(null)}
        />
      )}
    </div>
  );
}

export default function EquipePage() {
  const state = useGestion();
  const { role, hasFeature } = useGestionAccess();

  if (!state) return null;
  if (!hasFeature("roles")) return <FeatureLocked />;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-medium tracking-tight lg:text-3xl">
          Équipe
        </h1>
        <p className="mt-1 text-sm text-muted">
          Invitez vos cuisiniers et serveurs, gérez leurs accès.
        </p>
      </div>

      {role === "gerant" ? (
        <TeamManager etablissementId={state.etablissement.id} />
      ) : (
        <EmptyState
          title="Réservé au gérant"
          body="Seul le gérant peut gérer les membres de l'équipe."
        />
      )}
    </div>
  );
}
