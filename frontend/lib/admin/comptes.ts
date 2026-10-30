import { OFFRE_LABELS, ROLE_LABELS } from "@/lib/gestion/constants";
import type { Offre, Role } from "@/lib/gestion/types";
import { createClient } from "@/lib/supabase/client";
import type { Database, Tables } from "@/lib/supabase/database.types";
import { must } from "@/lib/supabase/result";

/*
 * L'écran Comptes : tous les comptes d'Ominin et leurs accès. La lecture passe
 * par des fonctions gardées par admin_require ; toute action passe par une route
 * serveur, qui l'annonce sur Discord et détient seule le service_role.
 */

export type AccountEvent = Tables<"admin_account_events">;
export type Scope =
  Database["public"]["Functions"]["admin_account_scopes"]["Returns"][number];

export type RoleKind = "menu" | "shop";

export type FeeField = "platform_fee_percent" | "collect_fee_percent" | "table_fee_percent";

export interface RoleAccess {
  kind: RoleKind;
  id: string;
  name: string;
  role: string;
  demo: boolean;
  offre?: string | null;
  subscriptions?: Record<string, string | null> | null;
  fees: Partial<Record<FeeField, number | null>>;
}

/** Les taux réglables de chaque type d'accès. */
export const FEE_FIELDS: Record<RoleKind, { key: FeeField; label: string }[]> = {
  menu: [
    { key: "platform_fee_percent", label: "Menu" },
    { key: "collect_fee_percent", label: "Collect" },
    { key: "table_fee_percent", label: "Club" },
  ],
  shop: [{ key: "platform_fee_percent", label: "Shop" }],
};

/** Une action de l'écran Comptes, jouée par /api/admin/comptes. */
export type AccountAction = { userId: string } & (
  | { type: "admin"; admin: boolean }
  | { type: "access"; kind: RoleKind; scopeId: string; role: string | null }
  | { type: "suspend"; suspended: boolean }
  | { type: "commission"; kind: RoleKind; scopeId: string; field: FeeField; percent: number }
);

/** Accès posés par leurs propres parcours (contrat, activation) : lus ici. */
export interface ProductAccess {
  kind: "clip" | "agents" | "commercial";
  name: string | null;
  active?: boolean;
}

export type Access = RoleAccess | ProductAccess;

export interface Account {
  user_id: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
  is_admin: boolean;
  access: Access[];
}

export const ACCESS_KIND_LABELS: Record<Access["kind"], string> = {
  menu: "Menu",
  shop: "Shop",
  clip: "Clip",
  agents: "Agents",
  commercial: "Commercial",
};

export const ROLE_OPTIONS: Record<RoleKind, { value: string; label: string }[]> = {
  menu: (Object.keys(ROLE_LABELS) as Role[]).map((role) => ({
    value: role,
    label: ROLE_LABELS[role],
  })),
  shop: [
    { value: "proprietaire", label: "Propriétaire" },
    { value: "equipe", label: "Équipe" },
  ],
};

const roleLabel = (access: RoleAccess): string =>
  ROLE_OPTIONS[access.kind].find((option) => option.value === access.role)?.label ??
  access.role;

/** « Menu · Le Boho · Smart · Gérant · collect : active » */
export function accessSummary(access: Access): string {
  const kind = ACCESS_KIND_LABELS[access.kind];
  if (!isRoleAccess(access)) {
    const state = access.active === false ? "inactif" : null;
    return [kind, access.name, state].filter(Boolean).join(" · ");
  }
  const offre = access.offre ? OFFRE_LABELS[access.offre as Offre] : null;
  const billing = Object.entries(access.subscriptions ?? {})
    .filter(([, status]) => status)
    .map(([product, status]) =>
      product === "collect" ? `Collect : ${status}` : `abonnement : ${status}`
    );
  const commission = access.fees?.platform_fee_percent;
  return [
    kind,
    access.name,
    offre,
    roleLabel(access),
    commission != null ? `commission ${commission} %` : null,
    ...billing,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function eventLabel(event: AccountEvent): string {
  const detail = (event.detail ?? {}) as {
    kind?: RoleKind;
    name?: string;
    field?: FeeField;
    from?: string | number | null;
    to?: string | number | null;
  };
  const role = (value: string | number | null | undefined) =>
    detail.kind
      ? (ROLE_OPTIONS[detail.kind].find((option) => option.value === value)?.label ?? value)
      : value;
  switch (event.action) {
    case "admin_grant":
      return "Accès admin donné";
    case "admin_revoke":
      return "Accès admin retiré";
    case "suspend":
      return "Compte suspendu";
    case "restore":
      return "Compte réactivé";
    case "access":
      if (!detail.from) return `Ajouté à ${detail.name} : ${role(detail.to)}`;
      if (!detail.to) return `Retiré de ${detail.name}`;
      return `${detail.name} : ${role(detail.from)} → ${role(detail.to)}`;
    case "commission": {
      const field = detail.kind && FEE_FIELDS[detail.kind].find((candidate) => candidate.key === detail.field);
      return `${detail.name} : commission ${field?.label ?? ""} ${detail.from ?? 0} % → ${detail.to} %`;
    }
    default:
      return event.action;
  }
}

export const isRoleAccess = (access: Access): access is RoleAccess =>
  access.kind === "menu" || access.kind === "shop";

export const isSuspended = (account: Account): boolean =>
  account.banned_until !== null && new Date(account.banned_until) > new Date();

export const accountLabel = (account: Account): string =>
  account.email ?? account.phone ?? account.user_id;

export async function fetchAccounts(): Promise<Account[]> {
  const rows = await createClient().rpc("admin_accounts").then(must);
  return rows as unknown as Account[];
}

export async function fetchScopes(): Promise<Scope[]> {
  return createClient().rpc("admin_account_scopes").then(must);
}

export async function fetchAccountEvents(
  userId: string
): Promise<AccountEvent[]> {
  return createClient()
    .from("admin_account_events")
    .select("*")
    .eq("target_id", userId)
    .order("created_at", { ascending: false })
    .then(must);
}

/** Rend vrai si l'action est faite mais n'a pas pu être annoncée sur Discord. */
export async function runAccountAction(action: AccountAction): Promise<boolean> {
  const response = await fetch("/api/admin/comptes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(action),
  });
  const body = (await response.json().catch(() => null)) as {
    error?: string;
    journalFailed?: boolean;
  } | null;
  if (!response.ok) throw new Error(body?.error ?? "Une erreur est survenue.");
  return body?.journalFailed === true;
}
