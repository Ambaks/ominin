"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { setOnlinePayment, setPaymentProvider } from "@/lib/gestion/api";

/*
 * Réglage « paiement à table en ligne » (gérant). Deux encaisseurs possibles,
 * au choix de l'établissement : Stripe, dont le compte Express se crée par
 * l'onboarding hébergé, ou Square, dont le restaurant relie SON compte
 * existant — dans les deux cas l'argent des additions lui va directement.
 * Le choix se verrouille visuellement dès qu'un compte est relié ; le gérant
 * peut le rouvrir via « Changer d'encaisseur » — la bascule coupe le
 * paiement par carte et le rallume si le nouveau fournisseur peut déjà
 * encaisser (compte relié + vérification faite / point de vente choisi).
 * SumUp attend
 * l'activation de son scope « payments » : ses routes restent en place, il
 * n'est plus proposé.
 *
 * Au retour d'un onboarding, le statut est relu chez le fournisseur et le
 * paiement par carte s'active de lui-même si le compte peut encaisser — le
 * gérant a fait tout ce parcours précisément pour ça.
 */

type Provider = "stripe" | "square";

interface StripeStatus {
  connected: boolean;
  chargesEnabled: boolean;
}

interface SquareLocation {
  id: string;
  name: string;
  address?: { address_line_1?: string; locality?: string };
}

interface SquareStatus {
  connected: boolean;
  locationId?: string | null;
  locations?: SquareLocation[];
}

const NO_STRIPE: StripeStatus = { connected: false, chargesEnabled: false };
const NO_SQUARE: SquareStatus = { connected: false };

/** Paramètre posé par les URLs de retour d'un fournisseur, lu une fois puis retiré. */
function takeReturn(provider: Provider): string | null {
  const url = new URL(window.location.href);
  const value = url.searchParams.get(provider);
  if (value === null) return null;
  url.searchParams.delete(provider);
  window.history.replaceState(null, "", url);
  return value;
}

async function readStatus<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(path);
    const body = (await response.json()) as T & { error?: string };
    return body.error ? fallback : body;
  } catch {
    return fallback;
  }
}

export function PaymentSettings({
  initialEnabled,
  initialProvider,
}: {
  initialEnabled: boolean;
  /** Fournisseur enregistré ; non décidé ⇒ Stripe (historique). */
  initialProvider: Provider;
}) {
  const toast = useToast();
  const [stripe, setStripe] = useState<StripeStatus | null>(null);
  const [square, setSquare] = useState<SquareStatus | null>(null);
  const [provider, setProvider] = useState<Provider>(initialProvider);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [busy, setBusy] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [providerBeforeSwitch, setProviderBeforeSwitch] =
    useState<Provider>(initialProvider);

  const enable = useCallback(
    async (message: string) => {
      try {
        await setOnlinePayment(true);
        setEnabled(true);
        toast.success(message);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Une erreur est survenue."
        );
      }
    },
    [toast]
  );

  useEffect(() => {
    const fromStripe = takeReturn("stripe");
    const fromSquare = takeReturn("square");

    void (async () => {
      const [stripeStatus, squareStatus] = await Promise.all([
        readStatus<StripeStatus>("/api/stripe/connect", NO_STRIPE),
        readStatus<SquareStatus>("/api/square/connect", NO_SQUARE),
      ]);
      setStripe(stripeStatus);
      setSquare(squareStatus);
      if (squareStatus.connected && !stripeStatus.connected)
        setProvider("square");
      else if (stripeStatus.connected && !squareStatus.connected)
        setProvider("stripe");

      if (fromStripe === "recommencer") {
        toast.error("Le lien Stripe a expiré — reprenez la configuration.");
      } else if (fromStripe === "retour" && !stripeStatus.chargesEnabled) {
        toast.success(
          "Compte Stripe créé. Dès que Stripe aura validé vos informations, activez ici le paiement par carte."
        );
      } else if (fromStripe === "retour") {
        await enable(
          "Compte Stripe relié — vos clients peuvent payer par carte sur le menu."
        );
      } else if (fromSquare === "erreur") {
        toast.error("La connexion à Square a échoué — réessayez.");
      } else if (fromSquare === "lieu") {
        toast.success(
          "Compte Square relié. Choisissez le point de vente auquel vos QR codes appartiennent."
        );
      } else if (fromSquare === "retour") {
        await enable(
          "Compte Square relié — vos clients peuvent payer par carte sur le menu."
        );
      }
    })();
  }, [toast, enable]);

  const connect = async () => {
    setBusy(true);
    try {
      const path =
        provider === "square" ? "/api/square/connect" : "/api/stripe/connect";
      const response = await fetch(path, { method: "POST" });
      const body = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !body.url) {
        throw new Error(body.error ?? "Une erreur est survenue.");
      }
      window.location.assign(body.url);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
      setBusy(false);
    }
  };

  const chooseLocation = async (locationId: string) => {
    setBusy(true);
    try {
      const response = await fetch("/api/square/connect", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Une erreur est survenue.");
      setSquare((current) => ({ ...(current ?? NO_SQUARE), locationId }));
      await enable(
        "Point de vente choisi — vos clients peuvent payer par carte sur le menu."
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    }
    setBusy(false);
  };

  const toggle = async () => {
    const next = !enabled;
    setEnabled(next);
    try {
      await setOnlinePayment(next);
      toast.success(
        next ? "Paiement en ligne activé." : "Paiement en ligne désactivé."
      );
    } catch (error) {
      setEnabled(!next);
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    }
  };

  const confirmSwitch = async () => {
    setBusy(true);
    try {
      await setPaymentProvider(provider);
      setEnabled(false);
      setSwitching(false);
      setProviderBeforeSwitch(provider);
      const ready =
        provider === "square"
          ? Boolean(square?.connected && square.locationId)
          : Boolean(stripe?.chargesEnabled);
      if (ready) {
        await setOnlinePayment(true);
        setEnabled(true);
      }
      toast.success(
        ready
          ? `Paiement basculé sur ${provider === "square" ? "Square" : "Stripe"}.`
          : `Encaisseur changé — reliez votre compte ${provider === "square" ? "Square" : "Stripe"} pour réactiver le paiement par carte.`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    }
    setBusy(false);
  };

  const cancelSwitch = () => {
    setProvider(providerBeforeSwitch);
    setSwitching(false);
  };

  const loading = stripe === null || square === null;
  const linked = Boolean(stripe?.connected || square?.connected);
  // Encaissement réellement possible : Stripe vérifié, ou Square avec un
  // point de vente désigné. C'est aussi ce que la base exige pour activer.
  const canCharge =
    provider === "square"
      ? Boolean(square?.connected && square.locationId)
      : Boolean(stripe?.chargesEnabled);
  const needsLocation = Boolean(
    provider === "square" && square?.connected && !square.locationId
  );

  return (
    <section className="flex max-w-xl flex-col gap-4 rounded-2xl border border-hairline bg-surface p-5 lg:p-6">
      <div>
        <h2 className="font-display text-lg font-medium">Paiement à table</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Vos clients règlent leur commande par carte depuis leur téléphone —
          l&rsquo;argent arrive directement sur votre compte. Sans activation,
          ils règlent au comptoir comme d&rsquo;habitude.
        </p>
      </div>

      {loading ? (
        <div aria-busy className="shimmer h-10 rounded-xl" />
      ) : (
        <>
          <fieldset
            className="flex flex-col gap-2"
            disabled={(linked && !switching) || busy}
          >
            <legend className="text-sm font-medium">Votre encaissement</legend>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["stripe", "Stripe", "Compte créé pendant la configuration."],
                  ["square", "Square", "Vous reliez votre compte Square existant."],
                ] as const
              ).map(([value, label, hint]) => (
                <label
                  key={value}
                  className={`flex flex-1 cursor-pointer flex-col gap-1 rounded-xl border p-3 text-sm ${
                    provider === value
                      ? "border-ember-2 bg-ember-2/5"
                      : "border-hairline"
                  } ${linked && !switching && provider !== value ? "opacity-40" : ""}`}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <input
                      type="radio"
                      name="payment-provider"
                      value={value}
                      checked={provider === value}
                      onChange={() => setProvider(value)}
                      className="accent-ember-2"
                    />
                    {label}
                  </span>
                  <span className="text-xs leading-relaxed text-muted">{hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {linked && !switching && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setProviderBeforeSwitch(provider);
                setSwitching(true);
              }}
              className="self-start text-xs font-medium text-ember-2 hover:underline disabled:opacity-60"
            >
              Changer d&rsquo;encaisseur
            </button>
          )}
          {switching && (
            <div className="flex items-center gap-3">
              {provider !== providerBeforeSwitch ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void confirmSwitch()}
                  className="ember-gradient rounded-full px-4 py-2 text-xs font-semibold text-background disabled:opacity-60"
                >
                  {busy ? "Changement…" : "Confirmer"}
                </button>
              ) : (
                <p className="text-xs text-muted">
                  Choisissez votre nouvel encaisseur.
                </p>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={cancelSwitch}
                className="text-xs text-muted hover:underline disabled:opacity-60"
              >
                Annuler
              </button>
            </div>
          )}

          {needsLocation ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted">
                À quel point de vente vos QR codes appartiennent-ils&nbsp;?
              </p>
              {square?.locations?.length ? (
                square.locations.map((location) => (
                  <button
                    key={location.id}
                    type="button"
                    onClick={() => void chooseLocation(location.id)}
                    disabled={busy}
                    className="rounded-xl border border-hairline p-3 text-left text-sm hover:border-ember-2 disabled:opacity-60"
                  >
                    <span className="font-medium">{location.name}</span>
                    {location.address?.address_line_1 && (
                      <span className="block text-xs text-muted">
                        {location.address.address_line_1}
                        {location.address.locality
                          ? `, ${location.address.locality}`
                          : ""}
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <p className="text-sm text-muted">
                  Aucun point de vente lisible sur ce compte Square.
                </p>
              )}
            </div>
          ) : !canCharge ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">
                {stripe?.connected
                  ? "Compte Stripe créé — finalisez la vérification pour encaisser."
                  : "Aucun compte de paiement relié."}
              </p>
              <button
                type="button"
                onClick={() => void connect()}
                disabled={busy}
                className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
              >
                {busy
                  ? "Redirection…"
                  : stripe?.connected
                    ? "Reprendre la configuration"
                    : `Relier mon compte ${provider === "square" ? "Square" : "Stripe"}`}
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span className="text-sm font-medium">
                Proposer le paiement par carte sur le menu
              </span>
              <input
                type="checkbox"
                checked={enabled}
                onChange={() => void toggle()}
                className="size-5 accent-ember-2"
              />
            </label>
          )}
        </>
      )}
    </section>
  );
}
