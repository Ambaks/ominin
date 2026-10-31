"use client";

import { useCallback, useEffect, useState } from "react";
import { describeError } from "@/components/gestion/paiements/describe-error";
import { GlassButton, Plate, Shimmer } from "@/components/gestion/ui";
import { Field } from "@/components/ui/field";
import { PriceInput } from "@/components/ui/price-input";
import { useToast } from "@/components/ui/toast";
import { Toggle } from "@/components/ui/toggle";
import {
  setOnlineMinOrder,
  setOnlinePayment,
  setPaymentProvider,
} from "@/lib/gestion/api";
import { parsePriceInput, priceToInput } from "@/lib/gestion/format";

/*
 * Réglage « paiement à table en ligne » (gérant). Deux encaisseurs possibles,
 * au choix de l'établissement : Stripe, dont le compte Express se crée par
 * l'onboarding hébergé, ou Square, dont le restaurant relie SON compte
 * existant — dans les deux cas l'argent des additions lui va directement.
 * Le choix se verrouille visuellement dès qu'un compte est relié ; le gérant
 * peut le rouvrir via « Changer d'encaisseur » — la bascule coupe le
 * paiement par carte et le rallume si le nouveau fournisseur peut déjà
 * encaisser (compte relié + vérification faite / point de vente choisi).
 * SumUp attend l'activation de son scope « payments » : ses routes restent
 * en place, il n'est plus proposé.
 *
 * L'interrupteur « Paiement en ligne », au-dessus du choix de l'encaisseur,
 * retire la carte du menu sans délier le compte. Un blocage voulu (coupé
 * alors que l'encaisseur pouvait encaisser) survit à un changement
 * d'encaisseur.
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

const PROVIDERS = [
  ["stripe", "Stripe", "Compte créé pendant la configuration."],
  ["square", "Square", "Vous reliez votre compte Square existant."],
] as const;

/** Paramètre d'échec posé par l'URL de retour, à côté de celui du résultat. */
const errorParam = (provider: Provider) => `${provider}_error`;

/** L'URL porte un retour d'onboarding, que takeReturn lira. */
export function hasProviderReturn(search: string): boolean {
  const params = new URLSearchParams(search);
  return (["stripe", "square"] satisfies Provider[]).some(
    (provider) => params.has(provider) || params.has(errorParam(provider))
  );
}

/** Paramètres posés par les URLs de retour, lus une fois puis retirés. */
function takeReturn(provider: Provider): {
  outcome: string | null;
  error: string | null;
} {
  const url = new URL(window.location.href);
  const outcome = url.searchParams.get(provider);
  const errorKey = errorParam(provider);
  const error = url.searchParams.get(errorKey);
  if (outcome === null && error === null) return { outcome, error };
  url.searchParams.delete(provider);
  url.searchParams.delete(errorKey);
  window.history.replaceState(null, "", url);
  return { outcome, error };
}

function squareErrorMessage(code: string | null): string {
  if (code === "autorisation_refusee") {
    return "l'autorisation a été refusée dans Square.";
  }
  if (code === "session_invalide") {
    return "la session a expiré ou l'URL de retour Square ne correspond pas.";
  }
  if (code === "session_gerant") {
    return "la session du compte gérant n'est plus active.";
  }
  if (code === "configuration") {
    return "Square a refusé la configuration. Le détail a été enregistré dans les journaux serveur.";
  }
  return "réessayez.";
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

/**
 * Sous ce total, les frais d'un paiement par carte coûtent plus qu'ils ne
 * rapportent : le client règle au comptoir, et le click & collect refuse la
 * commande. Vide, aucun minimum.
 */
function MinOrderField({ initial }: { initial: number | null }) {
  const toast = useToast();
  const [raw, setRaw] = useState(initial === null ? "" : priceToInput(initial));
  const [saved, setSaved] = useState(initial);
  const [saving, setSaving] = useState(false);
  // « 5 € » se lit 5 ; 0 ne fixe aucun minimum, comme un champ vide.
  const cleaned = raw.replace(/[€\s]/g, "");
  const parsed = cleaned === "" ? null : parsePriceInput(cleaned);
  const invalid = cleaned !== "" && parsed === null;
  const amount = parsed === 0 ? null : parsed;
  const unchanged = amount === saved;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (invalid) return;
    setSaving(true);
    try {
      await setOnlineMinOrder(amount);
      setSaved(amount);
      setRaw(amount === null ? "" : priceToInput(amount));
      toast.success(amount === null ? "Aucun minimum en ligne." : "Minimum enregistré.");
    } catch (error) {
      toast.error(describeError(error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      data-visite="etablissement-minimum"
      className="visite-encart flex flex-col gap-1.5"
    >
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Commande minimum en ligne">
          <PriceInput
            value={raw}
            onChange={setRaw}
            placeholder="Aucun"
            invalid={invalid}
            describedBy="minimum-en-ligne-aide"
            className="w-32"
          />
        </Field>
        <button
          type="submit"
          disabled={invalid || saving || unchanged}
          className="g-btn g-btn-primary g-press"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
      <p
        id="minimum-en-ligne-aide"
        className={`text-g-meta ${invalid ? "text-foreground" : "text-muted"}`}
      >
        {invalid
          ? "Montant invalide : écrivez par exemple 5 ou 7,50."
          : "Sous ce montant, le client règle au comptoir ; en click & collect, il doit compléter son panier. Laissez vide pour ne fixer aucun minimum."}
      </p>
    </form>
  );
}

export function PaymentSettings({
  initialEnabled,
  initialMinOrder,
  initialProvider,
}: {
  initialEnabled: boolean;
  initialMinOrder: number | null;
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
  const [providerBeforeSwitch, setProviderBeforeSwitch] = useState<Provider>(initialProvider);

  const enable = useCallback(
    async (message: string) => {
      try {
        await setOnlinePayment(true);
        setEnabled(true);
        toast.success(message);
      } catch (error) {
        toast.error(describeError(error).message);
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
      if (squareStatus.connected && !stripeStatus.connected) setProvider("square");
      else if (stripeStatus.connected && !squareStatus.connected) setProvider("stripe");

      if (fromStripe.outcome === "recommencer") {
        toast.error("Le lien Stripe a expiré — reprenez la configuration.");
      } else if (fromStripe.outcome === "retour" && !stripeStatus.chargesEnabled) {
        toast.success(
          "Compte Stripe créé. Dès que Stripe aura validé vos informations, activez ici le paiement par carte."
        );
      } else if (fromStripe.outcome === "retour") {
        await enable("Compte Stripe relié — vos clients peuvent payer par carte sur le menu.");
      } else if (fromSquare.outcome === "erreur") {
        toast.error(`La connexion à Square a échoué : ${squareErrorMessage(fromSquare.error)}`);
      } else if (fromSquare.outcome === "lieu") {
        toast.success(
          "Compte Square relié. Choisissez le point de vente auquel vos QR codes appartiennent."
        );
      } else if (fromSquare.outcome === "retour") {
        await enable("Compte Square relié — vos clients peuvent payer par carte sur le menu.");
      }
    })();
  }, [toast, enable]);

  const connect = async () => {
    setBusy(true);
    try {
      const path = provider === "square" ? "/api/square/connect" : "/api/stripe/connect";
      const response = await fetch(path, { method: "POST" });
      const body = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !body.url) {
        throw new Error(body.error ?? "Lien de configuration indisponible.");
      }
      window.location.assign(body.url);
    } catch (error) {
      toast.error(describeError(error).message);
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
      if (!response.ok) throw new Error(body.error ?? "Point de vente refusé par Square.");
      setSquare((current) => ({ ...(current ?? NO_SQUARE), locationId }));
      await enable("Point de vente choisi — vos clients peuvent payer par carte sur le menu.");
    } catch (error) {
      toast.error(describeError(error).message);
    }
    setBusy(false);
  };

  const toggle = async () => {
    const next = !enabled;
    setEnabled(next);
    try {
      await setOnlinePayment(next);
      toast.success(next ? "Paiement en ligne activé." : "Paiement en ligne désactivé.");
    } catch (error) {
      setEnabled(!next);
      toast.error(describeError(error).message);
    }
  };

  // Encaissement réellement possible : Stripe vérifié, ou Square avec un
  // point de vente désigné. C'est aussi ce que la base exige pour activer.
  const canChargeWith = (candidate: Provider) =>
    candidate === "square"
      ? Boolean(square?.connected && square.locationId)
      : Boolean(stripe?.chargesEnabled);

  const confirmSwitch = async () => {
    setBusy(true);
    const blocked = !enabled && canChargeWith(providerBeforeSwitch);
    const label = provider === "square" ? "Square" : "Stripe";
    try {
      await setPaymentProvider(provider);
      setEnabled(false);
      setSwitching(false);
      setProviderBeforeSwitch(provider);
      const ready = canChargeWith(provider);
      if (ready && !blocked) {
        await setOnlinePayment(true);
        setEnabled(true);
      }
      toast.success(
        !ready
          ? `Encaisseur changé — reliez votre compte ${label} pour réactiver le paiement par carte.`
          : blocked
            ? `Encaisseur changé pour ${label} — le paiement en ligne reste bloqué.`
            : `Paiement basculé sur ${label}.`
      );
    } catch (error) {
      toast.error(describeError(error).message);
    }
    setBusy(false);
  };

  const cancelSwitch = () => {
    setProvider(providerBeforeSwitch);
    setSwitching(false);
  };

  const loading = stripe === null || square === null;
  const linked = Boolean(stripe?.connected || square?.connected);
  const canCharge = canChargeWith(provider);
  const needsLocation = Boolean(provider === "square" && square?.connected && !square.locationId);
  const providerLabel = provider === "square" ? "Square" : "Stripe";

  return (
    <Plate className="flex max-w-xl flex-col gap-4 p-5">
      <div>
        <h2 className="font-display text-g-h2">Paiement à table</h2>
        <p className="mt-1 text-muted">
          Vos clients règlent leur commande par carte depuis leur téléphone —
          l&rsquo;argent arrive directement sur votre compte. Sans activation,
          ils règlent au comptoir comme d&rsquo;habitude.
        </p>
      </div>

      {loading ? (
        <Shimmer className="h-g-control" />
      ) : (
        <div data-visite="etablissement-paiement" className="visite-encart flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">Paiement en ligne</p>
              <p className="mt-0.5 text-g-meta text-muted">
                {enabled
                  ? "Vos clients peuvent régler par carte depuis le menu."
                  : canCharge
                    ? "Bloqué — vos clients règlent au comptoir."
                    : `Inactif tant qu'aucun compte ne peut encaisser : reliez votre compte ${providerLabel}.`}
              </p>
            </div>
            <Toggle
              checked={enabled}
              onChange={() => void toggle()}
              disabled={busy || switching || (!enabled && !canCharge)}
              label="Paiement en ligne"
            />
          </div>

          <fieldset className="flex flex-col gap-2" disabled={(linked && !switching) || busy}>
            <legend className="mb-2 font-medium">Votre encaisseur</legend>
            <div className="flex flex-wrap gap-2">
              {PROVIDERS.map(([value, label, hint]) => (
                <label
                  key={value}
                  className={`flex min-w-36 flex-1 cursor-pointer flex-col gap-1 rounded-g-card border p-3 transition-colors ${
                    provider === value ? "border-ember-2 bg-ember-2/10" : "border-hairline"
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
                  <span className="text-g-meta text-muted">{hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {linked && !switching && (
            <GlassButton
              className="self-start"
              disabled={busy}
              onClick={() => {
                setProviderBeforeSwitch(provider);
                setSwitching(true);
              }}
            >
              Changer d&rsquo;encaisseur
            </GlassButton>
          )}
          {switching && (
            <div className="flex flex-wrap items-center gap-3">
              {provider !== providerBeforeSwitch ? (
                <GlassButton variant="primary" disabled={busy} onClick={() => void confirmSwitch()}>
                  {busy ? "Changement…" : `Passer sur ${providerLabel}`}
                </GlassButton>
              ) : (
                <p className="text-g-meta text-muted">Choisissez votre nouvel encaisseur.</p>
              )}
              <GlassButton disabled={busy} onClick={cancelSwitch}>
                Annuler
              </GlassButton>
            </div>
          )}

          {needsLocation ? (
            <div className="flex flex-col gap-2">
              <p className="text-muted">À quel point de vente vos QR codes appartiennent-ils&nbsp;?</p>
              {square?.locations?.length ? (
                square.locations.map((location) => (
                  <button
                    key={location.id}
                    type="button"
                    onClick={() => void chooseLocation(location.id)}
                    disabled={busy}
                    className="g-press rounded-g-card border border-hairline p-3 text-left transition-colors disabled:opacity-30"
                  >
                    <span className="font-medium">{location.name}</span>
                    {location.address?.address_line_1 && (
                      <span className="block text-g-meta text-muted">
                        {location.address.address_line_1}
                        {location.address.locality ? `, ${location.address.locality}` : ""}
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <p className="text-muted">Aucun point de vente lisible sur ce compte Square.</p>
              )}
            </div>
          ) : (
            !canCharge && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-muted">
                  {stripe?.connected
                    ? "Compte Stripe créé — finalisez la vérification pour encaisser."
                    : "Aucun compte de paiement relié."}
                </p>
                <GlassButton variant="primary" onClick={() => void connect()} disabled={busy}>
                  {busy
                    ? "Redirection…"
                    : stripe?.connected
                      ? "Reprendre la configuration"
                      : `Relier mon compte ${providerLabel}`}
                </GlassButton>
              </div>
            )
          )}
        </div>
      )}
      {enabled && <MinOrderField initial={initialMinOrder} />}
    </Plate>
  );
}
