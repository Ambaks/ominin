"use client";

import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { PushDevice } from "@/components/gestion/push-device";
import { NotifHistory } from "@/components/gestion/soirees/notif-history";
import { BackToSoirees, ClubLoadError, ClubLocked, ClubSkeleton } from "@/components/gestion/soirees/club-states";
import { Chip, ErrorNotice, GlassButton, Plate, SectionHeading, Sheet, Shimmer, Switch } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import { droitsOf, POSTE_LABELS } from "@/lib/club/droits";
import {
  CLUB_NOTIF_DEFAULTS,
  NOTIF_PREF_HINTS,
  NOTIF_PREF_LABELS,
  NOTIF_PREFS,
  type NotifPref,
  type NotifPrefs,
} from "@/lib/club/notifications";
import { loadClubNotifs, saveClubNotifs, type MemberNotifs } from "@/lib/gestion/club-notifications";
import { useClub, useClubLoadError } from "@/lib/gestion/club-store";
import { describeError } from "@/lib/gestion/errors";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import { getPushStatus, type PushStatus } from "@/lib/push/client";

/*
 * Les notifications des réservations d'un club (cahier de L'Étoile, étape 4).
 * Cet appareil (le même abonnement push que les Alertes d'un restaurant), ce
 * que l'on reçoit — pour la direction, ce que reçoit chaque membre de
 * l'équipe, à défaut les choix de son poste —, et l'historique de ce qui a
 * été envoyé, chaque ligne ouvrant la réservation sur le plan du soir.
 */

function Block({ i, className = "", children }: { i: number; className?: string; children: ReactNode }) {
  return (
    <section className={`g-rise flex flex-col gap-3 ${className}`} style={{ "--g-i": i } as CSSProperties}>
      {children}
    </section>
  );
}

/** Les quatre interrupteurs d'un membre, enregistrés à chaque geste. */
function PrefSwitches({ prefs, onToggle }: { prefs: NotifPrefs; onToggle: (pref: NotifPref, on: boolean) => void }) {
  return (
    <>
      {NOTIF_PREFS.map((pref) => (
        <div key={pref} className="border-t border-hairline py-1.5 first:border-t-0">
          <Switch
            label={NOTIF_PREF_LABELS[pref]}
            hint={NOTIF_PREF_HINTS[pref]}
            checked={prefs[pref]}
            onChange={(on) => onToggle(pref, on)}
          />
        </div>
      ))}
    </>
  );
}

const summary = (prefs: NotifPrefs) => {
  const on = NOTIF_PREFS.filter((pref) => prefs[pref]).map((pref) => NOTIF_PREF_LABELS[pref].toLowerCase());
  return on.length === 0 ? "Ne reçoit rien" : on.length === NOTIF_PREFS.length ? "Reçoit tout" : `Reçoit : ${on.join(", ")}`;
};

/** Le membre ouvert par la direction : ses quatre choix, et le retour aux défauts de son poste. */
function MemberSheet({
  member,
  onSave,
  onClose,
}: {
  member: MemberNotifs;
  onSave: (prefs: NotifPrefs) => void;
  onClose: () => void;
}) {
  const defaults = member.poste ? CLUB_NOTIF_DEFAULTS[member.poste] : null;
  return (
    <Sheet
      title={member.name}
      description={
        member.poste
          ? `${POSTE_LABELS[member.poste]} · ${member.saved ? "choix enregistrés" : "choix du poste"}`
          : "Sans poste au club"
      }
      onClose={onClose}
      footer={
        defaults && member.saved ? (
          <GlassButton onClick={() => onSave(defaults)}>Revenir aux choix du poste</GlassButton>
        ) : undefined
      }
    >
      <Plate className="px-4">
        <PrefSwitches prefs={member.prefs} onToggle={(pref, on) => onSave({ ...member.prefs, [pref]: on })} />
      </Plate>
    </Sheet>
  );
}

export default function ClubNotificationsPage() {
  const state = useGestion();
  const { hasFeature, role } = useGestionAccess();
  const club = useClub();
  const error = useClubLoadError();
  const toast = useToast();
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [members, setMembers] = useState<MemberNotifs[] | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const etablissementId = state?.etablissement.id;
  const userId = state?.userId;
  const direction = role === "gerant";

  const refreshDevice = useCallback(() => {
    getPushStatus()
      .then(setStatus)
      .catch(() => setStatus("unsupported"));
  }, []);
  useEffect(refreshDevice, [refreshDevice]);

  const load = useCallback(() => {
    if (!etablissementId || !userId) return;
    loadClubNotifs(etablissementId, userId, direction)
      .then((rows) => {
        setMembers(rows);
        setLoadError(null);
      })
      .catch(setLoadError);
  }, [etablissementId, userId, direction]);
  useEffect(load, [load]);

  if (!state) return null;
  if (!hasFeature("soirees")) return <ClubLocked />;
  if (!club) return error ? <ClubLoadError message={error} /> : <ClubSkeleton />;

  const money = droitsOf(state.role, club.clubRole, club.droits).has("acomptes");
  const own = members?.find((member) => member.userId === state.userId);
  const opened = members?.find((member) => member.userId === open);

  // Optimiste avec retour arrière, comme les préférences des Alertes.
  const save = async (member: MemberNotifs, prefs: NotifPrefs) => {
    const before = members;
    setMembers((current) =>
      current?.map((entry) => (entry.userId === member.userId ? { ...entry, prefs, saved: true } : entry)) ?? null
    );
    setSaving(true);
    try {
      await saveClubNotifs(state.etablissement.id, member.userId, prefs);
    } catch (failure) {
      setMembers(before);
      toast.error(describeError(failure).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="soirees-page flex flex-col gap-g-gap">
      <div className="g-rise flex flex-col gap-2" style={{ "--g-i": 0 } as CSSProperties}>
        <BackToSoirees />
        <SectionHeading
          level={1}
          title="Notifications"
          sub="Les réservations qui arrivent, changent ou s'annulent, sur votre téléphone même fermé."
        />
      </div>

      <div className="grid gap-g-gap lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <div className="flex flex-col gap-g-gap lg:col-start-2 lg:row-start-1">
          <Block i={2}>
            <SectionHeading title="Cet appareil" sub="Un même appareil sonne pour tout ce que vous recevez." />
            <PushDevice
              status={status}
              onChanged={refreshDevice}
              pitch="Recevez les réservations confirmées, saisies, payées ou annulées — écran verrouillé et téléphone en poche compris."
            />
          </Block>

          <Block i={3}>
            <SectionHeading
              title={direction ? "Qui reçoit quoi" : "Ce que vous recevez"}
              sub={
                direction
                  ? "Chaque membre reçoit les choix de son poste, sauf si vous les changez ici."
                  : "Vos choix valent pour tous vos appareils."
              }
              right={saving ? <Chip>Mise à jour…</Chip> : undefined}
            />
            {loadError ? (
              <ErrorNotice error={loadError} onRetry={load} />
            ) : !members ? (
              <Plate aria-busy className="px-4 py-3.5">
                <Shimmer className="h-32 rounded-g-card" />
              </Plate>
            ) : direction ? (
              <Plate className="px-4">
                <ul aria-label="L'équipe">
                  {members.map((member) => (
                    <li
                      key={member.userId}
                      className="flex min-h-(--g-step-h) items-center gap-3 border-t border-hairline py-2.5 first:border-t-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 text-g-body font-semibold">
                          <span className="truncate">{member.name}</span>
                          {member.poste && <Chip>{POSTE_LABELS[member.poste]}</Chip>}
                        </p>
                        <p className="text-g-meta text-muted">{summary(member.prefs)}</p>
                      </div>
                      <GlassButton onClick={() => setOpen(member.userId)} aria-label={`Régler : ${member.name}`}>
                        Régler
                      </GlassButton>
                    </li>
                  ))}
                </ul>
              </Plate>
            ) : own ? (
              <Plate className="px-4">
                <PrefSwitches prefs={own.prefs} onToggle={(pref, on) => void save(own, { ...own.prefs, [pref]: on })} />
              </Plate>
            ) : null}
          </Block>
        </div>

        <Block i={4} className="lg:col-start-1 lg:row-start-1">
          <SectionHeading
            title="Historique"
            sub={direction ? "Tout ce qui a été envoyé à l'équipe." : "Ce qui vous a été envoyé."}
          />
          <NotifHistory etablissementId={state.etablissement.id} money={money} />
        </Block>
      </div>

      {opened && (
        <MemberSheet member={opened} onSave={(prefs) => void save(opened, prefs)} onClose={() => setOpen(null)} />
      )}
    </div>
  );
}
