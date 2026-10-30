"use client";

import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatDueDate } from "@/lib/admin/echeances";
import {
  deleteVendor,
  fetchVendors,
  saveVendor,
  type Vendor,
} from "@/lib/admin/entreprise";
import { fetchFinances, type Subscription } from "@/lib/admin/finances";
import { httpHref } from "@/lib/admin/format";

const TEXT_FIELDS = [
  { key: "purpose", label: "À quoi il sert" },
  { key: "url", label: "Adresse" },
  { key: "account_holder", label: "Compte qui le détient" },
  { key: "access_people", label: "Qui y a accès" },
  { key: "plan", label: "Offre" },
  { key: "free_limits", label: "Limites de l'offre" },
  { key: "note", label: "Note" },
] as const;

type TextKey = (typeof TEXT_FIELDS)[number]["key"];

function VendorForm({
  vendor,
  subscriptions,
  onSaved,
  onClose,
}: {
  vendor: Vendor | null;
  subscriptions: Subscription[];
  onSaved: () => Promise<void>;
  onClose: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(vendor?.name ?? "");
  const [texts, setTexts] = useState<Record<TextKey, string>>(() => ({
    purpose: vendor?.purpose ?? "",
    url: vendor?.url ?? "",
    account_holder: vendor?.account_holder ?? "",
    access_people: vendor?.access_people ?? "",
    plan: vendor?.plan ?? "",
    free_limits: vendor?.free_limits ?? "",
    note: vendor?.note ?? "",
  }));
  const [renewalOn, setRenewalOn] = useState(vendor?.renewal_on ?? "");
  const [subscriptionId, setSubscriptionId] = useState(vendor?.subscription_id ?? "");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const run = async (action: () => Promise<void>, done: string) => {
    setBusy(true);
    try {
      await action();
      await onSaved();
      toast.success(done);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
      setBusy(false);
    }
  };

  const save = () =>
    void run(
      () =>
        saveVendor(vendor?.id ?? null, {
          name: name.trim(),
          purpose: texts.purpose.trim() || null,
          url: texts.url.trim() || null,
          account_holder: texts.account_holder.trim() || null,
          access_people: texts.access_people.trim() || null,
          plan: texts.plan.trim() || null,
          free_limits: texts.free_limits.trim() || null,
          note: texts.note.trim() || null,
          renewal_on: renewalOn || null,
          subscription_id: subscriptionId || null,
        }),
      "Prestataire enregistré."
    );

  return (
    <>
      <Modal
        title={vendor ? "Modifier le prestataire" : "Nouveau prestataire"}
        onClose={onClose}
        footer={
          <>
            {vendor && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirming(true)}
                className="mr-auto text-sm font-semibold text-ember-3"
              >
                Supprimer
              </button>
            )}
            <button
              type="button"
              disabled={busy || !name.trim()}
              onClick={save}
              className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-50"
            >
              Enregistrer
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs text-muted">
            Aucun mot de passe ici : ils restent dans le gestionnaire de mots de
            passe.
          </p>
          <Field label="Nom" required>
            <input data-autofocus value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
          </Field>
          {TEXT_FIELDS.map((field) => (
            <Field key={field.key} label={field.label}>
              <input
                value={texts[field.key]}
                onChange={(event) =>
                  setTexts((current) => ({ ...current, [field.key]: event.target.value }))
                }
                className={inputClass}
              />
            </Field>
          ))}
          <Field label="Renouvellement" hint="Rejoint les échéances et leurs rappels.">
            <input type="date" value={renewalOn} onChange={(event) => setRenewalOn(event.target.value)} className={inputClass} />
          </Field>
          <Field label="Abonnement dans Finances">
            <select value={subscriptionId} onChange={(event) => setSubscriptionId(event.target.value)} className={inputClass}>
              <option value="">Aucun</option>
              {subscriptions.map((subscription) => (
                <option key={subscription.id} value={subscription.id}>
                  {subscription.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Modal>
      {confirming && vendor && (
        <ConfirmDialog
          title="Supprimer ce prestataire ?"
          message={`${vendor.name} sort de la liste. Son abonnement dans Finances reste.`}
          confirmLabel="Supprimer"
          destructive
          onClose={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            void run(() => deleteVendor(vendor.id), "Prestataire supprimé.");
          }}
        />
      )}
    </>
  );
}

export default function PrestatairesPage() {
  const toast = useToast();
  const [vendors, setVendors] = useState<Vendor[] | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ row: Vendor | null } | null>(null);

  const load = useCallback(async () => {
    const [nextVendors, finances] = await Promise.all([fetchVendors(), fetchFinances()]);
    setVendors(nextVendors);
    setSubscriptions(finances.subscriptions);
  }, []);

  useEffect(() => {
    // Faux positif : le setState de load() suit la réponse réseau.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((error) => {
      const message = error instanceof Error ? error.message : "Une erreur est survenue.";
      setLoadError(message);
      toast.error(message);
    });
    // toast est stable (contexte) ; l'écran ne se charge qu'une fois.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  if (loadError) return <EmptyState title="Chargement impossible" body={loadError} />;
  if (!vendors) return <div aria-busy className="shimmer h-64 rounded-2xl" />;

  const subscriptionOf = (id: string | null) =>
    subscriptions.find((subscription) => subscription.id === id);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium">Prestataires</h1>
          <p className="mt-1 text-sm text-muted">
            Les services qu&apos;utilise Ominin : qui détient le compte, qui y a
            accès, sur quelle offre.
          </p>
        </div>
        <button
          type="button"
          className="ember-gradient rounded-full px-5 py-2 text-sm font-semibold text-background"
          onClick={() => setEditing({ row: null })}
        >
          Nouveau prestataire
        </button>
      </div>

      {vendors.length === 0 ? (
        <EmptyState title="Aucun prestataire" body="Ajoutez le premier : Vercel, Supabase, Stripe…" />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {vendors.map((vendor) => {
            const subscription = subscriptionOf(vendor.subscription_id);
            return (
              <li key={vendor.id} className="flex flex-col gap-1 rounded-2xl border border-hairline bg-surface p-4">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    className="min-w-0 truncate text-left text-sm font-semibold hover:text-ember-1"
                    onClick={() => setEditing({ row: vendor })}
                  >
                    {vendor.name}
                  </button>
                  {vendor.url && (
                    <a
                      href={httpHref(vendor.url)}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 text-xs font-semibold text-muted hover:text-foreground"
                    >
                      Ouvrir
                    </a>
                  )}
                </div>
                {vendor.purpose && <p className="text-xs text-muted">{vendor.purpose}</p>}
                <dl className="mt-1 flex flex-col gap-0.5 text-xs">
                  {[
                    ["Compte", vendor.account_holder],
                    ["Accès", vendor.access_people],
                    ["Offre", vendor.plan],
                    ["Limites", vendor.free_limits],
                    ["Renouvellement", vendor.renewal_on && formatDueDate(vendor.renewal_on)],
                    ["Abonnement", subscription?.name],
                  ].flatMap(([label, value]) =>
                    value ? (
                      <div key={label} className="flex gap-2">
                        <dt className="w-24 shrink-0 text-faint">{label}</dt>
                        <dd className="min-w-0 wrap-break-word">{value}</dd>
                      </div>
                    ) : (
                      []
                    )
                  )}
                </dl>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <VendorForm
          vendor={editing.row}
          subscriptions={subscriptions}
          onSaved={load}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
