"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { Toggle } from "@/components/ui/toggle";
import { centsToEurosInput, eurosToCents } from "@/lib/shop/format";
import * as api from "@/lib/shop/gestion-api";
import { DEFAULT_PALETTE, FONT_PRESET_LABELS, PALETTE_LABELS, paletteStyle, resolveTheme, type ShopFontPreset, type ShopPalette } from "@/lib/shop/theme";
import type { Shop, ShopPaymentAccount, ShopSubscription } from "@/lib/shop/types";
import { CheckCircleIcon, CircleDashedIcon, ExternalLinkIcon, RefreshIcon } from "../icons";
import { Card, primaryButton, secondaryButton } from "./page-header";

/* Réglages de la boutique : identité, contact, légal, textes, thème, paiement, abonnement. */

type Section = "general" | "legal" | "texts";

export function SettingsForm({ shop, section }: { shop: Shop; section: Section }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [s, setS] = useState({
    name: shop.name,
    tagline: shop.tagline ?? "",
    hero_title: shop.hero_title ?? "",
    hero_subtitle: shop.hero_subtitle ?? "",
    catalog_label: shop.catalog_label,
    announcement: shop.announcement ?? "",
    contact_email: shop.contact_email ?? "",
    contact_phone: shop.contact_phone ?? "",
    instagram_url: shop.instagram_url ?? "",
    tiktok_url: shop.tiktok_url ?? "",
    freeShipping: centsToEurosInput(shop.free_shipping_threshold_cents),
    logo_url: shop.logo_url ?? "",
    share_image_url: shop.share_image_url ?? "",
    legal_company_name: shop.legal_company_name ?? "",
    legal_address: shop.legal_address ?? "",
    legal_siret: shop.legal_siret ?? "",
    legal_vat: shop.legal_vat ?? "",
    legal_email: shop.legal_email ?? "",
    about_text: shop.about_text ?? "",
    livraison_retours: shop.livraison_retours ?? "",
    cgv: shop.cgv ?? "",
    mentions_legales: shop.mentions_legales ?? "",
    confidentialite: shop.confidentialite ?? "",
  });
  const set = (patch: Partial<typeof s>) => setS({ ...s, ...patch });
  const opt = (v: string) => v.trim() || null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.updateShop(shop.id, {
        name: s.name.trim(),
        tagline: opt(s.tagline),
        hero_title: opt(s.hero_title),
        hero_subtitle: opt(s.hero_subtitle),
        catalog_label: s.catalog_label.trim() || "La boutique",
        announcement: opt(s.announcement),
        contact_email: opt(s.contact_email)?.toLowerCase() ?? null,
        contact_phone: opt(s.contact_phone),
        instagram_url: opt(s.instagram_url),
        tiktok_url: opt(s.tiktok_url),
        free_shipping_threshold_cents: s.freeShipping.trim() ? eurosToCents(s.freeShipping) : null,
        logo_url: opt(s.logo_url),
        share_image_url: opt(s.share_image_url),
        legal_company_name: opt(s.legal_company_name),
        legal_address: opt(s.legal_address),
        legal_siret: opt(s.legal_siret),
        legal_vat: opt(s.legal_vat),
        legal_email: opt(s.legal_email),
        about_text: opt(s.about_text),
        livraison_retours: opt(s.livraison_retours),
        cgv: opt(s.cgv),
        mentions_legales: opt(s.mentions_legales),
        confidentialite: opt(s.confidentialite),
      });
      toast.success("Réglages enregistrés");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.");
    }
    setBusy(false);
  };

  const text = (key: keyof typeof s, label: string, hint?: string) => (
    <Field label={label} hint={hint}>
      <input className={inputClass} value={s[key]} onChange={(e) => set({ [key]: e.target.value })} />
    </Field>
  );
  const area = (key: keyof typeof s, label: string, minH = "min-h-40", hint?: string) => (
    <Field label={label} hint={hint}>
      <textarea className={`${inputClass} ${minH}`} value={s[key]} onChange={(e) => set({ [key]: e.target.value })} />
    </Field>
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {section === "general" && (
        <>
          <Card title="Identité">
            <div className="grid gap-4 sm:grid-cols-2">
              {text("name", "Nom de la boutique")}
              {text("tagline", "Signature", "Sous le logo et dans les e-mails.")}
              {text("hero_title", "Accroche de la page d'accueil", "Une virgule sépare la ligne principale de la ligne en italique.")}
              {text("catalog_label", "Libellé du catalogue", "« Nos box », « La boutique »…")}
              <div className="sm:col-span-2">{area("hero_subtitle", "Texte d'accueil", "min-h-20")}</div>
              <div className="sm:col-span-2">{text("announcement", "Bandeau en haut du site", "Vide pour masquer le bandeau.")}</div>
              {text("logo_url", "Logo (URL)", "Image ronde, 512 px conseillés. Sert aussi d'icône dans l'onglet du navigateur.")}
              {text("share_image_url", "Image de partage (URL)", "Vignette des liens partagés sur Instagram ou WhatsApp. Format paysage, 1200 × 630 px. À défaut, le logo est utilisé.")}
              {text("freeShipping", "Livraison offerte à partir de (€)", "Seuil par défaut, chaque mode peut avoir le sien.")}
            </div>
          </Card>
          <Card title="Contact et réseaux" description="Affichés sur le site ; l'e-mail reçoit aussi les notifications de commandes et de messages.">
            <div className="grid gap-4 sm:grid-cols-2">
              {text("contact_email", "E-mail de contact")}
              {text("contact_phone", "Téléphone")}
              {text("instagram_url", "Instagram (lien)")}
              {text("tiktok_url", "TikTok (lien)")}
            </div>
          </Card>
        </>
      )}
      {section === "legal" && (
        <Card title="Identité légale" description="Obligatoire sur un site marchand.">
          <div className="grid gap-4 sm:grid-cols-2">
            {text("legal_company_name", "Nom ou raison sociale")}
            {text("legal_siret", "SIRET")}
            <div className="sm:col-span-2">{area("legal_address", "Adresse", "min-h-16")}</div>
            {text("legal_vat", "TVA", "Numéro intracommunautaire ou mention de franchise.")}
            {text("legal_email", "E-mail légal")}
          </div>
        </Card>
      )}
      {section === "texts" && (
        <>
          <Card title="À propos" description="Séparez les paragraphes par une ligne vide.">
            {area("about_text", "Texte")}
          </Card>
          <Card title="Livraison et retours">{area("livraison_retours", "Texte")}</Card>
          <Card title="Conditions générales de vente" description="Une ligne courte sans ponctuation suivie d'un paragraphe devient un titre de section.">
            {area("cgv", "Texte", "min-h-72")}
          </Card>
          <Card title="Mentions légales">{area("mentions_legales", "Texte")}</Card>
          <Card title="Politique de confidentialité">{area("confidentialite", "Texte")}</Card>
        </>
      )}
      <div className="flex justify-end">
        <button type="submit" disabled={busy} className={primaryButton}>
          Enregistrer
        </button>
      </div>
    </form>
  );
}

export function ThemeEditor({ shop }: { shop: Shop }) {
  const router = useRouter();
  const toast = useToast();
  const initial = resolveTheme(shop.theme);
  const [fonts, setFonts] = useState<ShopFontPreset>(initial.fonts);
  const [palette, setPalette] = useState<ShopPalette>(initial.palette);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await api.updateTheme(shop.id, { fonts, palette });
      toast.success("Thème enregistré");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.");
    }
    setBusy(false);
  };

  return (
    <Card title="Thème du site" description="Couleurs et polices du site public. L'espace de gestion, lui, ne change pas.">
      <div className="flex flex-col gap-5">
        <Field label="Polices">
          <select className={inputClass} value={fonts} onChange={(e) => setFonts(e.target.value as ShopFontPreset)}>
            {(Object.keys(FONT_PRESET_LABELS) as ShopFontPreset[]).map((preset) => (
              <option key={preset} value={preset}>
                {FONT_PRESET_LABELS[preset]}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(PALETTE_LABELS) as (keyof ShopPalette)[]).map((key) => (
            <label key={key} className="flex items-center gap-3 rounded-xl border border-hairline bg-background px-3 py-2 text-sm">
              <input type="color" value={palette[key]} onChange={(e) => setPalette({ ...palette, [key]: e.target.value })} className="size-8 cursor-pointer rounded-md border-0 bg-transparent p-0" aria-label={PALETTE_LABELS[key]} />
              <span className="flex flex-col">
                <span>{PALETTE_LABELS[key]}</span>
                <span className="font-mono text-[11px] text-faint">{palette[key]}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="rounded-2xl border border-hairline p-4" style={paletteStyle(palette)}>
          <div className="rounded-xl p-5" style={{ background: "var(--shop-bg)", color: "var(--shop-ink)", fontFamily: "Georgia, serif" }}>
            <p className="text-2xl" style={{ color: "var(--shop-accent-deep)" }}>{shop.name}</p>
            <p className="mt-1 text-sm" style={{ color: "var(--shop-ink-soft)" }}>{shop.tagline ?? "Aperçu du thème"}</p>
            <span className="mt-4 inline-block rounded-full px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em]" style={{ background: "var(--shop-accent)", color: "var(--shop-paper)" }}>
              Bouton
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void save()} disabled={busy} className={primaryButton}>
            Enregistrer le thème
          </button>
          <button type="button" onClick={() => setPalette(DEFAULT_PALETTE)} className={secondaryButton}>
            Palette par défaut
          </button>
        </div>
      </div>
    </Card>
  );
}

function Row({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2.5 text-sm">
      {ok ? <CheckCircleIcon className="size-4.5 text-status-signed" /> : <CircleDashedIcon className="size-4.5 text-faint" />}
      <span className={ok ? "" : "text-muted"}>{label}</span>
    </li>
  );
}

export function StripePanel({ account, stripeConfigured }: { account: ShopPaymentAccount | null; stripeConfigured: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const connected = Boolean(account);
  const ready = Boolean(account?.charges_enabled);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur Stripe.");
    }
    setBusy(false);
  };

  return (
    <Card title="Paiements · Stripe" description="Les ventes sont encaissées sur le compte Stripe de la boutique, relié à son compte bancaire." action={<span className={`rounded-full px-3 py-1 text-xs font-semibold ${ready ? "bg-status-signed/15 text-status-signed" : "bg-ember-2/15 text-ember-2"}`}>{ready ? "Paiements actifs" : connected ? "À terminer" : "Non connecté"}</span>}>
      <div className="flex flex-col gap-4">
        {!stripeConfigured && <p className="rounded-xl border border-ember-2/40 bg-ember-2/10 px-4 py-3 text-sm">Clés Stripe manquantes côté serveur (STRIPE_SECRET_KEY).</p>}
        <ul className="flex flex-col gap-2">
          <Row ok={connected} label="Compte Stripe connecté" />
          <Row ok={Boolean(account?.details_submitted)} label="Informations transmises à Stripe" />
          <Row ok={ready} label="Encaissement activé" />
          <Row ok={Boolean(account?.payouts_enabled)} label="Virements vers le compte bancaire activés" />
        </ul>
        <div className="flex flex-wrap gap-2">
          {!ready && (
            <button type="button" disabled={busy || !stripeConfigured} onClick={() => run(async () => window.location.assign(await api.stripeOnboardingUrl()))} className={primaryButton}>
              {connected ? "Reprendre la configuration" : "Connecter Stripe"}
            </button>
          )}
          {connected && (
            <>
              <button type="button" disabled={busy} onClick={() => run(async () => { await api.refreshStripeStatus(); toast.success("Statut actualisé"); router.refresh(); })} className={secondaryButton}>
                <RefreshIcon className="size-4" /> Actualiser
              </button>
              <a href="https://dashboard.stripe.com" target="_blank" rel="noreferrer" className={secondaryButton}>
                <ExternalLinkIcon className="size-4" /> Ouvrir Stripe
              </a>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

export function SubscriptionPanel({ subscription, pricesConfigured }: { subscription: ShopSubscription | null; pricesConfigured: boolean }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const active = subscription?.status === "active" || subscription?.status === "trialing";

  return (
    <Card title="Abonnement Ominin Shop" action={<span className={`rounded-full px-3 py-1 text-xs font-semibold ${active ? "bg-status-signed/15 text-status-signed" : "bg-ember-2/15 text-ember-2"}`}>{active ? "Actif" : subscription?.status ?? "Aucun"}</span>}>
      <div className="flex flex-col gap-4 text-sm text-muted">
        <p>{active ? "Votre abonnement est en cours. La facturation est gérée par Stripe." : "Mise en place puis abonnement mensuel, sans engagement."}</p>
        {!active && (
          <button
            type="button"
            disabled={busy || !pricesConfigured}
            onClick={async () => {
              setBusy(true);
              try {
                window.location.assign(await api.subscriptionCheckoutUrl());
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Erreur.");
                setBusy(false);
              }
            }}
            className={`${primaryButton} w-fit`}
          >
            Souscrire
          </button>
        )}
        {!pricesConfigured && <p className="text-xs text-faint">Tarifs en cours de définition : la souscription en ligne sera ouverte prochainement.</p>}
      </div>
    </Card>
  );
}

export function ProductActiveToggle({ id, isActive, name }: { id: string; isActive: boolean; name: string }) {
  const router = useRouter();
  const toast = useToast();
  return (
    <Toggle
      checked={isActive}
      label={`Visible : ${name}`}
      onChange={async (value) => {
        try {
          await api.setProductActive(id, value);
          router.refresh();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Erreur.");
        }
      }}
    />
  );
}
