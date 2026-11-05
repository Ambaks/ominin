"use client";

import { useState } from "react";
import { AlertIcon } from "@/components/gestion/icons";
import { Chip, GlassButton, Plate, Shimmer } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import { describeError } from "@/lib/gestion/errors";
import {
  disablePush,
  enablePush,
  sendTestNotification,
  type PushStatus,
} from "@/lib/push/client";

/*
 * Cet appareil et les notifications push : l'activer, l'essayer, le couper,
 * ou dire pourquoi il ne peut pas sonner (iPhone sans l'app installée,
 * permission refusée, navigateur sans push). Commun aux Alertes d'un
 * restaurant et aux notifications des réservations d'un club : un même
 * abonnement sert aux deux.
 */

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

/**
 * Les erreurs de lib/push sont écrites pour l'écran (« Permission refusée… » :
 * le refus du navigateur, pas un droit du gérant) ; seul un échec réseau passe
 * par describeError.
 */
export const pushError = (error: unknown) =>
  error instanceof Error && !(error instanceof TypeError)
    ? error.message
    : describeError(error).message;

export function PushDevice({
  status,
  onChanged,
  pitch,
}: {
  status: PushStatus | null;
  onChanged: () => void;
  /** Ce que l'appareil recevra, dit avant de l'activer. */
  pitch: string;
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
      toast.error(pushError(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Plate
      data-visite="notifications-appareil"
      aria-busy={status === null}
      className="px-4 py-3.5"
    >
      {status === null ? (
        <Shimmer className="h-28 rounded-g-card" />
      ) : status === "on" ? (
        <>
          <p className="flex items-center gap-2 text-g-body font-semibold">
            <span className="size-2 shrink-0 rounded-full bg-ember-2" aria-hidden />
            Alertes activées sur cet appareil
          </p>
          <p className="mt-1 text-g-meta text-muted">
            Envoyez-vous un essai pour vérifier le son et l&rsquo;affichage.
          </p>
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <GlassButton
              disabled={busy}
              onClick={() =>
                void act(sendTestNotification, "Alerte d’essai envoyée.")
              }
            >
              Envoyer un essai
            </GlassButton>
            <GlassButton
              disabled={busy}
              onClick={() =>
                void act(disablePush, "Alertes désactivées sur cet appareil.")
              }
            >
              Désactiver sur cet appareil
            </GlassButton>
          </div>
        </>
      ) : status === "off" ? (
        <>
          <p className="text-g-body font-semibold">Cet appareil ne sonne pas encore</p>
          <p className="mt-1 text-g-meta text-muted">{pitch}</p>
          <GlassButton
            variant="primary"
            disabled={busy}
            onClick={() =>
              void act(enablePush, "Alertes activées sur cet appareil.")
            }
            data-visite="notifications-activer-appareil"
            className="mt-3.5"
          >
            {busy ? "Activation…" : "Activer les alertes"}
          </GlassButton>
        </>
      ) : status === "needs-install" ? (
        <>
          <p className="text-g-body font-semibold">Installez Ominin d&rsquo;abord</p>
          <p className="mt-1 text-g-meta text-muted">
            Sur iPhone et iPad, les alertes demandent l&rsquo;app sur
            l&rsquo;écran d&rsquo;accueil&nbsp;:
          </p>
          <ol className="mt-3 flex flex-col gap-2.5">
            {IOS_STEPS.map((step, index) => (
              <li key={index} className="flex items-start gap-3 text-g-body">
                <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-raised text-g-axis font-bold tabular-nums text-ember-2">
                  {index + 1}
                </span>
                <span className="text-muted">{step}</span>
              </li>
            ))}
          </ol>
        </>
      ) : status === "denied" ? (
        <>
          <Chip tone="problem" icon={<AlertIcon />}>
            Alertes bloquées par le navigateur
          </Chip>
          <p className="mt-2 text-g-meta text-muted">
            Touchez le cadenas à côté de l&rsquo;adresse (Chrome, Edge) ou
            ouvrez les réglages du site (Safari), autorisez les notifications,
            puis revenez ici.
          </p>
        </>
      ) : (
        <>
          <p className="text-g-body font-semibold">Navigateur sans alertes</p>
          <p className="mt-1 text-g-meta text-muted">
            Ouvrez l&rsquo;espace dans Chrome, Edge ou un Safari récent pour
            être prévenu.
          </p>
        </>
      )}
    </Plate>
  );
}
