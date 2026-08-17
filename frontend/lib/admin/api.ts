import { createClient } from "@/lib/supabase/client";
import { check, must } from "@/lib/supabase/result";
import {
  CONTACT_ACTIVITY_TYPES,
  CSV_IMPORT_CHUNK_SIZE,
} from "./constants";
import { addDays, dayStart } from "./format";
import { patchDetail, refreshDetail } from "./lead-cache";
import {
  LEAD_LITE_SELECT,
  rowToActivity,
  rowToAppointment,
  rowToContact,
  rowToLead,
  rowToLeadLite,
  rowToRestaurant,
  rowToTask,
  toJson,
} from "./mappers";
import { slugify, uniqueSlug } from "./slug";
import { commit, getState, reloadLeads } from "./store";
import type {
  Activity,
  ActivityType,
  AdminState,
  AppointmentRow,
  AppointmentType,
  Contact,
  GeoPoint,
  Lead,
  LeadLite,
  LeadStatus,
  Priority,
  Restaurant,
  RestaurantCategory,
  TaskRow,
} from "./types";

/*
 * Surface de mutation du CRM : chaque fonction écrit dans Supabase (RLS +
 * triggers font autorité) puis répercute le changement sur le snapshot du
 * store et, si la fiche est ouverte, sur le lead-cache. Les écrans ne
 * connaissent que cette surface (convention lib/gestion/api.ts).
 */

function apply<T>(recipe: (draft: AdminState) => T): T {
  const draft = structuredClone(getState());
  const result = recipe(draft);
  commit(draft);
  return result;
}

const userId = () => getState().userId;

function findLite(draft: AdminState, restaurantId: string): LeadLite {
  const row = draft.leads.find((lead) => lead.restaurantId === restaurantId);
  if (!row) throw new Error("Restaurant introuvable.");
  return row;
}

const liteFor = (restaurantId: string): LeadLite =>
  findLite(getState(), restaurantId);

/** Tâches triées par échéance croissante, sans échéance en dernier. */
const byDue = (a: TaskRow, b: TaskRow) =>
  (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999");

/** Rejoue la règle du trigger crm_sync_next_follow_up sur le snapshot. */
function recomputeFollowUp(draft: AdminState, restaurantId: string) {
  const dues = draft.tasks
    .filter(
      (task) =>
        task.restaurantId === restaurantId &&
        task.status === "open" &&
        task.dueAt !== null
    )
    .map((task) => task.dueAt as string);
  findLite(draft, restaurantId).nextFollowUpAt =
    dues.length > 0 ? dues.sort()[0] : null;
}

// ---------------------------------------------------------------------------
// Lead

export async function updateLeadStatus(
  restaurantId: string,
  status: LeadStatus
): Promise<void> {
  const supabase = createClient();
  check(
    await supabase
      .from("crm_leads")
      .update({ status })
      .eq("restaurant_id", restaurantId)
  );
  apply((draft) => {
    findLite(draft, restaurantId).status = status;
  });
  patchDetail(restaurantId, (draft) => {
    draft.lead.status = status;
  });
  // L'activité « changement de statut » est posée par le trigger Postgres.
  refreshDetail(restaurantId);
}

export interface MarkVisitedInput {
  note?: string;
  coords?: GeoPoint | null;
  /** ISO de la relance à créer, ou null. */
  followUpAt?: string | null;
}

/** Flux terrain : statut Visité + activité (géolocalisée si possible) + relance. */
export async function markVisited(
  restaurantId: string,
  input: MarkVisitedInput
): Promise<void> {
  const supabase = createClient();
  const lite = liteFor(restaurantId);
  const nowIso = new Date().toISOString();

  check(
    await supabase
      .from("crm_leads")
      .update({ status: "visited", last_contact_at: nowIso })
      .eq("id", lite.leadId)
  );
  const activityRow = must(
    await supabase
      .from("crm_activities")
      .insert({
        restaurant_id: restaurantId,
        lead_id: lite.leadId,
        type: "visit",
        description: input.note?.trim() || null,
        metadata: input.coords ? toJson(input.coords) : {},
        created_by: userId(),
      })
      .select()
      .single()
  );
  const taskRow = input.followUpAt
    ? must(
        await supabase
          .from("crm_tasks")
          .insert({
            restaurant_id: restaurantId,
            lead_id: lite.leadId,
            title: `Relancer ${lite.name}`,
            due_at: input.followUpAt,
            created_by: userId(),
          })
          .select()
          .single()
      )
    : null;

  apply((draft) => {
    const row = findLite(draft, restaurantId);
    row.status = "visited";
    row.lastContactAt = nowIso;
    if (taskRow) {
      draft.tasks = [...draft.tasks, rowToTask(taskRow)].sort(byDue);
      recomputeFollowUp(draft, restaurantId);
    }
  });
  patchDetail(restaurantId, (draft) => {
    draft.lead.status = "visited";
    draft.lead.lastContactAt = nowIso;
    draft.activities.unshift(rowToActivity(activityRow));
    if (taskRow) draft.tasks.unshift(rowToTask(taskRow));
  });
  refreshDetail(restaurantId);
}

// ---------------------------------------------------------------------------
// Activités

export interface ActivityInput {
  type: ActivityType;
  title?: string;
  description?: string;
}

export async function addActivity(
  restaurantId: string,
  input: ActivityInput
): Promise<Activity> {
  const supabase = createClient();
  const lite = liteFor(restaurantId);
  const row = must(
    await supabase
      .from("crm_activities")
      .insert({
        restaurant_id: restaurantId,
        lead_id: lite.leadId,
        type: input.type,
        title: input.title?.trim() || null,
        description: input.description?.trim() || null,
        created_by: userId(),
      })
      .select()
      .single()
  );

  const isContact = CONTACT_ACTIVITY_TYPES.includes(input.type);
  if (isContact) {
    check(
      await supabase
        .from("crm_leads")
        .update({ last_contact_at: row.created_at })
        .eq("id", lite.leadId)
    );
  }

  const activity = rowToActivity(row);
  if (isContact) {
    apply((draft) => {
      findLite(draft, restaurantId).lastContactAt = row.created_at;
    });
  }
  patchDetail(restaurantId, (draft) => {
    draft.activities.unshift(activity);
    if (isContact) draft.lead.lastContactAt = row.created_at;
  });
  return activity;
}

export async function updateImportantNotes(
  restaurantId: string,
  text: string
): Promise<void> {
  const supabase = createClient();
  const value = text.trim() || null;
  check(
    await supabase
      .from("crm_restaurants")
      .update({ important_notes: value })
      .eq("id", restaurantId)
  );
  patchDetail(restaurantId, (draft) => {
    draft.restaurant.importantNotes = value;
  });
}

// ---------------------------------------------------------------------------
// Restaurants

export interface RestaurantInput {
  name: string;
  category: RestaurantCategory;
  address?: string;
  city?: string;
  postalCode?: string;
  latitude: number | null;
  longitude: number | null;
  phone?: string;
  email?: string;
  website?: string;
  ownerName?: string;
}

/** Slug unique contre la base (suffixe -2, -3… si déjà pris). */
async function availableSlug(name: string, city?: string): Promise<string> {
  const supabase = createClient();
  const base = slugify(name, city);
  const rows = must(
    await supabase
      .from("crm_restaurants")
      .select("slug")
      .like("slug", `${base}%`)
  );
  return uniqueSlug(base, new Set(rows.map((row) => row.slug)));
}

export async function createRestaurant(
  input: RestaurantInput
): Promise<string> {
  const supabase = createClient();
  const slug = await availableSlug(input.name, input.city);
  const inserted = must(
    await supabase
      .from("crm_restaurants")
      .insert({
        name: input.name.trim(),
        slug,
        category: input.category,
        address: input.address?.trim() || null,
        city: input.city?.trim() || null,
        postal_code: input.postalCode?.trim() || null,
        latitude: input.latitude,
        longitude: input.longitude,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        website: input.website?.trim() || null,
        owner_name: input.ownerName?.trim() || null,
      })
      .select("id")
      .single()
  );
  // Relit la ligne légère complète : le lead vient d'être créé par trigger.
  const row = must(
    await supabase
      .from("crm_restaurants")
      .select(LEAD_LITE_SELECT)
      .eq("id", inserted.id)
      .single()
  );
  const lite = rowToLeadLite(row);
  if (lite) {
    apply((draft) => {
      draft.leads = [...draft.leads, lite].sort((a, b) =>
        a.name.localeCompare(b.name, "fr")
      );
    });
  }
  return inserted.id;
}

export interface DuplicateCandidate {
  restaurantId: string;
  name: string;
  city: string | null;
  reason: string;
}

/** Candidats doublons (téléphone, email, nom proche) avant création manuelle. */
export async function findDuplicates(input: {
  name: string;
  city?: string;
  phone?: string;
  email?: string;
}): Promise<DuplicateCandidate[]> {
  const supabase = createClient();
  const rows = must(
    await supabase.rpc("crm_find_duplicates", {
      p_name: input.name,
      p_city: input.city || null,
      p_phone: input.phone || null,
      p_email: input.email || null,
    })
  );
  return rows.map((row) => ({
    restaurantId: row.restaurant_id,
    name: row.name,
    city: row.city,
    reason: row.reason,
  }));
}

// ---------------------------------------------------------------------------
// Tâches

export interface TaskInput {
  title: string;
  description?: string;
  dueAt: string | null;
  priority: Priority;
  restaurantId?: string | null;
}

export async function createTask(input: TaskInput): Promise<TaskRow> {
  const supabase = createClient();
  const lite = input.restaurantId ? liteFor(input.restaurantId) : null;
  const row = must(
    await supabase
      .from("crm_tasks")
      .insert({
        restaurant_id: lite?.restaurantId ?? null,
        lead_id: lite?.leadId ?? null,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        due_at: input.dueAt,
        priority: input.priority,
        created_by: userId(),
      })
      .select()
      .single()
  );
  const task = rowToTask(row);
  apply((draft) => {
    draft.tasks = [...draft.tasks, task].sort(byDue);
    if (task.restaurantId) recomputeFollowUp(draft, task.restaurantId);
  });
  if (task.restaurantId) {
    patchDetail(task.restaurantId, (draft) => {
      draft.tasks.unshift(task);
    });
  }
  return task;
}

export async function updateTask(
  taskId: string,
  input: TaskInput
): Promise<TaskRow> {
  const supabase = createClient();
  const lite = input.restaurantId ? liteFor(input.restaurantId) : null;
  const row = must(
    await supabase
      .from("crm_tasks")
      .update({
        restaurant_id: lite?.restaurantId ?? null,
        lead_id: lite?.leadId ?? null,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        due_at: input.dueAt,
        priority: input.priority,
      })
      .eq("id", taskId)
      .select()
      .single()
  );
  const task = rowToTask(row);
  const previousRestaurantId = apply((draft) => {
    const previous = draft.tasks.find((t) => t.id === taskId);
    draft.tasks = draft.tasks
      .filter((t) => t.id !== taskId)
      .concat(task)
      .sort(byDue);
    if (previous?.restaurantId) recomputeFollowUp(draft, previous.restaurantId);
    if (task.restaurantId && task.restaurantId !== previous?.restaurantId) {
      recomputeFollowUp(draft, task.restaurantId);
    }
    return previous?.restaurantId ?? null;
  });
  // Réaffectation : la tâche quitte aussi la fiche de l'ancien restaurant.
  if (previousRestaurantId && previousRestaurantId !== task.restaurantId) {
    patchDetail(previousRestaurantId, (draft) => {
      draft.tasks = draft.tasks.filter((t) => t.id !== taskId);
    });
  }
  if (task.restaurantId) {
    patchDetail(task.restaurantId, (draft) => {
      const index = draft.tasks.findIndex((t) => t.id === taskId);
      if (index === -1) draft.tasks.unshift(task);
      else draft.tasks[index] = task;
    });
  }
  return task;
}

export async function completeTask(taskId: string): Promise<void> {
  const supabase = createClient();
  const completedAt = new Date().toISOString();
  const row = must(
    await supabase
      .from("crm_tasks")
      .update({ status: "done", completed_at: completedAt })
      .eq("id", taskId)
      .select()
      .single()
  );
  apply((draft) => {
    // Le store ne garde que les tâches ouvertes.
    draft.tasks = draft.tasks.filter((t) => t.id !== taskId);
    if (row.restaurant_id) recomputeFollowUp(draft, row.restaurant_id);
  });
  if (row.restaurant_id) {
    patchDetail(row.restaurant_id, (draft) => {
      const task = draft.tasks.find((t) => t.id === taskId);
      if (task) {
        task.status = "done";
        task.completedAt = completedAt;
      }
    });
  }
}

/** Tâches terminées/annulées récentes, pour l'onglet « Terminées ». */
export async function fetchClosedTasks(sinceDays: number): Promise<TaskRow[]> {
  const supabase = createClient();
  const rows = must(
    await supabase
      .from("crm_tasks")
      .select("*")
      .neq("status", "open")
      .gte("completed_at", addDays(dayStart(), -sinceDays).toISOString())
      .order("completed_at", { ascending: false })
  );
  return rows.map(rowToTask);
}

// ---------------------------------------------------------------------------
// Rendez-vous

export interface AppointmentInput {
  restaurantId: string;
  contactId?: string | null;
  title: string;
  startAt: string;
  endAt: string | null;
  location?: string;
  notes?: string;
  type: AppointmentType;
}

export async function createAppointment(
  input: AppointmentInput
): Promise<AppointmentRow> {
  const supabase = createClient();
  const lite = liteFor(input.restaurantId);
  const row = must(
    await supabase
      .from("crm_appointments")
      .insert({
        restaurant_id: input.restaurantId,
        contact_id: input.contactId ?? null,
        title: input.title.trim(),
        start_at: input.startAt,
        end_at: input.endAt,
        location: input.location?.trim() || null,
        notes: input.notes?.trim() || null,
        type: input.type,
        created_by: userId(),
      })
      .select()
      .single()
  );
  // Trace du RDV dans le fil d'activité de la fiche.
  const activityRow = must(
    await supabase
      .from("crm_activities")
      .insert({
        restaurant_id: input.restaurantId,
        lead_id: lite.leadId,
        type: "appointment",
        title: input.title.trim(),
        metadata: toJson({ appointment_id: row.id, start_at: input.startAt }),
        created_by: userId(),
      })
      .select()
      .single()
  );
  const appointment = rowToAppointment(row);
  apply((draft) => {
    if (appointment.startAt >= dayStart().toISOString()) {
      draft.appointments = [...draft.appointments, appointment].sort((a, b) =>
        a.startAt.localeCompare(b.startAt)
      );
    }
  });
  patchDetail(input.restaurantId, (draft) => {
    draft.appointments.unshift(appointment);
    draft.activities.unshift(rowToActivity(activityRow));
  });
  return appointment;
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentRow["status"]
): Promise<void> {
  const supabase = createClient();
  const row = must(
    await supabase
      .from("crm_appointments")
      .update({ status })
      .eq("id", appointmentId)
      .select()
      .single()
  );
  apply((draft) => {
    // Le store ne garde que les RDV encore prévus.
    draft.appointments = draft.appointments.filter(
      (a) => a.id !== appointmentId
    );
  });
  patchDetail(row.restaurant_id, (draft) => {
    const appointment = draft.appointments.find((a) => a.id === appointmentId);
    if (appointment) appointment.status = status;
  });
}

/** RDV de la fenêtre demandée, tous statuts (page RDV). */
export async function fetchAppointments(range: {
  from: string;
  to: string;
}): Promise<AppointmentRow[]> {
  const supabase = createClient();
  const rows = must(
    await supabase
      .from("crm_appointments")
      .select("*")
      .gte("start_at", range.from)
      .lte("start_at", range.to)
      .order("start_at", { ascending: true })
  );
  return rows.map(rowToAppointment);
}

// ---------------------------------------------------------------------------
// Tableau de bord

export interface WeeklyActivityCounts {
  visits: number;
  calls: number;
  emails: number;
  appointments: number;
}

/** Activité des 7 derniers jours glissants. */
export async function fetchWeeklyActivityCounts(): Promise<WeeklyActivityCounts> {
  const supabase = createClient();
  const since = addDays(dayStart(), -6).toISOString();
  const countOf = async (type: ActivityType) => {
    const { count, error } = await supabase
      .from("crm_activities")
      .select("*", { count: "exact", head: true })
      .eq("type", type)
      .gte("created_at", since);
    if (error) throw new Error(error.message);
    return count ?? 0;
  };
  const [visits, calls, emails, appointments] = await Promise.all([
    countOf("visit"),
    countOf("call"),
    countOf("email"),
    countOf("appointment"),
  ]);
  return { visits, calls, emails, appointments };
}

// ---------------------------------------------------------------------------
// Export & import CSV

export interface ExportRow {
  restaurant: Restaurant;
  lead: Lead;
  mainContact: Contact | null;
  activityCount: number;
  openTaskCount: number;
}

/** Lignes jointes de l'export, par lots d'ids (l'URL PostgREST est bornée). */
export async function fetchExportRows(
  restaurantIds: string[]
): Promise<ExportRow[]> {
  const supabase = createClient();
  const result: ExportRow[] = [];
  const BATCH = 100;
  for (let i = 0; i < restaurantIds.length; i += BATCH) {
    const rows = must(
      await supabase
        .from("crm_restaurants")
        .select(
          "*, lead:crm_leads(*), contacts:crm_contacts(*), activities:crm_activities(count), tasks:crm_tasks(count)"
        )
        // Sans ce filtre, le compte embarqué inclurait les tâches terminées.
        .eq("tasks.status", "open")
        .in("id", restaurantIds.slice(i, i + BATCH))
    );
    for (const row of rows) {
      if (!row.lead) continue;
      const contacts = [...row.contacts].sort(
        (a, b) => Number(b.is_decision_maker) - Number(a.is_decision_maker)
      );
      result.push({
        restaurant: rowToRestaurant(row),
        lead: rowToLead(row.lead),
        mainContact: contacts[0] ? rowToContact(contacts[0]) : null,
        activityCount: row.activities[0]?.count ?? 0,
        openTaskCount: row.tasks[0]?.count ?? 0,
      });
    }
  }
  // PostgREST renvoie chaque lot dans l'ordre de la base, pas celui des ids :
  // on réaligne sur l'ordre demandé (celui du tri à l'écran).
  const rank = new Map(restaurantIds.map((id, index) => [id, index]));
  return result.sort(
    (a, b) => (rank.get(a.restaurant.id) ?? 0) - (rank.get(b.restaurant.id) ?? 0)
  );
}

export interface ImportRow {
  name: string;
  address?: string;
  city?: string;
  postalCode?: string;
  latitude: number | null;
  longitude: number | null;
  phone?: string;
  email?: string;
  website?: string;
  menuUrl?: string;
  category: RestaurantCategory;
}

export class ImportError extends Error {
  /** Lignes déjà insérées avant l'échec — la reprise saute celles-ci. */
  inserted: number;
  constructor(message: string, inserted: number) {
    super(message);
    this.inserted = inserted;
  }
}

/**
 * Insertion par lots. Un lot est atomique ; en cas d'échec, l'import
 * s'arrête et ImportError.inserted permet de reprendre au lot suivant.
 */
export async function importRestaurants(
  rows: ImportRow[],
  onProgress?: (done: number, total: number) => void
): Promise<number> {
  const supabase = createClient();
  const taken = new Set(await fetchAllSlugs());
  const inserts = rows.map((row) => ({
    name: row.name.trim(),
    slug: uniqueSlug(slugify(row.name, row.city), taken),
    category: row.category,
    address: row.address?.trim() || null,
    city: row.city?.trim() || null,
    postal_code: row.postalCode?.trim() || null,
    latitude: row.latitude,
    longitude: row.longitude,
    phone: row.phone?.trim() || null,
    email: row.email?.trim() || null,
    website: row.website?.trim() || null,
    menu_url: row.menuUrl?.trim() || null,
    source: "csv_import",
  }));

  for (let i = 0; i < inserts.length; i += CSV_IMPORT_CHUNK_SIZE) {
    const chunk = inserts.slice(i, i + CSV_IMPORT_CHUNK_SIZE);
    const { error } = await supabase.from("crm_restaurants").insert(chunk);
    if (error) {
      await reloadLeads();
      throw new ImportError(error.message, i);
    }
    onProgress?.(Math.min(i + chunk.length, inserts.length), inserts.length);
  }
  await reloadLeads();
  return inserts.length;
}

async function fetchAllSlugs(): Promise<string[]> {
  const supabase = createClient();
  const PAGE = 1000;
  const slugs: string[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("crm_restaurants")
      .select("slug")
      // Ordre stable obligatoire : sans lui, des pages .range() successives
      // peuvent se chevaucher et rater des slugs au-delà de 1000 lignes.
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    slugs.push(...batch.map((row) => row.slug));
    if (batch.length < PAGE) return slugs;
  }
}
