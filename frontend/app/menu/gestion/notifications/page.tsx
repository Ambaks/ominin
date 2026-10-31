"use client";

import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { useClosureToggle } from "@/components/gestion/commandes/fermetures-bar";
import { FeatureLocked } from "@/components/gestion/feature-locked";
import {
  hubriseProblems,
  type HubriseStatus,
} from "@/components/gestion/hubrise-settings";
import {
  AlertIcon,
  BellIcon,
  CheckIcon,
  ClockIcon,
  CommandesIcon,
  PaymentsIcon,
  PrinterIcon,
} from "@/components/gestion/icons";
import {
  Chip,
  ErrorNotice,
  GlassButton,
  GlassFrame,
  Plate,
  SectionHeading,
  Shimmer,
  Switch,
} from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import { WAIT_TICK_MS } from "@/lib/gestion/constants";
import { describeError } from "@/lib/gestion/errors";
import {
  closureActive,
  closureUntil,
  describeTargets,
  serviceClock,
} from "@/lib/gestion/fermetures";
import { awaitsOnlinePayment } from "@/lib/gestion/selectors";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import type { GestionState } from "@/lib/gestion/types";
import { useNow } from "@/lib/gestion/use-now";
import {
  playChime,
  setChimeEnabled,
  useChimeEnabled,
} from "@/lib/gestion/use-order-chime";
import { usePrinterOffline } from "@/lib/gestion/use-printer-health";
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
  type PushEvent,
} from "@/lib/push/events";
import { loadPrefs, savePrefs, type PrefValues } from "@/lib/push/prefs";

/*
 * Alertes : le seul endroit où l'on apprend ce qui a besoin de soi (la
 * cloche a disparu, UX-SIMPLICITE § 3.10). En tête, un fil calme de ce qui
 * demande un geste — commandes arrivées sans que cet appareil sonne, boîtier
 * d'impression muet, compte de paiement à relier, HubRise en souffrance,
 * fermetures en cours. Dessous, comment on est prévenu : cet appareil (Web
 * Push), les événements reçus (communs à ses appareils), le carillon de
 * l'onglet ouvert, et la liste de ses appareils abonnés.
 */

function Block({
  i,
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLElement> & { i: number; children: ReactNode }) {
  return (
    <section
      {...props}
      className={`g-rise ${className}`}
      style={{ "--g-i": i } as CSSProperties}
    >
      {children}
    </section>
  );
}

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
const pushError = (error: unknown) =>
  error instanceof Error && !(error instanceof TypeError)
    ? error.message
    : describeError(error).message;

/** Pourquoi cet appareil reste muet, dans le fil. */
const APPAREIL_MUET: Record<Exclude<PushStatus, "on">, string> = {
  off: "Activez les alertes ci-dessous pour être prévenu écran en veille.",
  "needs-install": "Installez Ominin sur l’écran d’accueil, comme indiqué ci-dessous.",
  denied: "Le navigateur bloque les alertes : la marche à suivre est ci-dessous.",
  unsupported: "Ce navigateur ne permet pas les alertes : ouvrez l’espace dans Chrome, Edge ou Safari.",
};

interface Alerte {
  key: string;
  icon: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
}

function AlerteRow({ alerte }: { alerte: Alerte }) {
  return (
    <li className="flex min-h-(--g-step-h) flex-wrap items-center gap-x-3.5 gap-y-2 border-t border-hairline py-2.5 first:border-t-0">
      <span className="flex shrink-0 text-g-entity *:size-5">{alerte.icon}</span>
      <div className="min-w-0 flex-1 basis-3/5 wrap-anywhere">
        <p className="text-g-body font-semibold">{alerte.title}</p>
        <p className="text-g-meta text-muted">{alerte.text}</p>
      </div>
      {alerte.action && <span className="ml-auto flex shrink-0">{alerte.action}</span>}
    </li>
  );
}

/**
 * Le fil : chaque entrée vient d'une donnée déjà lue par l'espace (commandes
 * et fermetures du store, santé du boîtier, état HubRise), jamais d'un envoi.
 */
function Fil({
  state,
  pushStatus,
}: {
  state: GestionState;
  pushStatus: PushStatus | null;
}) {
  const { role, can, hasFeature } = useGestionAccess();
  const printerOffline = usePrinterOffline(state.etablissement.id);
  const now = useNow(WAIT_TICK_MS);
  const clock = serviceClock(now, state.dayEndHour);
  const { run, busy } = useClosureToggle(
    state.closures,
    state.categories,
    state.dayEndHour
  );
  const [hubrise, setHubrise] = useState<HubriseStatus | null>(null);
  const [hubriseRead, setHubriseRead] = useState<"attente" | "lu" | "echec">("attente");
  const watchHubrise = role === "gerant" && state.etablissement.hubriseConnected;
  useEffect(() => {
    if (!watchHubrise) return;
    fetch("/api/hubrise/connect")
      .then((response) => {
        if (!response.ok) throw new Error(`HubRise ${response.status}`);
        return response.json();
      })
      .then((body: HubriseStatus) => {
        setHubrise(body);
        setHubriseRead("lu");
      })
      .catch(() => setHubriseRead("echec"));
  }, [watchHubrise]);

  const alertes: Alerte[] = [];

  if (printerOffline) {
    alertes.push({
      key: "imprimante",
      icon: <PrinterIcon />,
      title: "Boîtier d’impression hors ligne",
      text: "Les tickets ne sortent pas : suivez les commandes à l’écran en attendant.",
      action: hasFeature("terminaux") ? (
        <GlassButton href="/gestion/terminaux">Imprimantes</GlassButton>
      ) : undefined,
    });
  }

  const nouvelles = state.orders.filter(
    (order) => order.status === "en_attente" && !awaitsOnlinePayment(order)
  ).length;
  if (nouvelles > 0 && pushStatus !== null && pushStatus !== "on") {
    alertes.push({
      key: "commandes",
      icon: <CommandesIcon />,
      title:
        nouvelles === 1
          ? "1 commande attend"
          : `${nouvelles} commandes attendent`,
      text: "Cet appareil n’a pas sonné : il n’est pas abonné aux alertes.",
      action: <GlassButton href="/gestion/commandes">Commandes</GlassButton>,
    });
  }

  const souffrance = hubriseProblems(hubrise);
  const blocked = hubrise?.connected === true && hubrise.blocked === true;
  if (blocked || souffrance > 0) {
    alertes.push({
      key: "hubrise",
      icon: <AlertIcon />,
      title: blocked
        ? "HubRise à renouveler"
        : souffrance === 1
          ? "1 commande non transmise à HubRise"
          : `${souffrance} commandes non transmises à HubRise`,
      text: blocked
        ? "HubRise a refusé notre accès : les commandes attendent dans Ominin."
        : "L’état de la connexion et le détail sont dans Réglages.",
      action: <GlassButton href="/gestion/etablissement#caisse">Réglages</GlassButton>,
    });
  } else if (watchHubrise && hubriseRead === "echec") {
    alertes.push({
      key: "hubrise",
      icon: <AlertIcon />,
      title: "État de HubRise illisible",
      text: "Impossible de le lire pour l’instant : vérifiez-le dans Réglages.",
      action: <GlassButton href="/gestion/etablissement#caisse">Réglages</GlassButton>,
    });
  }

  if (
    role === "gerant" &&
    state.etablissement.offre === "connect" &&
    !state.etablissement.onlinePayment
  ) {
    alertes.push({
      key: "paiement",
      icon: <PaymentsIcon />,
      title: "Compte de paiement à relier",
      text: "Vos clients règlent au comptoir tant qu’aucun compte n’est relié.",
      action: <GlassButton href="/gestion/etablissement#encaissement">Relier</GlassButton>,
    });
  }

  for (const closure of state.closures) {
    if (!closureActive(closure, clock, state.dayEndHour)) continue;
    alertes.push({
      key: `fermeture-${closure.id}`,
      icon: <ClockIcon />,
      title: `${closure.name} · jusqu’à ${closureUntil(closure, clock, state.dayEndHour)}`,
      text: describeTargets(closure, state.categories),
      action: can("fermetures.basculer") ? (
        <GlassButton
          disabled={busy === closure.id}
          onClick={() => void run(closure, false)}
          aria-label={`Rouvrir : ${closure.name}`}
        >
          Rouvrir
        </GlassButton>
      ) : undefined,
    });
  }

  if (pushStatus !== null && pushStatus !== "on") {
    alertes.push({
      key: "appareil",
      icon: <BellIcon />,
      title: "Cet appareil ne sonnera pas",
      text: APPAREIL_MUET[pushStatus],
    });
  }

  // Rien n'est dit « calme » tant que l'appareil et HubRise n'ont pas répondu.
  const reading = pushStatus === null || (watchHubrise && hubriseRead === "attente");
  const calme = alertes.length === 0;
  return (
    <GlassFrame
      entity={calme ? "orders" : "problem"}
      eyebrow={calme ? "À régler" : `À régler · ${alertes.length}`}
      icon={calme ? <CheckIcon /> : <AlertIcon />}
      className="g-rise [--g-i:1]"
    >
      {calme && reading ? (
        <Plate aria-busy className="px-4 py-3.5">
          <Shimmer className="h-5 w-2/3 rounded-full" />
        </Plate>
      ) : calme ? (
        <Plate className="px-4 py-3.5">
          <p className="text-g-body text-muted">
            Rien ne demande votre attention pour l’instant.
          </p>
        </Plate>
      ) : (
        <Plate className="px-4">
          <ul>
            {alertes.map((alerte) => (
              <AlerteRow key={alerte.key} alerte={alerte} />
            ))}
          </ul>
        </Plate>
      )}
    </GlassFrame>
  );
}

function Appareil({
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
      toast.error(pushError(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <SectionHeading
        title="Cet appareil"
        sub="Comment ce téléphone ou cet ordinateur vous prévient."
      />
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
            <p className="mt-1 text-g-meta text-muted">
              Recevez les nouvelles commandes, les plats prêts et les annulations
              — écran verrouillé et téléphone en poche compris.
            </p>
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
      <Carillon />
    </div>
  );
}

function Choix({
  etablissementId,
  role,
}: {
  etablissementId: string;
  role: GestionState["role"];
}) {
  const toast = useToast();
  const { hasFeature } = useGestionAccess();
  const [prefs, setPrefs] = useState<PrefValues | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  // Le bouton d'appel retiré, l'événement ne se produit plus : le régler
  // n'aurait aucun effet.
  const events = PUSH_EVENTS.filter(
    (event) => event !== "appel_serveur" || hasFeature("appel_serveur")
  );

  const load = useCallback(() => {
    loadPrefs(etablissementId, role)
      .then((values) => {
        setPrefs(values);
        setLoadError(null);
      })
      .catch(setLoadError);
  }, [etablissementId, role]);
  useEffect(load, [load]);

  // Optimiste avec retour arrière : même idiome que les réglages de paiement.
  const toggle = async (event: PushEvent, checked: boolean) => {
    if (!prefs) return;
    const next = { ...prefs, [event]: checked };
    setPrefs(next);
    setSaving(true);
    try {
      await savePrefs(etablissementId, next);
    } catch (error) {
      setPrefs((current) => current && { ...current, [event]: !checked });
      toast.error(describeError(error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <SectionHeading
        title="Ce que vous recevez"
        sub="Vos choix valent pour tous vos appareils. Chaque membre règle les siens."
        right={saving ? <Chip>Mise à jour…</Chip> : undefined}
      />
      {loadError ? (
        <ErrorNotice error={loadError} onRetry={load} />
      ) : (
        <Plate data-visite="notifications-choix" className="px-4">
          {events.map((event) => (
            <div key={event} className="border-t border-hairline py-1.5 first:border-t-0">
              {prefs ? (
                <Switch
                  label={PUSH_EVENT_LABELS[event]}
                  hint={PUSH_EVENT_HINTS[event]}
                  checked={prefs[event]}
                  onChange={(checked) => void toggle(event, checked)}
                />
              ) : (
                <div className="flex min-h-(--g-control) items-center justify-between gap-4">
                  <Shimmer className="h-4 w-2/3 rounded-full" />
                  <Shimmer className="h-(--g-switch-h) w-(--g-switch-w) rounded-full" />
                </div>
              )}
            </div>
          ))}
        </Plate>
      )}
    </div>
  );
}

function Carillon() {
  const enabled = useChimeEnabled();
  return (
    <Plate data-visite="notifications-carillon" className="px-4">
      <div className="py-1.5">
        <Switch
          label="Carillon à chaque commande"
          hint="Tant que l’espace est ouvert sur cet appareil : idéal sur la tablette de la cuisine."
          checked={enabled}
          onChange={setChimeEnabled}
        />
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-hairline py-2.5">
        <p className="text-g-meta text-muted">
          Le navigateur ne joue de son qu’après un premier geste sur l’écran.
        </p>
        <GlassButton onClick={() => void playChime()}>Écouter</GlassButton>
      </div>
    </Plate>
  );
}

function Appareils({
  devices,
  ownEndpoint,
  onRemoved,
}: {
  devices: DeviceSubscription[];
  ownEndpoint: string | null;
  onRemoved: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const added = (iso: string) =>
    new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const remove = async (id: string) => {
    setBusy(id);
    try {
      await removeDevice(id);
      toast.success("Appareil retiré.");
      onRemoved();
    } catch (error) {
      toast.error(pushError(error));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <SectionHeading
        title="Vos appareils"
        sub="Ceux qui reçoivent vos alertes pour cet établissement."
      />
      <Plate className="px-4">
        <ul aria-label="Appareils abonnés">
          {devices.map((device) => (
            <li
              key={device.id}
              className="flex min-h-(--g-step-h) items-center gap-3 border-t border-hairline py-2 first:border-t-0"
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-g-body font-semibold">
                  <span className="truncate" title={device.deviceLabel ?? undefined}>
                    {device.deviceLabel ?? "Appareil"}
                  </span>
                  {device.endpoint === ownEndpoint && <Chip>Cet appareil</Chip>}
                </p>
                <p className="text-g-meta text-muted">Ajouté le {added(device.createdAt)}</p>
              </div>
              <GlassButton
                disabled={busy === device.id}
                onClick={() => void remove(device.id)}
                aria-label={`Retirer : ${device.deviceLabel ?? "Appareil"}`}
              >
                Retirer
              </GlassButton>
            </li>
          ))}
        </ul>
      </Plate>
    </div>
  );
}

export default function AlertesPage() {
  const state = useGestion();
  const { hasFeature } = useGestionAccess();
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [devices, setDevices] = useState<DeviceSubscription[]>([]);
  const [ownEndpoint, setOwnEndpoint] = useState<string | null>(null);

  const refresh = useCallback(() => {
    getPushStatus()
      .then(setStatus)
      .catch(() => setStatus("unsupported"));
    void currentEndpoint().then(setOwnEndpoint);
    listDevices()
      .then(setDevices)
      .catch(() => {});
  }, []);
  useEffect(refresh, [refresh]);

  if (!state) return null;
  if (!hasFeature("commandes")) return <FeatureLocked feature="commandes" />;

  return (
    <div className="flex flex-col gap-g-gap">
      <Block i={0}>
        <SectionHeading
          level={1}
          title="Alertes"
          sub="Ce qui demande un geste, et comment cet appareil vous prévient."
        />
      </Block>
      <div className="grid gap-g-gap lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <div className="flex flex-col gap-g-gap">
          <section aria-label="À régler">
            <Fil state={state} pushStatus={status} />
          </section>
          <Block i={2}>
            <Appareil status={status} onChanged={refresh} />
          </Block>
        </div>
        <div className="flex flex-col gap-g-gap">
          <Block i={3}>
            <Choix etablissementId={state.etablissement.id} role={state.role} />
          </Block>
          {devices.length > 0 && (
            <Block i={4}>
              <Appareils devices={devices} ownEndpoint={ownEndpoint} onRemoved={refresh} />
            </Block>
          )}
        </div>
      </div>
    </div>
  );
}
