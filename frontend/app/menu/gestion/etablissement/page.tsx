"use client";

import { useState } from "react";
import { CollectSettings } from "@/components/gestion/collect-settings";
import { PaymentSettings } from "@/components/gestion/payment-settings";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import type { Etablissement } from "@/lib/gestion/types";

function EtablissementForm({ etablissement }: { etablissement: Etablissement }) {
  const toast = useToast();
  const [name, setName] = useState(etablissement.name);
  const [tagline, setTagline] = useState(etablissement.tagline);
  const [address, setAddress] = useState(etablissement.address);
  const [phone, setPhone] = useState(etablissement.phone);
  const [hours, setHours] = useState(etablissement.hours);
  const [googleReviewUrl, setGoogleReviewUrl] = useState(
    etablissement.googleReviewUrl ?? ""
  );

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await api.updateEtablissement({
        name: name.trim(),
        tagline: tagline.trim(),
        address: address.trim(),
        phone: phone.trim(),
        hours: hours.trim(),
        googleReviewUrl: googleReviewUrl.trim() || undefined,
      });
      toast.success("Informations enregistrées.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex max-w-xl flex-col gap-5 rounded-2xl border border-hairline bg-surface p-5 lg:p-6"
    >
      <Field label="Nom" required>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          className={inputClass}
        />
      </Field>
      <Field label="Slogan" hint="Affiché en haut de votre menu en ligne.">
        <input
          value={tagline}
          onChange={(event) => setTagline(event.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Adresse">
        <input
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Téléphone">
        <input
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Horaires">
        <input
          value={hours}
          onChange={(event) => setHours(event.target.value)}
          className={inputClass}
        />
      </Field>
      <Field
        label="Avis Google"
        hint="Le lien « Laisser un avis » de votre fiche Google Business, proposé en bas de votre menu en ligne."
      >
        <input
          type="url"
          value={googleReviewUrl}
          onChange={(event) => setGoogleReviewUrl(event.target.value)}
          placeholder="https://g.page/r/…/review"
          className={inputClass}
        />
      </Field>
      <div className="flex justify-end">
        <button
          type="submit"
          className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background"
        >
          Enregistrer
        </button>
      </div>
    </form>
  );
}

export default function EtablissementPage() {
  const state = useGestion();
  const { can, products } = useGestionAccess();

  if (!state) return null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-medium tracking-tight lg:text-3xl">
          Établissement
        </h1>
        <p className="mt-1 text-sm text-muted">
          Les informations affichées sur votre menu en ligne.
        </p>
      </div>

      {can("etablissement.edit") ? (
        <>
          <EtablissementForm
            key={state.etablissement.slug}
            etablissement={state.etablissement}
          />
          <PaymentSettings initialEnabled={state.etablissement.onlinePayment} />
          {products.collect && (
            <CollectSettings
              initialSlotCapacity={state.etablissement.collectSlotCapacity}
            />
          )}
        </>
      ) : (
        <EmptyState
          title="Réservé au gérant"
          body="Seul le gérant peut modifier les informations de l'établissement."
        />
      )}
    </div>
  );
}
