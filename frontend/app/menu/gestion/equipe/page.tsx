"use client";

import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { FeatureLocked } from "@/components/gestion/feature-locked";
import { ChevronDownIcon, TrashIcon } from "@/components/gestion/icons";
import { BadgeagesLog } from "@/components/gestion/temps/badgeages-log";
import { Badgeuse } from "@/components/gestion/temps/badgeuse";
import { PlanningGrid, WeekNav } from "@/components/gestion/temps/planning";
import { RoleCards } from "@/components/gestion/temps/role-cards";
import { StaffList } from "@/components/gestion/temps/staff-list";
import { Chip, ConfirmSheet, ErrorNotice, Field, GlassButton, Input, Notice, Plate, ReserveGerant, SectionHeading, Segmented, Sheet, Shimmer } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import { describeError } from "@/lib/gestion/errors";
import { DEFAULT_DAY_END_HOUR } from "@/lib/gestion/constants";
import { isPickupShop, roleLabels } from "@/lib/gestion/selectors";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import { weekStart } from "@/lib/gestion/temps";
import { useOpenEntries, useWeek } from "@/lib/gestion/use-week";
import type { Role } from "@/lib/gestion/types";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

/*
 * Équipe (gérant) : qui travaille ici et ce que chacun peut faire. Les
 * membres d'abord, l'invitation dans une feuille ; le rôle se choisit sur
 * trois cartes qui disent ce qu'il ouvre. Le planning et le pointage ont
 * leur volet quand le restaurant les a.
 */

function Block({ i, className = "", children }: { i: number; className?: string; children: ReactNode }) {
  return (
    <div className={`g-rise ${className}`} style={{ "--g-i": i } as CSSProperties}>
      {children}
    </div>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20a6 6 0 0112 0M16 4.5a3.5 3.5 0 010 7M21 20a6 6 0 00-4-5.7" />
    </svg>
  );
}

function InviteSheet({
  etablissementId,
  onClose,
  onSent,
}: {
  etablissementId: string;
  onClose: () => void;
  onSent: () => Promise<void>;
}) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("serveur");
  const [busy, setBusy] = useState(false);

  const invite = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const address = email.trim().toLowerCase();
      const response = await fetch("/api/gestion/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ etablissement_id: etablissementId, email: address, role }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      // L'invitation existe : la feuille se ferme et le gérant le sait, même
      // si la relecture de la liste échoue ensuite.
      if (result.email_sent === false) {
        toast.error(
          `Invitation enregistrée, mais l'email n'a pas pu être envoyé : ${result.email_error ?? "erreur inconnue"}. Annulez-la puis invitez de nouveau.`,
        );
      } else {
        toast.success(`Invitation envoyée à ${address}.`);
      }
      onClose();
      onSent().catch((error: unknown) => toast.error(describeError(error).message));
    } catch (error) {
      toast.error(
        describeError(error).message
      );
      setBusy(false);
    }
  };

  return (
    <Sheet
      title="Inviter un membre"
      onClose={onClose}
      footer={
        <>
          {!email.trim() && <p role="status">Indiquez son email pour inviter.</p>}
          <GlassButton onClick={onClose}>Annuler</GlassButton>
          <GlassButton variant="primary" type="submit" form="invite-form" disabled={busy || !email.trim()}>
            {busy ? "Envoi…" : "Envoyer l'invitation"}
          </GlassButton>
        </>
      }
    >
      <form id="invite-form" onSubmit={invite} className="flex flex-col gap-4">
        <Field
          label="Email"
          required
          hint="Il reçoit un email qui nomme son rôle, et rejoint l'équipe une fois l'invitation acceptée."
        >
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            data-autofocus
            autoComplete="off"
            autoCapitalize="none"
          />
        </Field>
        <Field label="Rôle">
          <RoleCards value={role} onChange={setRole} disabled={busy} />
        </Field>
      </form>
    </Sheet>
  );
}

function RoleSheet({
  member,
  onClose,
  onChoose,
}: {
  member: Tables<"memberships">;
  onClose: () => void;
  onChoose: (role: Role) => Promise<void>;
}) {
  const [role, setRole] = useState<Role>(member.role);
  const [busy, setBusy] = useState(false);
  return (
    <Sheet
      title={`Rôle de ${member.display_name ?? member.email}`}
      onClose={onClose}
      footer={
        <>
          {role === member.role && <p role="status">Choisissez un autre rôle pour changer.</p>}
          <GlassButton onClick={onClose}>Annuler</GlassButton>
          <GlassButton
            variant="primary"
            disabled={busy || role === member.role}
            onClick={() => {
              setBusy(true);
              void onChoose(role).finally(() => setBusy(false));
            }}
          >
            Changer le rôle
          </GlassButton>
        </>
      }
    >
      <RoleCards value={role} onChange={setRole} disabled={busy} label={`Rôle de ${member.email}`} />
    </Sheet>
  );
}

function TeamManager({ etablissementId }: { etablissementId: string }) {
  const toast = useToast();
  const state = useGestion();
  const roleLabel = roleLabels(state);
  const pickup = isPickupShop(state);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [members, setMembers] = useState<Tables<"memberships">[] | null>(null);
  const [invitations, setInvitations] = useState<Tables<"invitations">[]>([]);
  const [inviting, setInviting] = useState(false);
  const [changing, setChanging] = useState<Tables<"memberships"> | null>(null);
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

  // Faux positif : les setState de load() arrivent après des await
  // (réponse réseau), pas de façon synchrone dans l'effet.
  const reload = useCallback(() => {
    setLoadError(null);
    load().catch((error: unknown) => setLoadError(error));
  }, [load]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

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
      setChanging(null);
      toast.success(`${member.email} a maintenant le rôle ${roleLabel[role]}.`);
    } catch (error) {
      toast.error(
        describeError(error).message
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
        describeError(error).message
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
        describeError(error).message
      );
    }
  };

  const inviteButton = (
    <GlassButton variant="primary" data-visite="equipe-inviter" onClick={() => setInviting(true)}>
      Inviter un membre
    </GlassButton>
  );

  if (loadError) return <ErrorNotice error={loadError} onRetry={reload} />;
  if (!members) {
    return (
      <div aria-busy className="flex flex-col gap-3">
        <Shimmer className="h-16" />
        <Shimmer className="h-16" />
      </div>
    );
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-g-label text-muted">
            {members.length} membre{members.length > 1 ? "s" : ""} avec un compte.
          </p>
          {inviteButton}
        </div>
        <Plate className="divide-y divide-hairline px-4">
          {members.map((member) => {
            const isSelf = member.user_id === userId;
            return (
              <div
                key={member.user_id}
                className="flex min-h-g-control items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-g-label font-semibold">
                    {member.display_name ?? member.email}
                  </p>
                  {(member.display_name || isSelf) && (
                    <p className="truncate text-g-meta text-muted">
                      {[member.display_name ? member.email : null, isSelf ? "Vous" : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
                {isSelf ? (
                  <Chip>{roleLabel[member.role]}</Chip>
                ) : (
                  <div className="flex shrink-0 items-center gap-2">
                    <GlassButton
                      onClick={() => setChanging(member)}
                      aria-label={`Changer le rôle de ${member.email}, ${roleLabel[member.role]}`}
                    >
                      {roleLabel[member.role]}
                      <ChevronDownIcon />
                    </GlassButton>
                    <GlassButton
                      variant="icon"
                      onClick={() => setToRemove(member)}
                      title="Retirer de l'équipe"
                      aria-label={`Retirer ${member.email}`}
                    >
                      <TrashIcon />
                    </GlassButton>
                  </div>
                )}
              </div>
            );
          })}
        </Plate>
      </section>

      {invitations.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-g-h2">Invitations en attente</h2>
          <Plate className="divide-y divide-hairline border-dashed px-4">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex min-h-g-control items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-g-label font-semibold">{invitation.email}</p>
                  <p className="text-g-meta text-muted">
                    {roleLabel[invitation.role]} · en attente de sa réponse
                  </p>
                </div>
                <GlassButton onClick={() => void cancelInvitation(invitation)}>Annuler</GlassButton>
              </div>
            ))}
          </Plate>
        </section>
      )}

      {inviting && (
        <InviteSheet etablissementId={etablissementId} onClose={() => setInviting(false)} onSent={load} />
      )}
      {changing && (
        <RoleSheet
          member={changing}
          onClose={() => setChanging(null)}
          onChoose={(role) => changeRole(changing, role)}
        />
      )}
      {toRemove && (
        <ConfirmSheet
          title="Retirer ce membre ?"
          text={`${toRemove.email} perdra immédiatement l'accès à l'espace de gestion.`}
          confirmLabel="Retirer"
          destructive
          onConfirm={() => void removeMember(toRemove)}
          onClose={() => setToRemove(null)}
        />
      )}
    </div>
  );
}

const PANES = [
  { value: "membres", label: "Membres" },
  { value: "planning", label: "Planning" },
  { value: "pointage", label: "Pointage" },
] as const;

type PaneId = (typeof PANES)[number]["value"];

const PANE_TAGLINES: Record<PaneId, string> = {
  membres: "Vos cuisiniers et serveurs, et ce qu'ils peuvent faire.",
  planning: "Posez les créneaux de la semaine, membre par membre.",
  pointage: "Les arrivées et départs signés par l'équipe, et leurs heures.",
};

export default function EquipePage() {
  const state = useGestion();
  const { role, hasFeature } = useGestionAccess();
  const [pane, setPane] = useState<PaneId>("membres");
  // Semaine choisie aux flèches ; avant, celle en cours, qui attend l'heure
  // de bascule du restaurant (rien ne se charge tant que l'état manque).
  const [chosenStart, setStart] = useState<Date | null>(null);
  const start = chosenStart ?? weekStart(
    new Date(),
    state?.dayEndHour ?? DEFAULT_DAY_END_HOUR
  );
  const etablissementId = state?.etablissement.id ?? "";
  const { data, loading, reload } = useWeek(etablissementId, start);
  const open = useOpenEntries(etablissementId);

  const badged = () => {
    open.reload();
    reload();
  };

  if (!state) return null;
  if (!hasFeature("roles")) return <FeatureLocked feature="roles" />;
  // Badgeage et planning se retirent ensemble : un restaurant peut ne garder
  // de l'onglet Équipe que les accès.
  const panes = PANES.filter(
    (item) => item.value === "membres" || hasFeature("badgeage")
  );
  const active = panes.some((item) => item.value === pane) ? pane : "membres";
  // Deux façons de monter une équipe. Par défaut chacun a son compte et
  // reçoit une invitation ; ailleurs le gérant tape un prénom, et c'est le
  // lien de planning qui tient lieu d'accès.
  const sansComptes = hasFeature("equipe_sans_comptes");

  return (
    <div className="flex flex-col gap-6">
      <Block i={0}>
        <SectionHeading
          level={1}
          title="Équipe"
          sub={
            active === "membres" && isPickupShop(state)
              ? "Votre équipe, et ce que chacun peut faire."
              : PANE_TAGLINES[active]
          }
          right={
            role === "gerant" && panes.length > 1 ? (
              <div data-visite="equipe-volets" className="w-fit max-w-full rounded-full">
                <Segmented
                  label="Volet"
                  options={panes}
                  value={active}
                  onChange={(value) => setPane(value)}
                />
              </div>
            ) : undefined
          }
        />
      </Block>

      {/* Un seul bloc d'entrée : changer de volet ne relance pas la montée. */}
      <Block i={1} className="flex flex-col gap-6">
        {role !== "gerant" ? (
          <ReserveGerant ask="gérer les membres de l'équipe" />
        ) : active === "membres" ? (
          sansComptes ? (
            <>
              <Notice
                tone="info"
                icon={<PeopleIcon />}
                title="Votre équipe pointe avec un code, sans compte"
                text="Chacun lit son planning par son lien ; rien à installer ni à retenir."
              />
              <StaffList staff={state.staff} entries={data.entries} onChange={reload} />
            </>
          ) : (
            <TeamManager etablissementId={state.etablissement.id} />
          )
        ) : active === "planning" ? (
          <PlanningGrid
            etablissementId={state.etablissement.id}
            staff={state.staff}
            shifts={data.shifts}
            start={start}
            loading={loading}
            onWeekChange={setStart}
            onChange={reload}
          />
        ) : (
          <>
            <Badgeuse
              staff={state.staff}
              entries={open.entries}
              showHours
              onChange={badged}
            />
            <BadgeagesLog
              staff={state.staff}
              shifts={data.shifts}
              entries={data.entries}
              start={start}
              loading={loading}
              weekNav={<WeekNav start={start} onChange={setStart} />}
              onChange={reload}
            />
          </>
        )}
      </Block>
    </div>
  );
}
