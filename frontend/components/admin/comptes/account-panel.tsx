"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import {
  ACCESS_KIND_LABELS,
  ROLE_OPTIONS,
  accessSummary,
  accountLabel,
  eventLabel,
  fetchAccountEvents,
  fetchScopes,
  isRoleAccess,
  isSuspended,
  runAccountAction,
  type Account,
  type AccountAction,
  type AccountEvent,
  type RoleAccess,
  type RoleKind,
  type Scope,
} from "@/lib/admin/comptes";
import { formatDayTime } from "@/lib/admin/format";

const OUTLINE_BUTTON =
  "rounded-full border border-hairline px-4 py-2 text-sm font-semibold text-muted transition-colors hover:text-foreground disabled:opacity-50";

interface Pending {
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  action: AccountAction;
}

/** Une action sensible attend confirmation ; toutes finissent par recharger la fiche. */
export function AccountPanel({
  account,
  isSelf,
  onChanged,
  onClose,
}: {
  account: Account;
  isSelf: boolean;
  onChanged: () => Promise<void>;
  onClose: () => void;
}) {
  const toast = useToast();
  const [events, setEvents] = useState<AccountEvent[] | null>(null);
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [pending, setPending] = useState<Pending | null>(null);
  const [newScope, setNewScope] = useState("");
  const [newRole, setNewRole] = useState("");
  const [busy, setBusy] = useState(false);

  const label = accountLabel(account);
  const suspended = isSuspended(account);
  const roles = account.access.filter(isRoleAccess);
  const others = account.access.filter((access) => !isRoleAccess(access));
  const scope = scopes.find((candidate) => candidate.id === newScope);
  const available = scopes.filter(
    (candidate) => !roles.some((access) => access.id === candidate.id)
  );

  useEffect(() => {
    let alive = true;
    Promise.all([fetchAccountEvents(account.user_id), fetchScopes()])
      .then(([nextEvents, nextScopes]) => {
        if (!alive) return;
        setEvents(nextEvents);
        setScopes(nextScopes);
      })
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : "Une erreur est survenue.")
      );
    return () => {
      alive = false;
    };
    // toast est stable (contexte) ; le journal suit le compte ouvert.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account.user_id]);

  const execute = async (action: AccountAction, done: string) => {
    setBusy(true);
    try {
      const journalFailed = await runAccountAction(action);
      await onChanged();
      setEvents(await fetchAccountEvents(account.user_id));
      toast.success(done);
      if (journalFailed) toast.error("Fait, mais non annoncé dans #journal : Discord n'a pas répondu.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  };

  const changeRole = (access: RoleAccess, role: string) =>
    void execute(
      { type: "access", userId: account.user_id, kind: access.kind, scopeId: access.id, role },
      "Rôle modifié."
    );

  const addAccess = () => {
    if (!scope || !newRole) return;
    void execute(
      { type: "access", userId: account.user_id, kind: scope.kind as RoleKind, scopeId: scope.id, role: newRole },
      "Accès ajouté."
    );
    setNewScope("");
    setNewRole("");
  };

  return (
    <>
      <Modal title={label} onClose={onClose}>
        <div className="flex flex-col gap-6">
          <p className="text-xs text-muted">
            {account.email && account.phone ? `${account.phone} · ` : ""}
            Créé le {new Date(account.created_at).toLocaleDateString("fr-FR")}
            {suspended ? " · Compte suspendu" : ""}
          </p>

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Rôles</h3>
            {roles.length === 0 && (
              <p className="text-sm text-muted">Aucun restaurant ni boutique.</p>
            )}
            {roles.map((access) => (
              <div
                key={access.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-hairline p-3"
              >
                <div className="min-w-40 flex-1">
                  <p className="text-sm font-medium">
                    {access.name}
                    {access.demo ? " (démo)" : ""}
                  </p>
                  <p className="text-xs text-muted">{accessSummary(access)}</p>
                </div>
                <select
                  aria-label={`Rôle dans ${access.name}`}
                  value={access.role}
                  disabled={busy || isSelf}
                  onChange={(event) => changeRole(access, event.target.value)}
                  className={`${inputClass} w-auto`}
                >
                  {ROLE_OPTIONS[access.kind].map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={busy || isSelf}
                  onClick={() =>
                    setPending({
                      title: "Retirer cet accès ?",
                      message: `${label} n'aura plus accès à ${access.name}.`,
                      confirmLabel: "Retirer",
                      destructive: true,
                      action: { type: "access", userId: account.user_id, kind: access.kind, scopeId: access.id, role: null },
                    })
                  }
                  className={OUTLINE_BUTTON}
                >
                  Retirer
                </button>
              </div>
            ))}
          </section>

          {!isSelf && (
            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold">Ajouter un accès</h3>
              <Field label="Restaurant ou boutique">
                <select
                  value={newScope}
                  onChange={(event) => {
                    setNewScope(event.target.value);
                    setNewRole("");
                  }}
                  className={inputClass}
                >
                  <option value="">Choisir…</option>
                  {available.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name} ({ACCESS_KIND_LABELS[candidate.kind as RoleKind]})
                    </option>
                  ))}
                </select>
              </Field>
              {scope && (
                <Field label="Rôle">
                  <select
                    value={newRole}
                    onChange={(event) => setNewRole(event.target.value)}
                    className={inputClass}
                  >
                    <option value="">Choisir…</option>
                    {ROLE_OPTIONS[scope.kind as RoleKind].map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <button
                type="button"
                disabled={busy || !scope || !newRole}
                onClick={addAccess}
                className={`${OUTLINE_BUTTON} self-start`}
              >
                Ajouter
              </button>
            </section>
          )}

          {others.length > 0 && (
            <section className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold">Autres accès</h3>
              <p className="text-sm text-muted">{others.map(accessSummary).join(" · ")}</p>
              <p className="text-xs text-faint">
                Gérés par leur contrat ou leur activation, depuis leurs propres
                écrans.
              </p>
            </section>
          )}

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Actions sur le compte</h3>
            {isSelf ? (
              <p className="text-sm text-muted">
                C&apos;est votre compte : ces actions se font depuis un autre
                compte admin.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  className={OUTLINE_BUTTON}
                  onClick={() =>
                    setPending({
                      title: account.is_admin
                        ? "Retirer l'accès admin ?"
                        : "Donner l'accès admin ?",
                      message: account.is_admin
                        ? `${label} ne pourra plus ouvrir l'admin.`
                        : `${label} verra toute l'admin : clients, comptes et finances.`,
                      confirmLabel: account.is_admin ? "Retirer" : "Donner l'accès",
                      destructive: account.is_admin,
                      action: { type: "admin", userId: account.user_id, admin: !account.is_admin },
                    })
                  }
                >
                  {account.is_admin ? "Retirer l'accès admin" : "Donner l'accès admin"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className={OUTLINE_BUTTON}
                  onClick={() =>
                    setPending({
                      title: suspended ? "Réactiver ce compte ?" : "Suspendre ce compte ?",
                      message: suspended
                        ? `${label} pourra de nouveau se connecter.`
                        : `${label} ne pourra plus se connecter. Une session déjà ouverte s'arrête à l'expiration de son jeton.`,
                      confirmLabel: suspended ? "Réactiver" : "Suspendre",
                      destructive: !suspended,
                      action: { type: "suspend", userId: account.user_id, suspended: !suspended },
                    })
                  }
                >
                  {suspended ? "Réactiver" : "Suspendre"}
                </button>
              </div>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Journal</h3>
            {events === null ? (
              <div aria-busy className="shimmer h-12 rounded-xl" />
            ) : events.length === 0 ? (
              <p className="text-sm text-muted">Aucune action enregistrée.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {events.map((event) => (
                  <li key={event.id} className="text-sm">
                    {eventLabel(event)}
                    <span className="block text-xs text-faint">
                      {formatDayTime(event.created_at)} · {event.actor_email}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </Modal>

      {pending && (
        <ConfirmDialog
          title={pending.title}
          message={pending.message}
          confirmLabel={pending.confirmLabel}
          destructive={pending.destructive}
          onClose={() => setPending(null)}
          onConfirm={() => {
            setPending(null);
            void execute(pending.action, "C'est fait.");
          }}
        />
      )}
    </>
  );
}
