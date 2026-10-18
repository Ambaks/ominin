"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TableState } from "@/components/club/floor-plan";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, inputClass } from "@/components/ui/field";
import { PillTabs } from "@/components/ui/pill-tabs";
import { PriceInput } from "@/components/ui/price-input";
import { Toggle } from "@/components/ui/toggle";
import { useToast } from "@/components/ui/toast";
import { slugify, uniqueSlug } from "@/lib/admin/slug";
import {
  isCalendarDay,
  parisDate,
  parisInstant,
  parisParts,
  shiftDay,
  toMinutes,
} from "@/lib/collect/hours";
import { formatCents, formatNight, formatNightShort } from "@/lib/club/format";
import type { ClubEvent } from "@/lib/club/types";
import * as clubApi from "@/lib/gestion/club-api";
import {
  bookingsByTable,
  isClubEntered,
  isPast,
  isSold,
  staffTableState,
  TABLE_STATE_LABELS,
} from "@/lib/gestion/club-selectors";
import type { ClubState } from "@/lib/gestion/club-store";
import { CLUB_LIMITS, WAIT_TICK_MS } from "@/lib/gestion/constants";
import { parsePriceInput, priceToInput } from "@/lib/gestion/format";
import { uploadPhoto } from "@/lib/gestion/photo";
import { useNow } from "@/lib/gestion/use-now";
import { clubSiteUrl } from "@/lib/site";
import { BackToSoirees } from "./club-states";
import { NightPlan, PlanLegend } from "./night-plan";

/*
 * Préparer une soirée (gérant) : ce qu'en lit le client — titre, horaire,
 * affiche, billetterie —, les zones mises en vente ce soir-là et leur prix,
 * les tables gardées hors vente, et la liste d'invités. Une soirée naît en
 * brouillon ; la publier l'ouvre aux réservations.
 */

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

type ZoneDraft = { on: boolean; price: string };

interface Draft {
  title: string;
  slug: string;
  date: string;
  start: string;
  end: string;
  tag: string;
  description: string;
  posterUrl: string | null;
  ticketUrl: string;
  zones: Record<string, ZoneDraft>;
  blocked: string[];
  guestListOpen: boolean;
  guestCapacity: string;
  guestMaxParty: string;
}

/** « 23:59 » à Paris : la valeur d'un champ heure. */
function clockOf(iso: string): string {
  const minutes = parisParts(new Date(iso)).minutes;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/**
 * Une soirée existante telle quelle ; une nouvelle reprend l'horaire et la
 * liste d'invités de la dernière programmée — un club garde ses habitudes —,
 * toutes ses zones en vente au prix de la zone.
 */
function initialDraft(club: ClubState, event: ClubEvent | null): Draft {
  const template = event ?? club.events.at(-1) ?? null;
  const settings = event ? (club.eventZones[event.id] ?? []) : null;
  return {
    title: event?.title ?? "",
    slug: event?.slug ?? "",
    date: event ? parisDate(new Date(event.startsAt)) : "",
    start: template ? clockOf(template.startsAt) : "",
    end: template ? clockOf(template.endsAt) : "",
    tag: event?.tag ?? "",
    description: event?.description ?? "",
    posterUrl: event?.posterUrl ?? null,
    ticketUrl: event?.ticketUrl ?? "",
    zones: Object.fromEntries(
      club.zones.map((zone) => {
        const setting = settings?.find((candidate) => candidate.zoneId === zone.id);
        return [
          zone.id,
          {
            on: settings ? Boolean(setting) : true,
            price: setting?.priceCents ? priceToInput(setting.priceCents / 100) : "",
          },
        ];
      })
    ),
    blocked: event ? (club.blocked[event.id] ?? []) : [],
    guestListOpen: template?.guestListOpen ?? false,
    guestCapacity: template?.guestListCapacity ? String(template.guestListCapacity) : "",
    guestMaxParty: template ? String(template.guestListMaxParty) : "",
  };
}

/** « five-stars-24-oct » : le titre et le jour, comme les soirées déjà publiées. */
function autoSlug(title: string, date: string): string {
  if (!title.trim()) return "";
  const day = isCalendarDay(date) ? formatNightShort(`${date}T12:00:00Z`).split(" ").slice(1).join(" ") : "";
  return slugify(title, day);
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-hairline bg-surface p-5">
      <div>
        <h2 className="font-display text-lg font-medium">{title}</h2>
        {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function EventEditor({
  club,
  event,
  clubSlug,
}: {
  club: ClubState;
  event: ClubEvent | null;
  clubSlug: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [saved, setSaved] = useState(() => initialDraft(club, event));
  const [draft, setDraft] = useState(saved);
  const [slugTouched, setSlugTouched] = useState(event !== null);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const zonesOn = club.zones.filter((zone) => draft.zones[zone.id]?.on);
  const [planZoneId, setPlanZoneId] = useState(zonesOn[0]?.id ?? null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => {
      const next = { ...current, [key]: value };
      if (!slugTouched && (key === "title" || key === "date")) {
        const taken = new Set(club.events.filter((e) => e.id !== event?.id).map((e) => e.slug));
        const base = autoSlug(next.title, next.date);
        next.slug = base ? uniqueSlug(base, taken) : "";
      }
      return next;
    });

  const now = useNow(WAIT_TICK_MS).getTime();
  const night = event ? club.nights[event.id] : undefined;
  const byTable = bookingsByTable(night, now);
  const sold = (night?.bookings ?? []).filter(isSold);
  const paidOnline = sold.filter((booking) => booking.paidOnline).length;
  const settled = sold.filter((booking) => booking.status !== "en_attente").length;
  const clubEntered = sold.filter(isClubEntered).length;

  // Validation : ce que la base refuserait, dit avant l'envoi.
  const title = draft.title.trim();
  const slugTaken = club.events.some((e) => e.id !== event?.id && e.slug === draft.slug);
  const startsAt =
    isCalendarDay(draft.date) && draft.start ? parisInstant(draft.date, toMinutes(draft.start)) : null;
  // Une fin à l'heure du début ou avant tombe le lendemain : une nuit de club.
  const nextDay = Boolean(draft.start && draft.end && toMinutes(draft.end) <= toMinutes(draft.start));
  const endsAt =
    startsAt && draft.end
      ? parisInstant(nextDay ? shiftDay(draft.date, 1) : draft.date, toMinutes(draft.end))
      : null;
  const ticketUrl = draft.ticketUrl.trim();
  const capacity = draft.guestCapacity.trim() ? Number(draft.guestCapacity) : null;
  const maxParty = draft.guestMaxParty.trim() ? Number(draft.guestMaxParty) : null;
  const zonePrices = Object.fromEntries(
    club.zones.map((zone) => {
      const raw = draft.zones[zone.id]?.price.trim() ?? "";
      const parsed = raw ? parsePriceInput(raw) : null;
      return [zone.id, raw ? (parsed && parsed > 0 ? Math.round(parsed * 100) : NaN) : null];
    })
  );
  const errors = {
    title: title ? undefined : "Donnez un titre à la soirée.",
    slug: !SLUG_PATTERN.test(draft.slug)
      ? "Lettres minuscules, chiffres et tirets seulement."
      : slugTaken
        ? "Une autre soirée a déjà cette adresse."
        : undefined,
    date: startsAt ? undefined : "Choisissez le jour et l'heure d'ouverture.",
    end: endsAt ? undefined : "Indiquez l'heure de fermeture.",
    ticketUrl:
      !ticketUrl || (/^https:\/\/\S+\.\S+/.test(ticketUrl) && URL.canParse(ticketUrl))
        ? undefined
        : "Un lien complet, qui commence par https://",
    capacity:
      capacity === null || (Number.isInteger(capacity) && capacity > 0)
        ? undefined
        : "Un nombre de personnes, ou vide pour ne pas plafonner.",
    maxParty:
      maxParty === null || (Number.isInteger(maxParty) && maxParty >= 1 && maxParty <= CLUB_LIMITS.guestMaxParty)
        ? undefined
        : `Entre 1 et ${CLUB_LIMITS.guestMaxParty} personnes.`,
    zones: zonesOn.some((zone) => Number.isNaN(zonePrices[zone.id]))
      ? "Un prix en euros, ou vide pour garder celui de la zone."
      : undefined,
  };
  const valid = Object.values(errors).every((error) => !error);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const ended = event ? isPast(event, now) : false;

  const save = async (publish?: boolean) => {
    if (!valid || !startsAt || !endsAt) {
      setShowErrors(true);
      toast.error("Certains champs sont à corriger.");
      return;
    }
    setSaving(true);
    try {
      const hoursChanged =
        event !== null &&
        (Date.parse(event.startsAt) !== startsAt.getTime() || Date.parse(event.endsAt) !== endsAt.getTime());
      const onIds = new Set(zonesOn.map((zone) => zone.id));
      const result = await clubApi.saveEvent(event?.id ?? null, {
        slug: draft.slug,
        title,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        tag: draft.tag.trim() || null,
        description: draft.description.trim() || null,
        posterUrl: draft.posterUrl,
        ticketUrl: ticketUrl || null,
        guestListOpen: draft.guestListOpen,
        guestListCapacity: capacity,
        guestListMaxParty: maxParty ?? undefined,
        zones: zonesOn.map((zone) => ({ zoneId: zone.id, priceCents: zonePrices[zone.id] })),
        blocked: draft.blocked.filter((id) =>
          onIds.has(club.tables.find((table) => table.id === id)?.zoneId ?? "")
        ),
      });
      if (publish !== undefined) await clubApi.setPublished(result.id, publish);
      setSaved(draft);
      let message = publish
        ? "Soirée publiée : les réservations sont ouvertes."
        : publish === false
          ? "Soirée dépubliée."
          : event
            ? "Soirée enregistrée."
            : "Soirée créée, en brouillon.";
      if (hoursChanged && settled > 0 && !event?.cancelledAt) {
        const notified = await clubApi.notifyEventChanged(result.id);
        if (notified > 0) {
          message += ` ${notified} client${notified > 1 ? "s" : ""} prévenu${notified > 1 ? "s" : ""} du nouvel horaire.`;
        }
      }
      toast.success(message);
      if (!event) router.replace(`/gestion/soirees/${result.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file: File) => {
    setUploading(true);
    try {
      set("posterUrl", await uploadPhoto(file));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "L'envoi de l'affiche a échoué.");
    } finally {
      setUploading(false);
    }
  };

  const cancelNight = async () => {
    if (!event) return;
    setConfirmCancel(false);
    setSaving(true);
    try {
      const { refunded, released } = await clubApi.cancelEvent(event.id);
      toast.success(
        released === 0
          ? "Soirée annulée."
          : `Soirée annulée : ${released} réservation${released > 1 ? "s" : ""} rendue${released > 1 ? "s" : ""}, dont ${refunded} remboursée${refunded > 1 ? "s" : ""}.`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  };

  const planZone = zonesOn.find((zone) => zone.id === planZoneId) ?? zonesOn[0];
  const planTables = planZone ? club.tables.filter((table) => table.zoneId === planZone.id) : [];
  const blocked = new Set(draft.blocked);
  const planStates: Record<string, TableState> = Object.fromEntries(
    planTables.map((table) => [table.id, staffTableState(byTable.get(table.id), !blocked.has(table.id))])
  );
  const toggleBlocked = (tableId: string) => {
    if (byTable.has(tableId)) {
      toast.notice("Table déjà réservée ce soir : elle reste à son client.");
      return;
    }
    set(
      "blocked",
      blocked.has(tableId) ? draft.blocked.filter((id) => id !== tableId) : [...draft.blocked, tableId]
    );
  };
  const blockedIn = (zoneId: string) =>
    draft.blocked.filter((id) => club.tables.find((table) => table.id === id)?.zoneId === zoneId).length;
  const shownError = (key: keyof typeof errors) => (showErrors ? errors[key] : undefined);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <BackToSoirees />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-medium tracking-tight lg:text-3xl">
              {event ? event.title : "Nouvelle soirée"}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {event
                ? event.cancelledAt
                  ? "Soirée annulée : chaque table a été rendue à son client."
                  : event.published
                    ? `Publiée · ${formatNight(event.startsAt)}`
                    : "Brouillon : invisible des clients tant qu'elle n'est pas publiée."
                : "Elle naît en brouillon : publiez-la quand tout est prêt."}
            </p>
          </div>
          {event && (
            <div className="flex flex-wrap gap-2">
              {!event.cancelledAt && (
                <Link
                  href={`/gestion/soirees/${event.id}/live`}
                  className="flex min-h-11 items-center rounded-full border border-hairline px-4 text-sm font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground lg:pointer-fine:min-h-9"
                >
                  Plan du soir
                </Link>
              )}
              {event.published && (
                <a
                  href={`${clubSiteUrl}/${clubSlug}/${event.slug}`}
                  target="_blank"
                  rel="noopener"
                  className="flex min-h-11 items-center rounded-full border border-hairline px-4 text-sm font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground lg:pointer-fine:min-h-9"
                >
                  Voir la page
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      <Section title="La soirée">
        <Field label="Titre" required error={shownError("title")}>
          <input
            value={draft.title}
            maxLength={CLUB_LIMITS.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Five Stars"
            aria-invalid={Boolean(shownError("title")) || undefined}
            className={inputClass}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Jour" required error={shownError("date")}>
            <input
              type="date"
              value={draft.date}
              onChange={(e) => set("date", e.target.value)}
              aria-invalid={Boolean(shownError("date")) || undefined}
              className={inputClass}
            />
          </Field>
          <Field label="Ouverture" required>
            <input
              type="time"
              value={draft.start}
              onChange={(e) => set("start", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field
            label="Fermeture"
            required
            error={shownError("end")}
            hint={nextDay && isCalendarDay(draft.date) ? `Le lendemain, ${formatNight(`${shiftDay(draft.date, 1)}T12:00:00Z`)}.` : undefined}
          >
            <input
              type="time"
              value={draft.end}
              onChange={(e) => set("end", e.target.value)}
              aria-invalid={Boolean(shownError("end")) || undefined}
              className={inputClass}
            />
          </Field>
        </div>
        {settled > 0 && (
          <p className="text-xs text-faint">
            Un nouvel horaire est envoyé par e-mail aux clients des tables réglées.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Étiquette" hint="« Showcase », « Étudiants » : affichée sur l'affiche.">
            <input
              value={draft.tag}
              maxLength={CLUB_LIMITS.tag}
              onChange={(e) => set("tag", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field
            label="Adresse de la page"
            required
            error={shownError("slug")}
            hint={
              event?.published
                ? "La changer casse les liens déjà partagés."
                : `${clubSiteUrl.replace(/^https?:\/\//, "")}/${clubSlug}/${draft.slug || "…"}`
            }
          >
            <input
              value={draft.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", e.target.value.toLowerCase());
              }}
              aria-invalid={Boolean(shownError("slug")) || undefined}
              autoCapitalize="none"
              spellCheck={false}
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Description">
          <textarea
            value={draft.description}
            maxLength={CLUB_LIMITS.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            placeholder="Le line-up, l'ambiance, le dress code."
            className={inputClass}
          />
        </Field>
      </Section>

      <Section title="Affiche et billets" hint="Les entrées restent chez votre billetterie : la page y renvoie.">
        <div className="flex flex-wrap items-center gap-4">
          {draft.posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- affiche du club, servie par Supabase Storage
            <img
              src={draft.posterUrl}
              alt="Affiche de la soirée"
              className="h-36 w-28 rounded-xl border border-hairline object-cover"
            />
          ) : (
            <span className="flex h-36 w-28 items-center justify-center rounded-xl border border-dashed border-hairline px-3 text-center text-xs text-faint">
              Pas d&rsquo;affiche
            </span>
          )}
          <div className="flex flex-col gap-2">
            <label className="ember-gradient inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full px-5 text-sm font-semibold text-background focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ember-1 lg:pointer-fine:min-h-9">
              {uploading ? "Envoi…" : draft.posterUrl ? "Changer l'affiche" : "Ajouter une affiche"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading}
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void upload(file);
                }}
              />
            </label>
            {draft.posterUrl && (
              <button
                type="button"
                onClick={() => set("posterUrl", null)}
                className="rounded-full border border-hairline px-5 py-2 text-sm font-semibold text-muted transition-colors hover:border-ember-3/40 hover:text-ember-3"
              >
                Retirer
              </button>
            )}
          </div>
        </div>
        <Field label="Lien de la billetterie" hint="Shotgun, Dice… vide s'il n'y a pas d'entrées en vente." error={shownError("ticketUrl")}>
          <input
            type="url"
            inputMode="url"
            value={draft.ticketUrl}
            onChange={(e) => set("ticketUrl", e.target.value)}
            placeholder="https://shotgun.live/events/…"
            aria-invalid={Boolean(shownError("ticketUrl")) || undefined}
            className={inputClass}
          />
        </Field>
      </Section>

      <Section
        title="Tables en vente"
        hint="Les zones ouvertes ce soir et leur prix. Vide, le prix est celui de la zone."
      >
        <ul className="divide-y divide-hairline rounded-2xl border border-hairline">
          {club.zones.map((zone) => {
            const zoneDraft = draft.zones[zone.id] ?? { on: false, price: "" };
            const count = club.tables.filter((table) => table.zoneId === zone.id).length;
            const invalid = zoneDraft.on && Number.isNaN(zonePrices[zone.id]);
            return (
              <li key={zone.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5">
                <Toggle
                  checked={zoneDraft.on}
                  onChange={(on) => {
                    set("zones", { ...draft.zones, [zone.id]: { ...zoneDraft, on } });
                    if (on && !planZone) setPlanZoneId(zone.id);
                  }}
                  label={`Vendre les tables ${zone.name}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{zone.name}</p>
                  <p className="truncate text-xs text-faint">
                    {count} table{count > 1 ? "s" : ""} · {formatCents(zone.priceCents)}
                    {zone.inclus ? ` · ${zone.inclus}` : ""}
                  </p>
                </div>
                {zoneDraft.on && (
                  <PriceInput
                    value={zoneDraft.price}
                    onChange={(price) => set("zones", { ...draft.zones, [zone.id]: { ...zoneDraft, price } })}
                    placeholder={priceToInput(zone.priceCents / 100)}
                    invalid={invalid}
                    className="w-32 shrink-0"
                  />
                )}
              </li>
            );
          })}
        </ul>
        {shownError("zones") && (
          <p role="alert" className="text-xs font-medium text-ember-3">
            {errors.zones}
          </p>
        )}

        {planZone && (
          <div className="flex flex-col gap-3 border-t border-hairline pt-4">
            <div>
              <h3 className="font-display text-base font-medium">Tables gardées</h3>
              <p className="mt-1 text-sm text-muted">
                Touchez une table pour la garder hors vente ce soir — artiste, habitués. Vous pourrez
                toujours la réserver vous-même.
              </p>
            </div>
            {zonesOn.length > 1 && (
              <PillTabs
                tabs={zonesOn.map((zone) => ({ id: zone.id, label: zone.name, count: blockedIn(zone.id) }))}
                activeId={planZone.id}
                onSelect={setPlanZoneId}
              />
            )}
            <NightPlan
              zone={planZone}
              tables={planTables}
              states={planStates}
              onSelect={(table) => toggleBlocked(table.id)}
              describe={(table, state) =>
                `Table ${table.label}, ${table.seats} places, ${
                  state === "libre" ? "en vente" : (TABLE_STATE_LABELS[state] ?? state).toLowerCase()
                }`
              }
            />
            <PlanLegend states={["libre", "gardee", "payee", "attente"]} />
          </div>
        )}
      </Section>

      <Section title="Liste d'invités" hint="Une inscription gratuite depuis la page de la soirée ; l'équipe coche les arrivées à la porte.">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium">Inscriptions ouvertes</p>
          <Toggle
            checked={draft.guestListOpen}
            onChange={(open) => set("guestListOpen", open)}
            label="Ouvrir la liste d'invités"
          />
        </div>
        {draft.guestListOpen && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Places sur la liste" hint="Vide : sans plafond." error={shownError("capacity")}>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={draft.guestCapacity}
                onChange={(e) => set("guestCapacity", e.target.value)}
                aria-invalid={Boolean(shownError("capacity")) || undefined}
                className={inputClass}
              />
            </Field>
            <Field label="Personnes par inscription" error={shownError("maxParty")}>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={CLUB_LIMITS.guestMaxParty}
                value={draft.guestMaxParty}
                onChange={(e) => set("guestMaxParty", e.target.value)}
                aria-invalid={Boolean(shownError("maxParty")) || undefined}
                className={inputClass}
              />
            </Field>
          </div>
        )}
      </Section>

      {event && !event.cancelledAt && !ended && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ember-3/30 p-5">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-medium">Annuler la soirée</h2>
            <p className="mt-1 text-sm text-muted">
              Chaque table est rendue à son client, remboursée si elle a été payée en ligne, et le
              client prévenu par e-mail.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmCancel(true)}
            disabled={saving}
            className="rounded-full border border-ember-3/50 bg-ember-3/10 px-5 py-2.5 text-sm font-semibold text-ember-3 transition-colors hover:bg-ember-3/20 disabled:opacity-50"
          >
            Annuler la soirée
          </button>
        </section>
      )}

      <div className="sticky bottom-20 z-30 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-hairline bg-surface-raised/95 px-4 py-3 shadow-lg shadow-background/60 backdrop-blur-md lg:bottom-6">
        <p className="mr-auto text-xs text-muted" aria-live="polite">
          {dirty ? "Modifications non enregistrées" : event ? "Tout est enregistré" : ""}
        </p>
        {event && !event.cancelledAt && (
          <button
            type="button"
            onClick={() => void save(!event.published)}
            disabled={saving}
            className="rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground disabled:opacity-50"
          >
            {event.published ? "Dépublier" : "Publier"}
          </button>
        )}
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || (event !== null && !dirty)}
          className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : event ? "Enregistrer" : "Créer la soirée"}
        </button>
      </div>

      {confirmCancel && event && (
        <ConfirmDialog
          title={`Annuler « ${event.title} » ?`}
          message={`La soirée reste affichée, marquée annulée, et plus aucune table ne s'y vend. ${
            paidOnline > 0
              ? `${paidOnline} table${paidOnline > 1 ? "s" : ""} payée${paidOnline > 1 ? "s" : ""} en ligne ${paidOnline > 1 ? "sont remboursées" : "est remboursée"} d'office, frais de service compris. `
              : ""
          }${
            clubEntered > 0
              ? `${clubEntered} réservation${clubEntered > 1 ? "s" : ""} saisie${clubEntered > 1 ? "s" : ""} par le club ${clubEntered > 1 ? "sont annulées" : "est annulée"}. `
              : ""
          }Chaque client qui a laissé son e-mail est prévenu. C'est définitif.`}
          confirmLabel="Annuler la soirée"
          cancelLabel="Garder la soirée"
          destructive
          onConfirm={() => void cancelNight()}
          onClose={() => setConfirmCancel(false)}
        />
      )}
    </div>
  );
}
