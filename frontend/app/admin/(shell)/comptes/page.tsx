"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AccountPanel } from "@/components/admin/comptes/account-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { inputClass } from "@/components/ui/field";
import { PillTabs } from "@/components/ui/pill-tabs";
import { useToast } from "@/components/ui/toast";
import {
  ACCESS_KIND_LABELS,
  accessSummary,
  accountLabel,
  fetchAccounts,
  isSuspended,
  type Access,
  type Account,
} from "@/lib/admin/comptes";
import { formatRelative } from "@/lib/admin/format";
import { createClient } from "@/lib/supabase/client";

const KINDS: readonly Access["kind"][] = ["menu", "shop", "clip", "agents", "commercial"];

function matches(account: Account, filter: string): boolean {
  if (filter === "all") return true;
  if (filter === "admin") return account.is_admin;
  if (filter === "suspended") return isSuspended(account);
  return account.access.some((access) => access.kind === filter);
}

export default function ComptesPage() {
  const toast = useToast();
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setAccounts(await fetchAccounts());
  }, []);

  useEffect(() => {
    // Faux positif : le setState de load() suit la réponse réseau.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((error) => {
      const message =
        error instanceof Error ? error.message : "Une erreur est survenue.";
      setLoadError(message);
      toast.error(message);
    });
    void createClient()
      .auth.getUser()
      .then(({ data }) => setSelfId(data.user?.id ?? null));
    // toast est stable (contexte) ; l'écran ne se charge qu'une fois.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const tabs = useMemo(() => {
    const list = accounts ?? [];
    const count = (id: string) => list.filter((account) => matches(account, id)).length;
    return [
      { id: "all", label: "Tous", count: list.length },
      { id: "admin", label: "Admins", count: count("admin") },
      ...KINDS.map((kind) => ({
        id: kind,
        label: ACCESS_KIND_LABELS[kind],
        count: count(kind),
      })),
      { id: "suspended", label: "Suspendus", count: count("suspended") },
    ];
  }, [accounts]);

  if (loadError) {
    return <EmptyState title="Chargement impossible" body={loadError} />;
  }
  if (!accounts) {
    return (
      <div aria-busy className="flex flex-col gap-3">
        <div className="shimmer h-9 w-44 rounded-xl" />
        <div className="shimmer h-64 rounded-2xl" />
      </div>
    );
  }

  const needle = search.trim().toLowerCase();
  const visible = accounts.filter(
    (account) =>
      matches(account, filter) &&
      (!needle ||
        accountLabel(account).toLowerCase().includes(needle) ||
        account.access.some((access) => access.name?.toLowerCase().includes(needle)))
  );
  const selected = accounts.find((account) => account.user_id === selectedId);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-medium">Comptes</h1>
        <p className="mt-1 text-sm text-muted">
          Tous les comptes d&apos;Ominin : ce à quoi chacun a accès, sur quelle
          offre et avec quel rôle.
        </p>
      </div>

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Chercher un e-mail, un téléphone, un restaurant…"
        className={inputClass}
      />
      <PillTabs tabs={tabs} activeId={filter} onSelect={setFilter} />

      {visible.length === 0 ? (
        <EmptyState title="Aucun compte" body="Rien ne correspond à cette recherche." />
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((account) => (
            <li key={account.user_id}>
              <button
                type="button"
                onClick={() => setSelectedId(account.user_id)}
                className="flex w-full flex-col gap-1 rounded-2xl border border-hairline bg-surface p-4 text-left transition-colors hover:border-ember-2/40"
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 truncate text-sm font-semibold">
                    {accountLabel(account)}
                  </span>
                  {account.is_admin && (
                    <span className="rounded-full border border-ember-2/40 px-2 py-0.5 text-[10px] font-semibold text-ember-1">
                      Admin
                    </span>
                  )}
                  {isSuspended(account) && (
                    <span className="rounded-full border border-ember-3/50 bg-ember-3/10 px-2 py-0.5 text-[10px] font-semibold text-ember-3">
                      Suspendu
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted">
                  {account.access.length > 0
                    ? account.access.map(accessSummary).join(" · ")
                    : "Aucun accès"}
                </span>
                <span className="text-xs text-faint">
                  {account.last_sign_in_at
                    ? `Connexion ${formatRelative(account.last_sign_in_at)}`
                    : "Jamais connecté"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <AccountPanel
          account={selected}
          isSelf={selected.user_id === selfId}
          onChanged={load}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
