"use client";

import { useCallback, useEffect, useState } from "react";
import { describeError } from "@/lib/gestion/errors";
import { Field, GlassButton, Input, Plate, Shimmer, Switch } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import {
  setOnlineMinOrder,
  setOnlinePayment,
  setPaymentProvider,
} from "@/lib/gestion/api";
import { parsePriceInput, priceToInput } from "@/lib/gestion/format";

/*
 * Réglage « paiement à table en ligne » (gérant). Trois encaisseurs possibles,
 * au choix de l'établissement : Stripe, dont le compte Express se crée par
 * l'onboarding hébergé, Square, dont le restaurant relie SON compte
 * existant, ou Viva, dont le restaurant ouvre le compte par le lien que lui
 * donne Ominin (mode ISV ; en mode marchand, Ominin le relie à la main) —
 * dans tous les cas l'argent des additions lui va directement.
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

type Provider = "stripe" | "square" | "viva";

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

interface VivaStatus {
  connected: boolean;
  onboarded: boolean;
  verified: boolean;
  /** Le restaurant ouvre lui-même son compte (mode ISV). */
  selfServe: boolean;
}

const NO_STRIPE: StripeStatus = { connected: false, chargesEnabled: false };
const NO_SQUARE: SquareStatus = { connected: false };
const NO_VIVA: VivaStatus = { connected: false, onboarded: false, verified: false, selfServe: false };

const PROVIDERS = [
  ["stripe", "Stripe", "Compte créé pendant la configuration."],
  ["square", "Square", "Vous reliez votre compte Square existant."],
  ["viva", "Viva", "Compte ouvert en ligne, relié à Ominin."],
] as const;

const PROVIDER_LABELS: Record<Provider, string> = { stripe: "Stripe", square: "Square", viva: "Viva" };

/** Paramètre d'échec posé par l'URL de retour, à côté de celui du résultat. */
const errorParam = (provider: Provider) => `${provider}_error`;

/** L'URL porte un retour d'onboarding, que takeReturn lira. */
export function hasProviderReturn(search: string): boolean {
  const params = new URLSearchParams(search);
  return (["stripe", "square", "viva"] satisfies Provider[]).some(
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
      className="visite-encart"
    >
      <div className="flex flex-wrap items-end gap-3">
        <Field
          label="Commande minimum en ligne"
          error={invalid ? "Montant invalide\u00a0: écrivez par exemple 5 ou 7,50." : undefined}
          hint="Sous ce montant, le client règle au comptoir\u00a0; en click & collect, il doit compléter son panier. Laissez vide pour ne fixer aucun minimum."
          className="min-w-0 flex-1 basis-64"
        >
          <Input
            numeric
            unit="€"
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
            onBlur={() => {
              if (parsed !== null) setRaw(priceToInput(parsed));
            }}
            placeholder="Aucun"
            className="w-32"
          />
        </Field>
        <GlassButton
          variant="primary"
          type="submit"
          disabled={invalid || saving || unchanged}
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </GlassButton>
      </div>
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
  const [viva, setViva] = useState<VivaStatus | null>(null);
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
    const fromViva = takeReturn("viva");

    void (async () => {
      const [stripeStatus, squareStatus, vivaStatus] = await Promise.all([
        readStatus<StripeStatus>("/api/stripe/connect", NO_STRIPE),
        readStatus<SquareStatus>("/api/square/connect", NO_SQUARE),
        readStatus<VivaStatus>("/api/viva/connect", NO_VIVA),
      ]);
      setStripe(stripeStatus);
      setSquare(squareStatus);
      setViva(vivaStatus);
      // Un seul compte relié : c'est l'encaisseur.
      const connected = (
        [
          ["stripe", stripeStatus],
          ["square", squareStatus],
          ["viva", vivaStatus],
        ] as const
      ).filter(([, status]) => status.connected);
      if (connected.length === 1) setProvider(connected[0][0]);

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
      } else if (fromViva.outcome === "retour" && !vivaStatus.onboarded) {
        toast.error("L'ouverture du compte Viva n'est pas terminée — reprenez-la ici.");
      } else if (fromViva.outcome === "retour" && !vivaStatus.verified) {
        toast.success(
          "Compte Viva ouvert. Dès que Viva aura vérifié vos informations, activez ici le paiement par carte."
        );
      } else if (fromViva.outcome === "retour") {
        await enable("Compte Viva relié — vos clients peuvent payer par carte sur le menu.");
      }
    })();
  }, [toast, enable]);

  const connect = async () => {
    setBusy(true);
    try {
      const path = `/api/${provider}/connect`;
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

  // Encaissement réellement possible : Stripe vérifié, Square avec un point
  // de vente désigné, ou Viva vérifié. C'est aussi ce que la base exige pour
  // activer.
  const canChargeWith = (candidate: Provider) =>
    candidate === "square"
      ? Boolean(square?.connected && square.locationId)
      : candidate === "viva"
        ? Boolean(viva?.verified)
        : Boolean(stripe?.chargesEnabled);

  const confirmSwitch = async () => {
    setBusy(true);
    const blocked = !enabled && canChargeWith(providerBeforeSwitch);
    const label = PROVIDER_LABELS[provider];
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

  const loading = stripe === null || square === null || viva === null;
  const linked = Boolean(stripe?.connected || square?.connected || viva?.connected);
  const canCharge = canChargeWith(provider);
  const needsLocation = Boolean(provider === "square" && square?.connected && !square.locationId);
  const providerLabel = PROVIDER_LABELS[provider];
  // Un compte créé dont le parcours reste à finir chez le fournisseur.
  const started = provider === "viva" ? Boolean(viva?.connected) : Boolean(stripe?.connected);

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
            <Switch
              checked={enabled}
              onChange={() => void toggle()}
              disabled={busy || switching || (!enabled && !canCharge)}
              aria-label="Paiement en ligne"
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
          ) : provider === "viva" && !(viva?.selfServe && !viva.onboarded) ? (
            !canCharge && (
              <p className="text-muted">
                {viva?.connected
                  ? "Compte Viva relié — Viva vérifie vos informations avant les premiers encaissements."
                  : "Ominin ouvre et relie votre compte Viva : contactez-nous pour le démarrer."}
              </p>
            )
          ) : (
            !canCharge && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-muted">
                  {!started
                    ? "Aucun compte de paiement relié."
                    : provider === "viva"
                      ? "Compte Viva créé — terminez son ouverture pour encaisser."
                      : "Compte Stripe créé — finalisez la vérification pour encaisser."}
                </p>
                <GlassButton variant="primary" onClick={() => void connect()} disabled={busy}>
                  {busy
                    ? "Redirection…"
                    : started
                      ? "Reprendre la configuration"
                      : provider === "viva"
                        ? "Ouvrir mon compte Viva"
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
