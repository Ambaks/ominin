"use client";

import { useCallback, useEffect, useState } from "react";
import { FeatureLocked } from "@/components/gestion/feature-locked";
import { useToast } from "@/components/ui/toast";
import {
  playChime,
  setChimeEnabled,
  useChimeEnabled,
} from "@/lib/gestion/use-order-chime";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import {
  currentEndpoint,
  disablePush,
  enablePush,
  getPushStatus,
  listDevices,
  removeDevice,
  sendTestNotification,
  type DeviceSubscription,
  type PushStatus,
} from "@/lib/push/client";
import {
  PUSH_EVENTS,
  PUSH_EVENT_HINTS,
  PUSH_EVENT_LABELS,
} from "@/lib/push/events";
import { loadPrefs, savePrefs, type PrefValues } from "@/lib/push/prefs";

/*
 * Chaque membre règle ici ses notifications : activation de l'appareil
 * courant (Web Push), événements reçus (communs à ses appareils), carillon
 * sonore de l'onglet ouvert, et liste de ses appareils abonnés.
 */

const cardClass = "rounded-2xl border border-hairline bg-surface p-5 lg:p-6";

/** Étapes d'installation sur iPhone/iPad, prérequis du push sous iOS. */
const IOS_STEPS = [
  <>
    Touchez <strong>Partager</strong> dans Safari (le carré traversé d&rsquo;une
    flèche).
  </>,
  <>
    Choisissez <strong>« Sur l&rsquo;écran d&rsquo;accueil »</strong>.
  </>,
  <>
    Ouvrez <strong>Ominin</strong> depuis son icône, puis revenez sur cette
    page pour activer.
  </>,
];

function DeviceStatusCard({
  status,
  onChanged,
}: {
  status: PushStatus | null;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const act = async (action: () => Promise<void>, successMessage: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(successMessage);
      onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={cardClass}>
      <h2 className="font-display text-lg font-medium">Cet appareil</h2>
      {status === null ? (
        <div aria-busy className="shimmer mt-4 h-16 rounded-xl" />
      ) : status === "on" ? (
        <>
          <p className="mt-2 flex items-center gap-2 text-sm">
            <span className="size-2 rounded-full bg-ember-1" />
            Notifications activées sur cet appareil.
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Envoyez-vous un essai pour vérifier le son et l&rsquo;affichage.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void act(sendTestNotification, "Notification d'essai envoyée.")
              }
              className="rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground disabled:opacity-60"
            >
              Envoyer un essai
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void act(disablePush, "Notifications désactivées sur cet appareil.")
              }
              className="text-xs text-muted underline-offset-2 hover:underline disabled:opacity-60"
            >
              Désactiver sur cet appareil
            </button>
          </div>
        </>
      ) : status === "off" ? (
        <>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Recevez les nouvelles commandes, les plats prêts et les annulations
            sur cet appareil — écran verrouillé et téléphone en poche compris.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void act(enablePush, "Notifications activées sur cet appareil.")
            }
            className="ember-gradient mt-4 rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
          >
            {busy ? "Activation…" : "Activer les notifications"}
          </button>
        </>
      ) : status === "needs-install" ? (
        <>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Sur iPhone et iPad, les notifications demandent d&rsquo;abord
            d&rsquo;installer Ominin sur l&rsquo;écran d&rsquo;accueil&nbsp;:
          </p>
          <ol className="mt-4 flex flex-col gap-3">
            {IOS_STEPS.map((step, index) => (
              <li key={index} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-raised text-[11px] font-bold text-ember-1">
                  {index + 1}
                </span>
                <span className="leading-relaxed text-muted">{step}</span>
              </li>
            ))}
          </ol>
        </>
      ) : status === "denied" ? (
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Les notifications sont bloquées pour ce site. Autorisez-les dans les
          réglages de votre navigateur, puis revenez sur cette page.
        </p>
      ) : (
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Ce navigateur ne prend pas en charge les notifications. Utilisez
          Chrome, Edge ou Safari récent.
        </p>
      )}
    </section>
  );
}

function PrefsCard({
  etablissementId,
  role,
}: {
  etablissementId: string;
  role: "gerant" | "cuisinier" | "serveur";
}) {
  const toast = useToast();
  const [prefs, setPrefs] = useState<PrefValues | null>(null);

  useEffect(() => {
    loadPrefs(etablissementId, role)
      .then(setPrefs)
      .catch(() => toast.error("Chargement des préférences impossible."));
  }, [etablissementId, role, toast]);

  // Optimiste avec retour arrière : même idiome que les réglages de paiement.
  const toggle = async (event: (typeof PUSH_EVENTS)[number]) => {
    if (!prefs) return;
    const next = { ...prefs, [event]: !prefs[event] };
    setPrefs(next);
    try {
      await savePrefs(etablissementId, next);
    } catch {
      setPrefs(prefs);
      toast.error("Enregistrement impossible.");
    }
  };

  return (
    <section className={cardClass}>
      <h2 className="font-display text-lg font-medium">Ce que je reçois</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Vos choix valent pour tous vos appareils. Chaque membre de
        l&rsquo;équipe règle les siens.
      </p>
      <div className="mt-4 flex flex-col gap-4">
        {PUSH_EVENTS.map((event) => (
          <label
            key={event}
            className="flex cursor-pointer items-center justify-between gap-3"
          >
            <span>
              <span className="block text-sm font-medium">
                {PUSH_EVENT_LABELS[event]}
              </span>
              <span className="block text-xs text-faint">
                {PUSH_EVENT_HINTS[event]}
              </span>
            </span>
            {prefs ? (
              <input
                type="checkbox"
                checked={prefs[event]}
                onChange={() => void toggle(event)}
                className="size-5 accent-ember-2"
              />
            ) : (
              <span aria-busy className="shimmer size-5 rounded" />
            )}
          </label>
        ))}
      </div>
    </section>
  );
}

function ChimeCard() {
  const enabled = useChimeEnabled();

  return (
    <section className={cardClass}>
      <h2 className="font-display text-lg font-medium">Carillon</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Tant que l&rsquo;espace de gestion est ouvert sur cet appareil, chaque
        nouvelle commande sonne — idéal sur la tablette de la cuisine.
      </p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={enabled}
            onChange={() => setChimeEnabled(!enabled)}
            className="size-5 accent-ember-2"
          />
          <span className="text-sm font-medium">Carillon sonore</span>
        </label>
        <button
          type="button"
          onClick={() => playChime()}
          className="rounded-full border border-hairline px-4 py-2 text-xs font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
        >
          Écouter
        </button>
      </div>
    </section>
  );
}

function DevicesCard({
  devices,
  ownEndpoint,
  onRemoved,
}: {
  devices: DeviceSubscription[];
  ownEndpoint: string | null;
  onRemoved: () => void;
}) {
  const toast = useToast();
  if (!devices.length) return null;
  const added = (iso: string) =>
    new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const remove = async (id: string) => {
    try {
      await removeDevice(id);
      toast.success("Appareil retiré.");
      onRemoved();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    }
  };

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-lg font-medium">Mes appareils</h2>
      {devices.map((device) => (
        <div
          key={device.id}
          className="flex items-center justify-between gap-3 rounded-2xl border border-hairline bg-surface px-4 py-3"
        >
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-medium">
              <span className="truncate">
                {device.deviceLabel ?? "Appareil"}
              </span>
              {device.endpoint === ownEndpoint && (
                <span className="shrink-0 rounded-full border border-hairline px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ember-1">
                  Cet appareil
                </span>
              )}
            </p>
            <p className="text-xs text-faint">Ajouté le {added(device.createdAt)}</p>
          </div>
          <button
            type="button"
            onClick={() => void remove(device.id)}
            className="shrink-0 rounded-full border border-hairline px-4 py-2 text-xs font-semibold text-muted transition-colors hover:border-ember-3/50 hover:text-ember-3"
          >
            Retirer
          </button>
        </div>
      ))}
    </section>
  );
}

export default function NotificationsPage() {
  const state = useGestion();
  const { hasFeature } = useGestionAccess();
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [devices, setDevices] = useState<DeviceSubscription[]>([]);
  const [ownEndpoint, setOwnEndpoint] = useState<string | null>(null);

  const refresh = useCallback(() => {
    void getPushStatus().then(setStatus);
    void currentEndpoint().then(setOwnEndpoint);
    listDevices()
      .then(setDevices)
      .catch(() => {});
  }, []);
  useEffect(refresh, [refresh]);

  if (!state) return null;
  if (!hasFeature("commandes")) return <FeatureLocked />;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-medium tracking-tight lg:text-3xl">
          Notifications
        </h1>
        <p className="mt-1 text-sm text-muted">
          Soyez prévenu des commandes — même le téléphone en poche.
        </p>
      </div>
      <div className="flex max-w-xl flex-col gap-5">
        <DeviceStatusCard status={status} onChanged={refresh} />
        <PrefsCard etablissementId={state.etablissement.id} role={state.role} />
        <ChimeCard />
        <DevicesCard
          devices={devices}
          ownEndpoint={ownEndpoint}
          onRemoved={refresh}
        />
      </div>
    </div>
  );
}
