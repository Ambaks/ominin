"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DataLicenceSettings } from "@/components/gestion/data-licence-settings";
import { CollectSettings } from "@/components/gestion/collect-settings";
import { FermeturesSettings } from "@/components/gestion/fermetures-settings";
import { GiftIcon } from "@/components/gestion/icons";
import { fetchHubriseStatus, HubriseSettings } from "@/components/gestion/hubrise-settings";
import { PopinaSettings } from "@/components/gestion/popina-settings";
import { hoursProblem, OpeningHoursEditor } from "@/components/gestion/opening-hours-editor";
import { PaymentSettings } from "@/components/gestion/payment-settings";
import { PaymentPinSettings } from "@/components/gestion/payment-pin-settings";
import { CategoryLayoutSettings } from "@/components/gestion/category-layout-settings";
import { ServiceModeSettings } from "@/components/gestion/service-mode-settings";
import { TabletSettings } from "@/components/gestion/tablet-settings";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { formatOpeningHours, type OpeningHours } from "@/lib/collect/hours";
import * as api from "@/lib/gestion/api";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import type { Etablissement } from "@/lib/gestion/types";

function EtablissementForm({
  etablissement,
  hoursManaged,
}: {
  etablissement: Etablissement;
  /** Les horaires viennent de la caisse (HubRise) : on ne les saisit plus ici. */
  hoursManaged: boolean;
}) {
  const toast = useToast();
  const [name, setName] = useState(etablissement.name);
  const [tagline, setTagline] = useState(etablissement.tagline);
  const [address, setAddress] = useState(etablissement.address);
  const [phone, setPhone] = useState(etablissement.phone);
  // Un texte égal à celui des plages enregistrées n'est pas celui du
  // gérant : le champ reste vide et suit les plages.
  const [hours, setHours] = useState(
    etablissement.openingHours &&
      etablissement.hours === formatOpeningHours(etablissement.openingHours)
      ? ""
      : etablissement.hours
  );
  const [openingHours, setOpeningHours] = useState<OpeningHours>(
    etablissement.openingHours ?? {}
  );
  const [googleReviewUrl, setGoogleReviewUrl] = useState(
    etablissement.googleReviewUrl ?? ""
  );

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const problem = hoursManaged ? null : hoursProblem(openingHours);
    if (problem) {
      toast.error(problem);
      return;
    }
    const generated = formatOpeningHours(openingHours);
    try {
      await api.updateEtablissement({
        name: name.trim(),
        tagline: tagline.trim(),
        address: address.trim(),
        phone: phone.trim(),
        // Le texte affiché est celui du gérant ; vide, il suit les plages.
        // Les horaires de la caisse ne se réécrivent pas d'ici.
        hours: hoursManaged ? etablissement.hours : hours.trim() || generated,
        openingHours: hoursManaged
          ? etablissement.openingHours
          : generated
            ? openingHours
            : null,
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
      <div data-visite="etablissement-fiche" className="visite-encart flex flex-col gap-5">
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
      </div>
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
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint">
          Horaires d&apos;ouverture
        </legend>
        {hoursManaged ? (
          <p className="rounded-xl border border-hairline bg-background px-4 py-3 text-sm leading-relaxed">
            <span className="block text-muted">
              Les horaires viennent de votre caisse, par HubRise : modifiez-les là-bas.
            </span>
            <span className="mt-1 block font-medium">
              {etablissement.hours || "Aucun horaire reçu."}
            </span>
          </p>
        ) : (
          <>
            <OpeningHoursEditor value={openingHours} onChange={setOpeningHours} />
            <span className="text-xs text-faint">
              Le click &amp; collect propose ses heures de retrait dans ces plages.
            </span>
          </>
        )}
      </fieldset>
      {!hoursManaged && (
        <Field
          label="Horaires affichés sur la carte"
          hint="Votre texte ; laissé vide, il est écrit d'après les plages ci-dessus."
        >
          <input
            value={hours}
            onChange={(event) => setHours(event.target.value)}
            placeholder={formatOpeningHours(openingHours)}
            className={inputClass}
          />
        </Field>
      )}
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
  const { can, products, hasFeature } = useGestionAccess();
  const [hubriseHours, setHubriseHours] = useState(false);
  const isGerant = state?.role === "gerant";

  // Relié à HubRise, la caisse fait foi pour les horaires.
  useEffect(() => {
    if (!isGerant) return;
    void fetchHubriseStatus().then((status) =>
      setHubriseHours(status.connected && status.syncedAt?.hours != null)
    );
  }, [isGerant]);

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
            hoursManaged={hubriseHours}
          />
          {/* Le type de service n'a de sens qu'avec la commande en ligne. */}
          {hasFeature("commandes") && state.etablissement.offre !== null && (
            <ServiceModeSettings
              initialMode={state.etablissement.serviceMode}
              initialShowTable={state.etablissement.showTableNumber}
              initialBarPickup={state.etablissement.barPickup}
              slug={state.etablissement.slug}
              resetHour={state.orderNumberResetHour}
            />
          )}
          {/* Sans offre Menu, pas de menu QR à présenter. */}
          {state.etablissement.offre !== null && (
            <CategoryLayoutSettings initialLayout={state.etablissement.categoryLayout} />
          )}
          {hasFeature("commandes") && (
            <FermeturesSettings
              closures={state.closures}
              categories={state.categories}
              dayEndHour={state.dayEndHour}
            />
          )}
          {/* La démonstration se règle chez Ominin : aucun réglage ici. */}
          {state.etablissement.paymentProvider === "demo" ? (
            <p className="rounded-2xl border border-hairline bg-surface px-4 py-3 text-sm text-muted">
              Paiement en ligne en démonstration : les commandes sont marquées
              payées, sans aucun débit. Pour encaisser pour de vrai, demandez à
              Ominin de relier votre compte.
            </p>
          ) : (
            <PaymentSettings
              initialEnabled={state.etablissement.onlinePayment}
              initialMinOrder={state.etablissement.onlineMinOrder}
              initialProvider={
                state.etablissement.paymentProvider === "square"
                  ? "square"
                  : "stripe"
              }
            />
          )}
          {isGerant && <HubriseSettings />}
          {isGerant && <PopinaSettings />}
          {/* Sur mobile, la barre du bas n'a pas la place d'un onglet de
              plus : la fidélité se rejoint d'ici. */}
          {hasFeature("fidelite") && (
            <Link
              href="/gestion/fidelite"
              className="flex items-center justify-between gap-3 rounded-2xl border border-hairline bg-surface px-4 py-3 lg:hidden"
            >
              <span>
                <span className="block text-sm font-medium">Fidélité</span>
                <span className="block text-xs text-faint">
                  Programme, paliers et points de vos clients.
                </span>
              </span>
              <GiftIcon className="size-5 shrink-0 text-muted" />
            </Link>
          )}
          <TabletSettings pinSet={state.etablissement.adminPinSet} />
          <PaymentPinSettings pinSet={state.etablissement.paymentPinSet} />
          <DataLicenceSettings etablissementId={state.etablissement.id} />
          {products.collect && (
            <CollectSettings
              initialSlotCapacity={state.etablissement.collectSlotCapacity}
              onlineMinOrder={state.etablissement.onlineMinOrder}
              onlinePayment={state.etablissement.onlinePayment}
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
