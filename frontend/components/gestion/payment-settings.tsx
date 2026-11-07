"use client";

import { useCallback, useEffect, useState } from "react";
import { describeError } from "@/lib/gestion/errors";
import { Chip, Field, GlassButton, Input, Plate, Shimmer, Switch } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import { setOnlineMinOrder, setOnlinePayment } from "@/lib/gestion/api";
import { parsePriceInput, priceToInput } from "@/lib/gestion/format";

/*
 * Paiement par carte depuis le menu (gérant). Ominin encaisse par Stripe :
 * le restaurant crée son compte par l'onboarding hébergé, et l'argent des
 * additions lui va directement. Un établissement déjà relié à Square (BOHO)
 * garde Square, son point de vente choisi ici. Viva et SumUp ne sont plus
 * proposés ; leurs routes restent en place.
 *
 * Une seule ligne d'état, une seule action : relier le compte, finir sa
 * vérification, choisir le point de vente, ou allumer le paiement. Au
 * retour d'un onboarding, le statut est relu chez le fournisseur et le
 * paiement s'allume de lui-même si le compte peut encaisser : le gérant a
 * fait le parcours pour ça.
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

type Status = { stripe: StripeStatus } | { square: SquareStatus };

const LABELS: Record<Provider, string> = { stripe: "Stripe", square: "Square" };

/** Paramètre d'échec posé par l'URL de retour, à côté de celui du résultat. */
const errorParam = (provider: Provider) => `${provider}_error`;

/** L'URL porte un retour d'onboarding, que takeReturn lira. */
export function hasProviderReturn(search: string): boolean {
  const params = new URLSearchParams(search);
  return (["stripe", "square"] satisfies Provider[]).some(
    (provider) => params.has(provider) || params.has(errorParam(provider))
  );
}

/** Paramètres posés par l'URL de retour, lus une fois puis retirés. */
function takeReturn(provider: Provider): { outcome: string | null; error: string | null } {
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
  if (code === "autorisation_refusee") return "l'autorisation a été refusée dans Square.";
  if (code === "session_invalide") return "la session a expiré ou l'URL de retour Square ne correspond pas.";
  if (code === "session_gerant") return "la session du compte gérant n'est plus active.";
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
    <form onSubmit={onSubmit} data-visite="etablissement-minimum" className="visite-encart">
      <div className="flex flex-wrap items-end gap-3">
        <Field
          label="Commande minimum en ligne"
          error={invalid ? "Montant invalide : écrivez par exemple 5 ou 7,50." : undefined}
          hint="Sous ce montant, le client règle au comptoir ; en click & collect, il complète son panier. Vide : aucun minimum."
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
        <GlassButton variant="primary" type="submit" disabled={invalid || saving || unchanged}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </GlassButton>
      </div>
    </form>
  );
}

export function PaymentSettings({
  initialEnabled,
  initialMinOrder,
  provider,
}: {
  initialEnabled: boolean;
  initialMinOrder: number | null;
  /** Square pour un établissement qui y est déjà ; Stripe pour tous les autres. */
  provider: Provider;
}) {
  const toast = useToast();
  const [status, setStatus] = useState<Status | null>(null);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [busy, setBusy] = useState(false);
  const label = LABELS[provider];

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
    const back = takeReturn(provider);
    void (async () => {
      if (provider === "square") {
        const square = await readStatus<SquareStatus>("/api/square/connect", { connected: false });
        setStatus({ square });
        if (back.outcome === "erreur") {
          toast.error(`La connexion à Square a échoué : ${squareErrorMessage(back.error)}`);
        } else if (back.outcome === "lieu") {
          toast.success("Compte Square relié. Choisissez le point de vente de vos QR codes.");
        } else if (back.outcome === "retour") {
          await enable("Compte Square relié : vos clients peuvent payer par carte sur le menu.");
        }
        return;
      }
      const stripe = await readStatus<StripeStatus>("/api/stripe/connect", { connected: false, chargesEnabled: false });
      setStatus({ stripe });
      if (back.outcome === "recommencer") {
        toast.error("Le lien Stripe a expiré : reprenez la configuration.");
      } else if (back.outcome === "retour" && !stripe.chargesEnabled) {
        toast.success("Compte Stripe créé. Dès que Stripe aura vérifié vos informations, allumez ici le paiement par carte.");
      } else if (back.outcome === "retour") {
        await enable("Compte Stripe relié : vos clients peuvent payer par carte sur le menu.");
      }
    })();
  }, [provider, toast, enable]);

  const connect = async () => {
    setBusy(true);
    try {
      const response = await fetch(`/api/${provider}/connect`, { method: "POST" });
      const body = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !body.url) throw new Error(body.error ?? "Lien de configuration indisponible.");
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
      setStatus((current) => (current && "square" in current ? { square: { ...current.square, locationId } } : current));
      await enable("Point de vente choisi : vos clients peuvent payer par carte sur le menu.");
    } catch (error) {
      toast.error(describeError(error).message);
    }
    setBusy(false);
  };

  const toggle = async (next: boolean) => {
    setEnabled(next);
    try {
      await setOnlinePayment(next);
      toast.success(next ? "Paiement par carte activé." : "Paiement par carte coupé : vos clients règlent au comptoir.");
    } catch (error) {
      setEnabled(!next);
      toast.error(describeError(error).message);
    }
  };

  const square = status && "square" in status ? status.square : null;
  const stripe = status && "stripe" in status ? status.stripe : null;
  // Ce que la base exige pour allumer : Stripe vérifié, ou Square avec son point de vente.
  const canCharge = square ? Boolean(square.connected && square.locationId) : Boolean(stripe?.chargesEnabled);
  const needsLocation = Boolean(square?.connected && !square.locationId);
  const started = Boolean(stripe?.connected);

  // L'état du compte en une phrase, et ce qu'il reste à faire.
  const state = canCharge
    ? { chip: "Prêt", text: enabled ? "Vos clients règlent par carte depuis le menu." : "Coupé : vos clients règlent au comptoir." }
    : needsLocation
      ? { chip: "À finir", text: "Choisissez le point de vente auquel vos QR codes appartiennent." }
      : started
        ? { chip: "À finir", text: "Compte créé : Stripe attend encore quelques informations avant les premiers paiements." }
        : { chip: "Non relié", text: `Reliez votre compte ${label} : quelques minutes, puis l'argent arrive directement chez vous.` };

  return (
    <Plate className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-56">
          <h3 className="text-g-body font-semibold">Paiement par carte · {label}</h3>
          <p className="mt-1 text-g-meta text-muted">
            Vos clients règlent leur commande depuis leur téléphone ; l&rsquo;argent arrive sur votre compte {label}.
          </p>
        </div>
        {status && (
          <span className={canCharge ? "[--g-entity:var(--status-signed)]" : ""}>
            <Chip tone={canCharge ? "neutral" : "problem"}>{state.chip}</Chip>
          </span>
        )}
      </div>

      {!status ? (
        <Shimmer className="h-g-control" />
      ) : (
        <div data-visite="etablissement-paiement" className="visite-encart flex flex-col gap-4">
          {canCharge ? (
            <Switch
              checked={enabled}
              onChange={(next) => void toggle(next)}
              label="Paiement par carte sur le menu"
              hint={state.text}
            />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="min-w-0 flex-1 basis-56 text-g-label text-muted">{state.text}</p>
              {!needsLocation && (
                <GlassButton variant="primary" onClick={() => void connect()} disabled={busy}>
                  {busy ? "Redirection…" : started ? "Reprendre la configuration" : `Relier mon compte ${label}`}
                </GlassButton>
              )}
            </div>
          )}

          {needsLocation &&
            (square?.locations?.length ? (
              <div className="flex flex-col gap-2">
                {square.locations.map((location) => (
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
                ))}
              </div>
            ) : (
              <p className="text-g-label text-muted">Aucun point de vente lisible sur ce compte Square.</p>
            ))}
        </div>
      )}
      {enabled && canCharge && <MinOrderField initial={initialMinOrder} />}
    </Plate>
  );
}
