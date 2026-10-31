"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { TableState } from "@/components/club/floor-plan";
import { AlertIcon, ExternalLinkIcon } from "@/components/gestion/icons";
import {
  ConfirmSheet,
  Field,
  GlassButton,
  Input,
  Notice,
  Plate,
  SectionHeading,
  Segmented,
  Switch,
  Textarea,
} from "@/components/gestion/ui";
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
import { formatCents, formatNight, formatNightShort, tableName } from "@/lib/club/format";
import type { ClubEvent } from "@/lib/club/types";
import * as clubApi from "@/lib/gestion/club-api";
import {
  bookingsByTable,
  isClubEntered,
  isPast,
  isSold,
  paymentsOf,
  refundableOnline,
  staffTableState,
  TABLE_STATE_LABELS,
} from "@/lib/gestion/club-selectors";
import type { ClubState } from "@/lib/gestion/club-store";
import { CLUB_LIMITS, WAIT_TICK_MS } from "@/lib/gestion/constants";
import { describeError } from "@/lib/gestion/errors";
import { uploadPhoto } from "@/lib/gestion/photo";
import { useNow } from "@/lib/gestion/use-now";
import { clubSiteUrl } from "@/lib/site";
import { BackToSoirees } from "./club-states";
import { EurosInput, eurosToInput, parseEuros } from "./euros-input";
import { NightPlan, PlanLegend } from "./night-plan";

/*
 * Préparer une soirée (gérant). Quatre champs suffisent — titre, jour,
 * ouverture, fermeture — et deux gestes : « Créer et publier », ou en
 * brouillon. Le reste (affiche, billets, zones et prix, tables gardées,
 * liste d'invités) attend sous « Options de la soirée » ; l'adresse de la
 * page, générée, se modifie sur demande. Les erreurs se lisent au champ.
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
            price: setting?.priceCents ? eurosToInput(setting.priceCents) : "",
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

/** Les champs qui vivent sous « Options » : une erreur de l'un d'eux les déplie. */
const OPTION_FIELDS = new Set(["ticketUrl", "zones", "capacity", "maxParty"]);

/** Un bloc des options : titre, phrase, puis ses champs. */
function Option({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-hairline px-5 py-5 first:border-t-0">
      <div>
        <h3 className="font-display text-g-name">{title}</h3>
        {hint && <p className="mt-1 text-g-meta text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

const rise = (index: number) => ({ "--g-i": index }) as CSSProperties;

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
  const [editSlug, setEditSlug] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  // Les options s'ouvrent d'elles-mêmes sur une soirée existante : c'est là qu'on y revient.
  const [optionsOpen, setOptionsOpen] = useState(event !== null);
  /** Réservations que le dernier passage n'a pas pu rendre (remboursement refusé, réseau). */
  const [failed, setFailed] = useState<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
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
  const paidOnline = sold.filter((booking) => refundableOnline(paymentsOf(night, booking.id)).length > 0).length;
  const settled = sold.filter((booking) => booking.status !== "en_attente").length;
  const clubEntered = sold.filter(isClubEntered).length;

  // Validation : ce que la base refuserait, dit avant l'envoi, au champ.
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
      const cents = raw ? parseEuros(raw) : null;
      return [zone.id, raw ? (cents && cents > 0 ? cents : NaN) : null];
    })
  );
  const zoneError = (zoneId: string) =>
    draft.zones[zoneId]?.on && Number.isNaN(zonePrices[zoneId])
      ? "Un prix en euros, ou vide pour garder celui de la zone."
      : undefined;
  const errors = {
    title: title ? undefined : "Donnez un titre à la soirée.",
    // Sans titre ni adresse saisie, c'est le titre qui manque, pas l'adresse.
    slug: !title && !slugTouched
      ? undefined
      : !SLUG_PATTERN.test(draft.slug)
      ? "Lettres minuscules, chiffres et tirets seulement."
      : slugTaken
        ? "Une autre soirée a déjà cette adresse."
        : undefined,
    date: isCalendarDay(draft.date) ? undefined : "Choisissez le jour.",
    start: draft.start ? undefined : "Indiquez l'heure d'ouverture.",
    end: draft.end ? undefined : "Indiquez l'heure de fermeture.",
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
    zones: zonesOn.some((zone) => zoneError(zone.id)) ? "zones" : undefined,
  };
  const valid = Object.values(errors).every((error) => !error) && startsAt !== null && endsAt !== null;
  const flagged = (Object.keys(errors) as (keyof typeof errors)[]).filter((key) => errors[key]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const ended = event ? isPast(event, now) : false;
  // Soirée annulée dont des tables tiennent encore : un remboursement a
  // échoué, ou le passage a été interrompu.
  const pending = event?.cancelledAt
    ? [...byTable.values()].filter((booking) => isSold(booking) || failed.includes(booking.id))
    : [];
  const labelOf = (tableId: string) => {
    const table = club.tables.find((candidate) => candidate.id === tableId);
    const zone = club.zones.find((candidate) => candidate.id === table?.zoneId);
    return table && zone ? tableName(zone.name, table.label) : "?";
  };
  const shownError = (key: keyof typeof errors) => (showErrors ? errors[key] : undefined);

  /** Les erreurs se montrent au champ ; la première reçoit le focus, les options s'ouvrent si elle y vit. */
  const revealErrors = () => {
    setShowErrors(true);
    if (errors.slug) setEditSlug(true);
    if (flagged.some((key) => OPTION_FIELDS.has(key))) setOptionsOpen(true);
    requestAnimationFrame(() => {
      const first = document.querySelector<HTMLElement>('.soirees [aria-invalid="true"]');
      first?.scrollIntoView({ block: "center" });
      first?.focus({ preventScroll: true });
    });
  };

  const save = async (publish?: boolean) => {
    if (!valid || !startsAt || !endsAt) {
      revealErrors();
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
      if (publish !== undefined) {
        try {
          await clubApi.setPublished(result.id, publish);
        } catch (error) {
          // La soirée existe déjà : on rejoint sa page, d'où « Publier » se relance.
          if (event) throw error;
          toast.error(`Soirée créée, mais pas publiée. ${describeError(error).text}`);
          router.replace(`/gestion/soirees/${result.id}`);
          return;
        }
      }
      setSaved(draft);
      let message = publish
        ? event
          ? "Soirée publiée : les réservations sont ouvertes."
          : "Soirée créée et publiée : les réservations sont ouvertes."
        : publish === false
          ? "Soirée repassée en brouillon : les clients ne la voient plus."
          : event
            ? "Soirée enregistrée."
            : "Soirée créée, en brouillon : publiez-la quand tout est prêt.";
      if (hoursChanged && settled > 0 && !event?.cancelledAt) {
        const notified = await clubApi.notifyEventChanged(result.id);
        if (notified > 0) {
          message += ` ${notified} client${notified > 1 ? "s" : ""} prévenu${notified > 1 ? "s" : ""} du nouvel horaire.`;
        }
      }
      toast.success(message);
      if (!event) router.replace(`/gestion/soirees/${result.id}`);
    } catch (error) {
      toast.error(describeError(error).message);
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file: File) => {
    setUploading(true);
    try {
      set("posterUrl", await uploadPhoto(file));
    } catch (error) {
      toast.error(describeError(error).message);
    } finally {
      setUploading(false);
    }
  };

  // Annuler, ou relancer une annulation restée incomplète : la route ne
  // reprend que les tables encore tenues, sans rien rembourser deux fois.
  const cancelNight = async () => {
    if (!event) return;
    setConfirmCancel(false);
    setSaving(true);
    try {
      const result = await clubApi.cancelEvent(event.id);
      setFailed(result.failed);
      const done = [
        result.refunded > 0 && `${result.refunded} remboursée${result.refunded > 1 ? "s" : ""}`,
        result.cancelled > 0 && `${result.cancelled} annulée${result.cancelled > 1 ? "s" : ""}`,
      ].filter(Boolean);
      const summary = `Soirée annulée${done.length > 0 ? ` : ${done.join(", ")}` : ""}.`;
      if (result.failed.length > 0) {
        toast.error(
          `${summary} ${result.failed.length} réservation${result.failed.length > 1 ? "s" : ""} à reprendre : relancez les remboursements.`
        );
      } else {
        toast.success(summary);
      }
    } catch (error) {
      toast.error(describeError(error).message);
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

  const siteHost = clubSiteUrl.replace(/^https?:\/\//, "");
  const pageUrl = `${siteHost}/${clubSlug}/${draft.slug || "…"}`;
  const guestsOn = draft.guestListOpen;
  // Ce que les options contiennent, lu sans les déplier.
  const optionsSummary = [
    club.zones.length === 0
      ? "aucune zone"
      : zonesOn.length === club.zones.length
      ? "toutes les zones en vente"
      : `${zonesOn.length} zone${zonesOn.length > 1 ? "s" : ""} en vente`,
    draft.blocked.length > 0 && `${draft.blocked.length} table${draft.blocked.length > 1 ? "s" : ""} gardée${draft.blocked.length > 1 ? "s" : ""}`,
    draft.posterUrl ? "affiche" : "sans affiche",
    ticketUrl && "billetterie",
    guestsOn ? "liste d'invités ouverte" : "liste d'invités fermée",
  ].filter(Boolean);

  const status = event
    ? event.cancelledAt
      ? "Soirée annulée : chaque table a été rendue à son client."
      : event.published
        ? `Publiée · ${formatNight(event.startsAt)}`
        : "Brouillon : invisible des clients tant qu'elle n'est pas publiée."
    : "Quatre champs, puis publiez-la : vos clients réservent leur table sur sa page.";

  return (
    <div className="soirees-page flex flex-col gap-6">
      <div className="g-rise flex flex-col gap-2" style={rise(0)}>
        <BackToSoirees />
        <SectionHeading
          level={1}
          title={event ? event.title : "Nouvelle soirée"}
          sub={status}
          right={
            event ? (
              <div className="flex flex-wrap gap-2">
                {!event.cancelledAt && <GlassButton href={`/gestion/soirees/${event.id}/live`}>Plan du soir</GlassButton>}
                {event.published && (
                  <a
                    href={`${clubSiteUrl}/${clubSlug}/${event.slug}`}
                    target="_blank"
                    rel="noopener"
                    className="g-btn g-btn-secondary g-press"
                  >
                    Voir la page
                    <ExternalLinkIcon />
                  </a>
                )}
              </div>
            ) : undefined
          }
        />
      </div>

      {event?.cancelledAt && pending.length > 0 && (
        <Notice
          title="Tables encore à rendre"
          text={`${pending.length} réservation${pending.length > 1 ? "s" : ""} n'${pending.length > 1 ? "ont" : "a"} pas pu être rendue${pending.length > 1 ? "s" : ""}. Relancer ne rembourse jamais deux fois.`}
          action={
            <GlassButton variant="primary" disabled={saving} onClick={() => void cancelNight()}>
              {saving ? "Remboursements…" : "Relancer les remboursements"}
            </GlassButton>
          }
        />
      )}
      {event?.cancelledAt && pending.length > 0 && (
        <Plate className="divide-y divide-hairline">
          {pending.map((booking) => (
            <div key={booking.id} className="flex min-h-g-control items-center justify-between gap-3 px-4 py-2 text-g-body">
              <span className="min-w-0 truncate">
                {labelOf(booking.tableId)} · {booking.name}
              </span>
              <span className="shrink-0 text-muted tabular-nums">
                {formatCents(booking.totalCents)}
                {failed.includes(booking.id) ? " · échec" : ""}
              </span>
            </div>
          ))}
        </Plate>
      )}

      <Plate className="g-rise flex flex-col gap-4 p-5" style={rise(1)}>
        <h2 className="font-display text-g-h2">La soirée</h2>
        <Field label="Titre" required error={shownError("title")}>
          <Input
            value={draft.title}
            maxLength={CLUB_LIMITS.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Five Stars"
          />
        </Field>
        {editSlug ? (
          <Field
            label="Adresse de la page"
            required
            error={shownError("slug")}
            hint={event?.published ? "La changer casse les liens déjà partagés." : pageUrl}
          >
            <Input
              value={draft.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", e.target.value.toLowerCase());
              }}
              autoCapitalize="none"
              spellCheck={false}
            />
          </Field>
        ) : (
          <p className="-mt-2 flex flex-wrap items-center gap-x-2 text-g-meta text-muted">
            <span className="min-w-0 truncate">{pageUrl}</span>
            <button
              type="button"
              onClick={() => setEditSlug(true)}
              className="g-press min-h-g-control font-medium text-foreground underline underline-offset-4"
            >
              Modifier l&rsquo;adresse
            </button>
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Jour" required error={shownError("date")}>
            <Input type="date" value={draft.date} onChange={(e) => set("date", e.target.value)} />
          </Field>
          <Field label="Ouverture" required error={shownError("start")}>
            <Input type="time" value={draft.start} onChange={(e) => set("start", e.target.value)} />
          </Field>
          <Field
            label="Fermeture"
            required
            error={shownError("end")}
            hint={nextDay && isCalendarDay(draft.date) ? `Le lendemain, ${formatNight(`${shiftDay(draft.date, 1)}T12:00:00Z`)}.` : undefined}
          >
            <Input type="time" value={draft.end} onChange={(e) => set("end", e.target.value)} />
          </Field>
        </div>
        {settled > 0 && (
          <p className="text-g-meta text-muted">Un nouvel horaire est envoyé par e-mail aux clients des tables réglées.</p>
        )}
      </Plate>

      <Plate className="g-rise" style={rise(2)}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-g-h2">Options de la soirée</h2>
            <p className="mt-1 text-g-meta text-muted first-letter:uppercase">{optionsSummary.join(" · ")}</p>
          </div>
          <GlassButton
            aria-expanded={optionsOpen}
            aria-controls={optionsOpen ? "options-soiree" : undefined}
            aria-label={`${optionsOpen ? "Replier" : "Ouvrir"} les options de la soirée`}
            onClick={() => setOptionsOpen(!optionsOpen)}
          >
            {optionsOpen ? "Replier" : "Ouvrir"}
          </GlassButton>
        </div>
        {optionsOpen && (
          <div id="options-soiree" className="border-t border-hairline">
            <Option title="Sur la page" hint="Ce que le client lit sous le titre.">
              <div className="grid gap-4 sm:grid-cols-[14rem_1fr]">
                <Field label="Étiquette" hint="« Showcase », « Étudiants » : affichée sur l'affiche.">
                  <Input value={draft.tag} maxLength={CLUB_LIMITS.tag} onChange={(e) => set("tag", e.target.value)} />
                </Field>
                <Field label="Description">
                  <Textarea
                    value={draft.description}
                    maxLength={CLUB_LIMITS.description}
                    onChange={(e) => set("description", e.target.value)}
                    rows={3}
                    placeholder="Le line-up, l'ambiance, le dress code."
                  />
                </Field>
              </div>
            </Option>

            <Option title="Affiche et billets" hint="Les entrées restent chez votre billetterie : la page y renvoie.">
              <div className="flex flex-wrap items-center gap-4">
                {draft.posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- affiche du club, servie par Supabase Storage
                  <img
                    src={draft.posterUrl}
                    alt="Affiche de la soirée"
                    className="h-36 w-28 rounded-g-card border border-hairline object-cover"
                  />
                ) : (
                  <span className="flex h-36 w-28 items-center justify-center rounded-g-card border border-dashed border-hairline px-3 text-center text-g-meta text-muted">
                    Pas d&rsquo;affiche
                  </span>
                )}
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) void upload(file);
                    }}
                  />
                  <GlassButton variant="primary" disabled={uploading} onClick={() => fileInput.current?.click()}>
                    {uploading ? "Envoi…" : draft.posterUrl ? "Changer l'affiche" : "Ajouter une affiche"}
                  </GlassButton>
                  {draft.posterUrl && <GlassButton onClick={() => set("posterUrl", null)}>Retirer l&rsquo;affiche</GlassButton>}
                </div>
              </div>
              <Field label="Lien de la billetterie" hint="Shotgun, Dice… vide s'il n'y a pas d'entrées en vente." error={shownError("ticketUrl")}>
                <Input
                  type="url"
                  inputMode="url"
                  value={draft.ticketUrl}
                  onChange={(e) => set("ticketUrl", e.target.value)}
                  placeholder="https://shotgun.live/events/…"
                />
              </Field>
            </Option>

            {club.zones.length > 0 && (
            <Option title="Tables en vente" hint="Les zones ouvertes ce soir et leur prix. Vide, le prix est celui de la zone.">
              <ul className="flex flex-col gap-4">
                {club.zones.map((zone) => {
                  const zoneDraft = draft.zones[zone.id] ?? { on: false, price: "" };
                  const count = club.tables.filter((table) => table.zoneId === zone.id).length;
                  return (
                    <li key={zone.id} className="grid gap-x-4 gap-y-3 sm:grid-cols-[1fr_10rem] sm:items-start">
                      <Switch
                        checked={zoneDraft.on}
                        onChange={(on) => {
                          set("zones", { ...draft.zones, [zone.id]: { ...zoneDraft, on } });
                          if (on && !planZone) setPlanZoneId(zone.id);
                        }}
                        label={zone.name}
                        hint={`${count} table${count > 1 ? "s" : ""} · ${formatCents(zone.priceCents)}${zone.inclus ? ` · ${zone.inclus}` : ""}`}
                      />
                      {zoneDraft.on && (
                        <Field label="Prix ce soir" error={showErrors ? zoneError(zone.id) : undefined}>
                          <EurosInput
                            value={zoneDraft.price}
                            onChange={(price) => set("zones", { ...draft.zones, [zone.id]: { ...zoneDraft, price } })}
                            placeholder={eurosToInput(zone.priceCents)}
                            label={`Prix d'une table ${zone.name} ce soir`}
                          />
                        </Field>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Option>
            )}

            {planZone && (

              <Option
                title="Tables gardées"
                hint="Touchez une table pour la garder hors vente ce soir : artiste, habitués. Vous pourrez toujours la réserver vous-même."
              >
                {zonesOn.length > 1 && (
                  <div className="seg-defile">
                    <Segmented
                      label="Zone du plan"
                      glass={false}
                      options={zonesOn.map((zone) => ({
                        value: zone.id,
                        label: blockedIn(zone.id) > 0 ? `${zone.name} · ${blockedIn(zone.id)}` : zone.name,
                      }))}
                      value={planZone.id}
                      onChange={setPlanZoneId}
                    />
                  </div>
                )}
                <NightPlan
                  key={planZone.id}
                  compact
                  zone={planZone}
                  tables={planTables}
                  states={planStates}
                  onSelect={(table) => toggleBlocked(table.id)}
                  describe={(table, state) =>
                    `${tableName(planZone.name, table.label)}, ${table.seats} places, ${
                      state === "libre" ? "en vente" : (TABLE_STATE_LABELS[state] ?? state).toLowerCase()
                    }`
                  }
                />
                <PlanLegend states={["libre", "gardee", "payee", "attente"]} />
              </Option>
            )}

            <Option title="Liste d'invités" hint="Une inscription gratuite depuis la page de la soirée ; l'équipe coche les arrivées à la porte.">
              <Switch checked={guestsOn} onChange={(open) => set("guestListOpen", open)} label="Inscriptions ouvertes" />
              {guestsOn && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Places sur la liste" hint="Vide : sans plafond." error={shownError("capacity")}>
                    <Input
                      numeric
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={draft.guestCapacity}
                      onChange={(e) => set("guestCapacity", e.target.value)}
                    />
                  </Field>
                  <Field label="Personnes par inscription" hint={`Entre 1 et ${CLUB_LIMITS.guestMaxParty}.`} error={shownError("maxParty")}>
                    <Input
                      numeric
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={CLUB_LIMITS.guestMaxParty}
                      value={draft.guestMaxParty}
                      onChange={(e) => set("guestMaxParty", e.target.value)}
                    />
                  </Field>
                </div>
              )}
            </Option>
          </div>
        )}
      </Plate>

      {event && !event.cancelledAt && !ended && (
        <Plate className="g-rise flex flex-wrap items-center justify-between gap-4 p-5" style={rise(3)}>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-g-h2">Annuler la soirée</h2>
            <p className="mt-1 text-g-meta text-muted">
              Chaque table est rendue à son client, remboursée si elle a été payée en ligne, et le client prévenu par e-mail.
            </p>
          </div>
          <GlassButton variant="danger" disabled={saving} onClick={() => setConfirmCancel(true)}>
            Annuler la soirée
          </GlassButton>
        </Plate>
      )}

      <div className="soirees-barre g-glass g-rise flex flex-wrap items-center justify-end gap-2 px-3 py-2 sm:gap-3 sm:px-4" style={rise(4)}>
        {/* L'état de la soirée se lit d'un coup d'œil : rien de neuf, à enregistrer, enregistré. */}
        <p className="mr-auto flex min-w-0 items-center gap-2 text-g-label" aria-live="polite">
          {saving ? (
            <span className="text-muted">Enregistrement…</span>
          ) : showErrors && !valid ? (
            <>
              <AlertIcon className="size-4 shrink-0 text-ember-3" />
              <span className="font-medium">Un champ est à corriger</span>
            </>
          ) : !event ? (
            <span className="text-muted">Pas encore créée</span>
          ) : dirty ? (
            <>
              <span className="size-2 shrink-0 rounded-full bg-ember-1" aria-hidden />
              <span className="font-medium">À enregistrer</span>
            </>
          ) : (
            <span className="text-muted">Enregistré</span>
          )}
        </p>
        {event ? (
          <>
            {!event.cancelledAt && (
              <GlassButton disabled={saving} onClick={() => void save(!event.published)}>
                {event.published ? "Repasser en brouillon" : "Publier"}
              </GlassButton>
            )}
            {dirty && (
              <GlassButton variant="primary" disabled={saving} onClick={() => void save()}>
                Enregistrer
              </GlassButton>
            )}
          </>
        ) : (
          <>
            <GlassButton disabled={saving} onClick={() => void save()}>
              Créer en brouillon
            </GlassButton>
            <GlassButton variant="primary" disabled={saving} onClick={() => void save(true)}>
              Créer et publier
            </GlassButton>
          </>
        )}
      </div>

      {confirmCancel && event && (
        <ConfirmSheet
          title={`Annuler « ${event.title} » ?`}
          text={`La soirée reste affichée, marquée annulée, et plus aucune table ne s'y vend. ${
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
