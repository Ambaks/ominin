"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { CategoryLayoutSettings } from "@/components/gestion/category-layout-settings";
import { CollectSettings } from "@/components/gestion/collect-settings";
import { DataLicenceSettings } from "@/components/gestion/data-licence-settings";
import { FermeturesSettings } from "@/components/gestion/fermetures-settings";
import {
  HubriseSettings,
  hubriseProblems,
  type HubriseStatus,
} from "@/components/gestion/hubrise-settings";
import { AlertIcon, BellIcon, PrinterIcon, ProductsIcon, type IconProps } from "@/components/gestion/icons";
import { hoursProblem, OpeningHoursEditor } from "@/components/gestion/opening-hours-editor";
import { PaymentPinSettings } from "@/components/gestion/payment-pin-settings";
import { PaymentSettings } from "@/components/gestion/payment-settings";
import { PopinaSettings } from "@/components/gestion/popina-settings";
import { ServiceModeSettings } from "@/components/gestion/service-mode-settings";
import { TabletSettings } from "@/components/gestion/tablet-settings";
import { EmptyState, Field, GlassButton, GlassFrame, Input, Notice, Plate, ReserveGerant, SectionHeading } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import { DAY_NAMES, formatOpeningHours, type OpeningHours } from "@/lib/collect/hours";
import * as api from "@/lib/gestion/api";
import { describeError } from "@/lib/gestion/errors";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import type { Etablissement } from "@/lib/gestion/types";
import { SettingsCard } from "./settings-card";

/*
 * Réglages (gérant) : tout ce qui n'est ni la carte ni le service du jour,
 * en quatre sections courtes — Mon établissement, Mon service, Encaissement,
 * Appareils — et un « Plus de réglages » replié pour ce que la plupart des
 * restaurants n'ouvrent jamais (caisse connectée, données, abonnement). Le
 * sommaire en tête mène à chaque section ; tout vit sur une seule page pour
 * que la visite guidée trouve chaque cible.
 */

function Svg({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}
const HouseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 11l8-7 8 7M6 10v10h12V10M10 20v-6h4v6" />
  </Svg>
);
const ServiceIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 10h16M6 10v9M18 10v9M8 6h8M12 6v4" />
  </Svg>
);
const CardIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <path d="M3 10h18M7 15h3" />
  </Svg>
);
const DevicesIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="13" height="10" rx="2" />
    <path d="M9 19h1M16 10h4a1 1 0 011 1v7a1 1 0 01-1 1h-4z" />
  </Svg>
);
const MoreIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="6" cy="12" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="18" cy="12" r="1" />
  </Svg>
);
const ChevronIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 6l6 6-6 6" />
  </Svg>
);

const SECTIONS = [
  { id: "etablissement", label: "Mon établissement", hint: "Nom, horaires, avis Google", icon: HouseIcon },
  { id: "service", label: "Mon service", hint: "Type de service, fermetures", icon: ServiceIcon },
  { id: "encaissement", label: "Encaissement", hint: "Paiement en ligne, code", icon: CardIcon },
  { id: "appareils", label: "Appareils", hint: "Imprimantes, tablette, alertes", icon: DevicesIcon },
  { id: "plus", label: "Plus de réglages", hint: "Caisse, données, abonnement", icon: MoreIcon },
] as const;

function Block({ i, className = "", children }: { i: number; className?: string; children: ReactNode }) {
  return (
    <div className={`g-rise ${className}`} style={{ "--g-i": i } as CSSProperties}>
      {children}
    </div>
  );
}

function Section({
  id,
  title,
  sub,
  i,
  children,
}: {
  id: string;
  title: string;
  sub: string;
  i: number;
  children: ReactNode;
}) {
  return (
    <Block i={i}>
      {/* L'en-tête collé passe au-dessus d'une section atteinte par le sommaire. */}
      <section id={id} aria-labelledby={`${id}-titre`} className="flex scroll-mt-28 flex-col gap-4">
        <SectionHeading id={`${id}-titre`} title={title} sub={sub} />
        {children}
      </section>
    </Block>
  );
}

/** Un réglage qui vit sur une autre page : le cadre entier y mène. */
function LinkFrame({
  href,
  eyebrow,
  icon,
  title,
  text,
}: {
  href: string;
  eyebrow: string;
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <GlassFrame href={href} eyebrow={eyebrow} icon={icon} entity="orders">
      <Plate className="flex items-center justify-between gap-3 p-4">
        <span className="min-w-0">
          <span className="block text-g-body font-semibold">{title}</span>
          <span className="block text-g-meta text-muted">{text}</span>
        </span>
        <ChevronIcon className="size-4 shrink-0 text-muted" />
      </Plate>
    </GlassFrame>
  );
}

function EtablissementForm({
  etablissement,
  hoursManaged,
  onOpenTill,
}: {
  etablissement: Etablissement;
  /** Les horaires viennent de la caisse (HubRise) : on ne les saisit plus ici. */
  hoursManaged: boolean;
  /** Montre la carte de la caisse connectée, dans « Plus de réglages ». */
  onOpenTill: () => void;
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
  const [saving, setSaving] = useState(false);
  // Les plages se vérifient au moment d'enregistrer, et l'erreur reste
  // affichée sous les horaires jusqu'à la correction.
  const [hoursError, setHoursError] = useState<string | null>(null);
  // Un texte déjà écrit par le gérant se montre d'emblée.
  const [hoursTextOpen] = useState(hours !== "");

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const problem = hoursManaged ? null : hoursProblem(openingHours);
    setHoursError(problem);
    if (problem) return;
    const generated = formatOpeningHours(openingHours);
    setSaving(true);
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
      toast.success("Fiche enregistrée.");
    } catch (error) {
      toast.error(
        describeError(error).message
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <SettingsCard
        title="Fiche"
        text="Ce que vos clients lisent en tête de votre menu en ligne."
      >
        <div data-visite="etablissement-fiche" className="visite-encart grid gap-4 sm:grid-cols-2">
          <Field label="Nom" required>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </Field>
          <Field label="Slogan" hint="Affiché sous le nom, en haut du menu.">
            <Input
              value={tagline}
              onChange={(event) => setTagline(event.target.value)}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Adresse">
            <Input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
            />
          </Field>
          <Field label="Téléphone">
            <Input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </Field>
        </div>
        <Field
          label="Avis Google"
          hint="Le lien « Laisser un avis » de votre fiche Google Business, proposé en bas de votre menu en ligne."
        >
          <Input
            type="url"
            value={googleReviewUrl}
            onChange={(event) => setGoogleReviewUrl(event.target.value)}
            placeholder="https://g.page/r/…/review"
          />
        </Field>
      </SettingsCard>

      <SettingsCard
        title="Horaires d'ouverture"
        text={
          hoursManaged
            ? "Les horaires viennent de votre caisse, par HubRise : modifiez-les là-bas."
            : "Le click & collect propose ses heures de retrait dans ces plages."
        }
      >
        {hoursManaged ? (
          etablissement.openingHours ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-g-label">
              {DAY_NAMES.map((day, index) => {
                const ranges = etablissement.openingHours?.[String(index + 1)] ?? [];
                return (
                  <div key={day} className="contents">
                    <dt className="text-muted">{day}</dt>
                    <dd className="tabular-nums">
                      {ranges.length
                        ? ranges.map(([open, close]) => `${open} – ${close}`).join(", ")
                        : "Fermé"}
                    </dd>
                  </div>
                );
              })}
            </dl>
          ) : (
            <EmptyState
              text={etablissement.hours || "Aucun horaire reçu de la caisse pour l'instant."}
              action={<GlassButton onClick={onOpenTill}>Caisse connectée</GlassButton>}
            />
          )
        ) : (
          <>
            <OpeningHoursEditor
              value={openingHours}
              onChange={(next) => {
                setOpeningHours(next);
                setHoursError(null);
              }}
            />
            {hoursError && (
              <p role="alert" className="flex items-start gap-1.5 text-g-meta font-medium">
                <AlertIcon className="mt-px size-4 shrink-0 text-ember-3" />
                {hoursError}
              </p>
            )}
            <details className="group" open={hoursTextOpen}>
              <summary className="flex min-h-g-control cursor-pointer list-none items-center gap-2 rounded-full text-g-meta font-semibold text-muted touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-1">
                <ChevronIcon className="size-3.5 transition-transform duration-(--g-morph-dur) group-open:rotate-90 motion-reduce:transition-none" />
                Texte des horaires sur la carte
              </summary>
              <Field
                label="Horaires affichés"
                hint="Votre texte ; laissé vide, il est écrit d'après les plages ci-dessus."
              >
                <Input
                  value={hours}
                  onChange={(event) => setHours(event.target.value)}
                  placeholder={formatOpeningHours(openingHours)}
                />
              </Field>
            </details>
          </>
        )}
      </SettingsCard>

      <div className="flex justify-end">
        <GlassButton variant="primary" type="submit" disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </GlassButton>
      </div>
    </form>
  );
}

export default function EtablissementPage() {
  const state = useGestion();
  const { can, products, hasFeature } = useGestionAccess();
  // Relié à HubRise, la caisse fait foi pour les horaires, et ses commandes
  // non transmises remontent en tête de page.
  const [hubrise, setHubrise] = useState<HubriseStatus | null>(null);
  const [plusOpen, setPlusOpen] = useState(false);
  // Une carte repliée dans « Plus » ne se laisse atteindre qu'une fois
  // ouverte : le défilement attend le rendu qui l'ouvre.
  const pendingScroll = useRef<string | null>(null);
  const scrollTo = (id: string) => {
    pendingScroll.current = id;
    setPlusOpen(true);
  };
  useEffect(() => {
    const id = pendingScroll.current;
    if (!plusOpen || !id) return;
    pendingScroll.current = null;
    document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, [plusOpen]);
  const isGerant = state?.role === "gerant";

  if (!state) return null;

  const { etablissement } = state;
  const hoursManaged = hubrise?.connected === true && hubrise.syncedAt?.hours != null;
  const problems = hubriseProblems(hubrise);
  const blocked = hubrise?.connected === true && hubrise.blocked === true;
  const openPlus = () => setPlusOpen(true);

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <Block i={0}>
        <SectionHeading
          level={1}
          title="Réglages"
          sub="Tout ce qui n'est ni la carte ni le service du jour."
        />
      </Block>

      {can("etablissement.edit") ? (
        <>
          {(blocked || problems > 0) && (
            <Block i={0}>
              <Notice
                title={blocked ? "Connexion à renouveler" : "Commandes non transmises"}
                text={
                  blocked
                    ? "HubRise a refusé notre accès : les commandes attendent dans Ominin."
                    : `${problems} commande${problems > 1 ? "s" : ""} n'${problems > 1 ? "ont" : "a"} pas atteint votre caisse.`
                }
                action={
                  <GlassButton onClick={() => scrollTo("caisse")}>Voir</GlassButton>
                }
              />
            </Block>
          )}

          <Block i={1}>
            <GlassFrame eyebrow="Sommaire">
              <Plate>
                <nav aria-label="Sections des réglages" className="grid sm:grid-cols-2">
                  {SECTIONS.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      onClick={section.id === "plus" ? openPlus : undefined}
                      className={`g-press flex min-h-g-control items-center gap-3 border-t border-hairline px-4 py-2.5 touch-manipulation first:border-t-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ember-1 sm:[&:nth-child(2)]:border-t-0 sm:[&:nth-child(2n)]:border-l ${
                        section.id === "plus" ? "sm:col-span-2 sm:[&:nth-child(2n)]:border-l-0" : ""
                      }`}
                    >
                      <section.icon className="size-5 shrink-0 text-ember-1" />
                      <span className="min-w-0">
                        <span className="block truncate text-g-label font-semibold">{section.label}</span>
                        <span className="block truncate text-g-meta text-muted">{section.hint}</span>
                      </span>
                    </a>
                  ))}
                </nav>
              </Plate>
            </GlassFrame>
          </Block>

          <Section
            id="etablissement"
            i={2}
            title="Mon établissement"
            sub="Nom, coordonnées, horaires et avis Google."
          >
            <EtablissementForm
              key={etablissement.slug}
              etablissement={etablissement}
              hoursManaged={hoursManaged}
              onOpenTill={() => scrollTo("caisse")}
            />
          </Section>

          <Section
            id="service"
            i={3}
            title="Mon service"
            sub="Comment vos clients commandent, et ce qui se ferme à quelle heure."
          >
            {/* Le type de service n'a de sens qu'avec la commande en ligne. */}
            {hasFeature("commandes") && etablissement.offre !== null && (
              <ServiceModeSettings
                initialMode={etablissement.serviceMode}
                initialShowTable={etablissement.showTableNumber}
                initialBarPickup={etablissement.barPickup}
                slug={etablissement.slug}
                resetHour={state.orderNumberResetHour}
              />
            )}
            {hasFeature("commandes") && (
              <FermeturesSettings
                closures={state.closures}
                categories={state.categories}
                dayEndHour={state.dayEndHour}
              />
            )}
            {/* Sans offre Menu, pas de menu QR à présenter. */}
            {etablissement.offre !== null && (
              <CategoryLayoutSettings initialLayout={etablissement.categoryLayout} />
            )}
            {products.collect && (
              <CollectSettings
                initialSlotCapacity={etablissement.collectSlotCapacity}
                onlineMinOrder={etablissement.onlineMinOrder}
                onlinePayment={etablissement.onlinePayment}
              />
            )}
          </Section>

          <Section
            id="encaissement"
            i={4}
            title="Encaissement"
            sub="Le paiement par carte depuis le menu, et le code demandé pour encaisser."
          >
            {/* La démonstration se règle chez Ominin : aucun réglage ici. */}
            {etablissement.paymentProvider === "demo" ? (
              <SettingsCard
                title="Paiement en ligne en démonstration"
                text="Les commandes sont marquées payées, sans aucun débit. Pour encaisser pour de vrai, demandez à Ominin de relier votre compte."
              />
            ) : (
              <PaymentSettings
                initialEnabled={etablissement.onlinePayment}
                initialMinOrder={etablissement.onlineMinOrder}
                initialProvider={
                  etablissement.paymentProvider === "square" ? "square" : "stripe"
                }
              />
            )}
            <PaymentPinSettings pinSet={etablissement.paymentPinSet} />
          </Section>

          <Section
            id="appareils"
            i={5}
            title="Appareils"
            sub="Les imprimantes, la tablette posée en salle et les alertes de cet appareil."
          >
            <div className="grid gap-g-gap sm:grid-cols-2">
              {hasFeature("terminaux") && (
                <LinkFrame
                  href="/gestion/terminaux"
                  eyebrow="Imprimantes"
                  icon={<PrinterIcon />}
                  title="Imprimantes et boîtier"
                  text="Les tickets de cuisine et de caisse."
                />
              )}
              {hasFeature("commandes") && (
                <LinkFrame
                  href="/gestion/notifications"
                  eyebrow="Alertes"
                  icon={<BellIcon />}
                  title="Alertes de cet appareil"
                  text="Ce qui vous prévient, et comment."
                />
              )}
            </div>
            <TabletSettings pinSet={etablissement.adminPinSet} />
          </Section>

          <Block i={6}>
            <details
              id="plus"
              open={plusOpen}
              onToggle={(event) => setPlusOpen(event.currentTarget.open)}
              className="group scroll-mt-28"
            >
              <summary className="g-press flex min-h-g-control cursor-pointer list-none items-center justify-between gap-3 rounded-full touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-1">
                <SectionHeading
                  title="Plus de réglages"
                  sub="Caisse connectée, données et modèles, abonnement."
                />
                <ChevronIcon className="size-5 shrink-0 text-muted transition-transform duration-(--g-morph-dur) group-open:rotate-90 motion-reduce:transition-none" />
              </summary>
              <div className="mt-4 flex flex-col gap-4">
                {isGerant && <HubriseSettings onStatus={setHubrise} onReturn={() => scrollTo("caisse")} />}
                {isGerant && <PopinaSettings />}
                <DataLicenceSettings etablissementId={etablissement.id} />
                {hasFeature("produits") && (
                  <LinkFrame
                    href="/gestion/produits"
                    eyebrow="Abonnement"
                    icon={<ProductsIcon />}
                    title="Abonnement et produits"
                    text="Votre offre, vos factures, ce qui est ouvert."
                  />
                )}
              </div>
            </details>
          </Block>
        </>
      ) : (
        <Block i={1}>
          <ReserveGerant ask="modifier les réglages de l'établissement" />
        </Block>
      )}
    </div>
  );
}
