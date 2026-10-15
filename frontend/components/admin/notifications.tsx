"use client";

import { useEffect, useState } from "react";
import { BellIcon } from "@/components/gestion/icons";
import { Modal } from "@/components/ui/modal";
import { useRunMutation } from "@/components/ui/toast";
import { PUSH_OWNER_STORAGE_KEY } from "@/lib/admin/constants";
import { isOwner, OWNER_LABELS, OWNERS, type Owner } from "@/lib/admin/owners";
import {
  disablePush,
  enablePush,
  getPushStatus,
  type PushStatus,
  type PushTarget,
} from "@/lib/push/client";

/*
 * Notifications de l'admin sur cet appareil : « qui je suis » (les tâches
 * confiées à cette personne lui arrivent), puis l'abonnement Web Push. Sur
 * iPhone, Safari n'offre le push qu'à l'app installée sur l'écran d'accueil.
 */

const API = "/api/admin/push/subscriptions";
const BUTTON =
  "rounded-full border border-hairline px-4 py-2 text-sm font-semibold text-muted transition-colors hover:text-foreground";
const PRIMARY =
  "ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-50";

function readOwner(): Owner | null {
  try {
    const value = window.localStorage.getItem(PUSH_OWNER_STORAGE_KEY);
    return isOwner(value) ? value : null;
  } catch {
    return null;
  }
}

function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const run = useRunMutation();
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [owner, setOwner] = useState<Owner | null>(readOwner);
  const target = (who: Owner): PushTarget => ({ api: API, extra: { owner: who } });

  useEffect(() => {
    void getPushStatus().then(setStatus);
  }, []);

  const choose = (who: Owner) => {
    setOwner(who);
    try {
      window.localStorage.setItem(PUSH_OWNER_STORAGE_KEY, who);
    } catch {
      // Navigation privée : le choix vaut pour la session.
    }
  };

  return (
    <Modal title="Notifications" onClose={onClose}>
      <div className="flex flex-col gap-4 text-sm">
        {status === "needs-install" ? (
          <div className="flex flex-col gap-2 text-muted">
            <p>Sur iPhone, les notifications n&apos;arrivent qu&apos;à l&apos;app installée :</p>
            <ol className="list-decimal pl-5">
              <li>Dans Safari, touchez Partager (le carré avec la flèche).</li>
              <li>« Sur l&apos;écran d&apos;accueil », puis Ajouter.</li>
              <li>Ouvrez l&apos;admin depuis la nouvelle icône, et revenez ici.</li>
            </ol>
          </div>
        ) : status === "unsupported" ? (
          <p className="text-muted">Ce navigateur ne permet pas les notifications.</p>
        ) : status === "denied" ? (
          <p className="text-muted">
            Les notifications sont refusées pour ce site : autorisez-les dans les
            réglages du navigateur (sur iPhone : Réglages → Notifications → Admin).
          </p>
        ) : status === null ? (
          <div aria-busy className="shimmer h-24 rounded-xl" />
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <p className="text-muted">Cet appareil est celui de :</p>
              <div className="flex gap-2">
                {OWNERS.map((who) => (
                  <button
                    key={who}
                    type="button"
                    onClick={() => choose(who)}
                    aria-pressed={owner === who}
                    className={`flex-1 rounded-xl border px-4 py-3 font-semibold ${
                      owner === who
                        ? "border-ember-2/60 text-foreground"
                        : "border-hairline text-muted"
                    }`}
                  >
                    {OWNER_LABELS[who]}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-faint">
              Vous recevez : les tâches qu&apos;on vous confie, les étapes bloquées,
              un client interfacé de bout en bout, et le point du matin (ce qui vous
              attend, chaque jour à 8 h 30).
            </p>
            {status === "on" ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!owner}
                  onClick={() =>
                    void run(async () => {
                      // Réenregistre l'appareil au nom choisi, puis envoie l'essai.
                      await enablePush(target(owner!));
                      const response = await fetch(API, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ owner }),
                      });
                      if (!response.ok) throw new Error("Envoi de l'essai impossible.");
                    }, "Notification d'essai envoyée")
                  }
                  className={PRIMARY}
                >
                  Envoyer un essai
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void run(async () => {
                      await disablePush({ api: API });
                      setStatus(await getPushStatus());
                    }, "Notifications désactivées sur cet appareil")
                  }
                  className={BUTTON}
                >
                  Désactiver
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={!owner}
                onClick={() =>
                  void run(async () => {
                    await enablePush(target(owner!));
                    setStatus(await getPushStatus());
                  }, "Notifications activées sur cet appareil")
                }
                className={`${PRIMARY} self-start`}
              >
                Activer les notifications
              </button>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

export function NotificationsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Notifications"
        aria-label="Notifications"
        className="rounded-full border border-hairline p-2 text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
      >
        <BellIcon className="size-3.5" />
      </button>
      {open && <NotificationsPanel onClose={() => setOpen(false)} />}
    </>
  );
}
