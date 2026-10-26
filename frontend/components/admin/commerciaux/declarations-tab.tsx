"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RestaurantPicker } from "@/components/admin/restaurant-picker";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import {
  addSameOwner,
  decide,
  fetchClientPlaces,
  fetchCommerciaux,
  fetchDeclarations,
  markSigned,
  reassign,
  recordEmailDeclaration,
  setInTalks,
  type AdminDeclaration,
  type ClientPlace,
  type CommercialRow,
  type EmailState,
} from "@/lib/admin/commerciaux";
import { useAdminBasePath } from "@/lib/admin/base-path";
import { formatDate, formatRelative, fromDatetimeLocalValue } from "@/lib/admin/format";
import type { LeadLite } from "@/lib/admin/types";
import {
  CONTACT_ROLES,
  END_LABELS,
  PRODUCT_CHOICES,
  REFUSAL_LABELS,
  STATUS_LABELS,
  type Product,
} from "@/lib/commercial/labels";
import { GHOST_BUTTON } from "./commerciaux-tab";

const PRIMARY = "ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-50";

const EMAIL_LABELS: Record<string, string> = {
  confirmed: "confirmation",
  refused: "refus",
  signed: "inscription",
  opposition: "opposition",
  lea_reply: "réponse à Ominin",
  released: "clôture",
};

function Emails({ emails }: { emails: EmailState[] }) {
  if (!emails.length) return null;
  return (
    <p className="mt-1 text-xs text-muted">
      {emails.map((email, index) => (
        <span key={`${email.kind}-${email.created_at}`}>
          {index > 0 && " · "}
          E-mail de {EMAIL_LABELS[email.kind] ?? email.kind} :{" "}
          {email.gmail_message_id ? (
            <span className="text-status-signed">envoyé le {formatDate(email.sent_at!)}</span>
          ) : email.sent_at ? (
            <span className="text-ember-3">envoi interrompu, à vérifier</span>
          ) : (
            <span className={email.last_error ? "text-ember-3" : "text-faint"}>
              {email.last_error ? "échec, nouvel essai à la prochaine tâche" : "en attente"}
            </span>
          )}
        </span>
      ))}
    </p>
  );
}

type Action =
  | { kind: "refuse"; row: AdminDeclaration }
  | { kind: "signed"; row: AdminDeclaration }
  | { kind: "reassign"; row: AdminDeclaration }
  | { kind: "sameOwner"; row: AdminDeclaration }
  | { kind: "email" };

/*
 * Déclarations : la file à trancher avant l'échéance (sans réponse, la
 * déclaration est confirmée de droit), puis les réservations en cours et
 * l'historique. Chaque décision part par e-mail au commercial (art. 4.3).
 */
export function DeclarationsTab() {
  const toast = useToast();
  const { basePath } = useAdminBasePath();
  const [rows, setRows] = useState<AdminDeclaration[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(
    () =>
      fetchDeclarations().then(
        (loaded) => {
          setRows(loaded);
          setError(null);
        },
        (cause: unknown) => setError(cause instanceof Error ? cause.message : "Une erreur est survenue.")
      ),
    []
  );
  useEffect(() => void load(), [load]);

  const run = async (key: string, task: () => Promise<void>, done: string) => {
    setBusy(key);
    try {
      await task();
      toast.success(done);
      setAction(null);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Une erreur est survenue.");
    } finally {
      setBusy(null);
      void load();
    }
  };

  const groups = useMemo(() => {
    const list = rows ?? [];
    return {
      pending: list.filter((row) => row.effective_status === "pending"),
      reserved: list.filter((row) => row.effective_status === "confirmed"),
      closed: list.filter((row) => !["pending", "confirmed"].includes(row.effective_status)),
    };
  }, [rows]);

  if (error) return <EmptyState title="Chargement impossible" body={error} />;
  if (!rows) return <div aria-busy className="shimmer h-40 rounded-2xl" />;

  const fiche = (row: AdminDeclaration) => `${basePath}/restaurants?lead=${row.restaurant_id}`;
  const who = (row: AdminDeclaration) => row.commercial_name ?? row.commercial_email;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-end">
        <button type="button" onClick={() => setAction({ kind: "email" })} className={GHOST_BUTTON}>
          Saisir une déclaration reçue par e-mail
        </button>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-faint">
          À trancher ({groups.pending.length})
        </h2>
        {groups.pending.length === 0 ? (
          <p className="text-sm text-muted">Aucune déclaration en attente.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {groups.pending.map((row) => (
              <li key={row.id} className="flex flex-col gap-3 rounded-2xl border border-hairline bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <a href={fiche(row)} className="font-medium hover:text-ember-1">
                      {row.restaurant_name}
                    </a>
                    <p className="text-sm text-muted">
                      {[row.restaurant_city, who(row)].filter(Boolean).join(" · ")} · déclaré le {formatDate(row.declared_at)}
                      {row.channel === "email" ? " (par e-mail)" : ""}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-status-appointment/40 px-2.5 py-1 text-xs font-semibold text-status-appointment">
                    Confirmée de droit {formatRelative(row.confirm_deadline!)}
                  </span>
                </div>
                {row.client_alert && (
                  <p className="rounded-xl border border-ember-3/40 bg-ember-3/10 px-3 py-2 text-sm text-ember-3">
                    Déjà client ? {row.client_alert}
                  </p>
                )}
                {row.in_talks && (
                  <p className="text-sm text-status-appointment">En discussion avec Ominin (refus possible : « en discussion »).</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy === row.id}
                    onClick={() => void run(row.id, () => decide(row.id, "confirm", ""), "Déclaration confirmée.")}
                    className={PRIMARY}
                  >
                    Confirmer
                  </button>
                  <button type="button" onClick={() => setAction({ kind: "refuse", row })} className={GHOST_BUTTON}>
                    Refuser
                  </button>
                  <button type="button" onClick={() => setAction({ kind: "signed", row })} className={GHOST_BUTTON}>
                    Marquer inscrit
                  </button>
                  <InTalksSelect row={row} onChange={(value) => void run(row.id, () => setInTalks(row.restaurant_id, value), "Enregistré.")} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-faint">
          Réservés ({groups.reserved.length})
        </h2>
        <ul className="flex flex-col gap-2">
          {groups.reserved.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hairline bg-surface p-4">
              <div className="min-w-0">
                <a href={fiche(row)} className="font-medium hover:text-ember-1">
                  {row.restaurant_name}
                </a>
                <p className="text-sm text-muted">
                  {who(row)} · étape {row.step}/5 · jusqu’au {formatDate(row.reserved_until!)}
                  {row.tacit ? " · confirmée de droit" : ""}
                </p>
                <Emails emails={row.emails as unknown as EmailState[]} />
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setAction({ kind: "signed", row })} className={GHOST_BUTTON}>
                  Marquer inscrit
                </button>
                <button type="button" onClick={() => setAction({ kind: "reassign", row })} className={GHOST_BUTTON}>
                  Réattribuer
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-faint">Historique</h2>
        <ul className="flex flex-col gap-2">
          {groups.closed.map((row) => (
            <li key={row.id} className="rounded-2xl border border-hairline px-4 py-3 text-sm">
              <a href={fiche(row)} className="font-medium hover:text-ember-1">
                {row.restaurant_name}
              </a>
              <span className="text-muted">
                {" "}
                · {who(row)} · {STATUS_LABELS[row.effective_status]}
                {row.refusal_reason ? ` (${REFUSAL_LABELS[row.refusal_reason]})` : ""}
                {row.end_reason ? ` (${END_LABELS[row.end_reason]})` : ""}
                {row.decision_note ? ` — ${row.decision_note}` : ""} · {formatDate(row.declared_at)}
              </span>
              <Emails emails={row.emails as unknown as EmailState[]} />
              {row.effective_status === "signed" && (
                <button type="button" onClick={() => setAction({ kind: "sameOwner", row })} className={`${GHOST_BUTTON} mt-2`}>
                  + Établissement du même exploitant
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {action?.kind === "sameOwner" && (
        <SignedModal
          row={action.row}
          sameOwner
          onClose={() => setAction(null)}
          onSubmit={(place) => void run(action.row.id, () => addSameOwner(action.row.id, place), "Client Apporté ajouté.")}
        />
      )}
      {action?.kind === "refuse" && (
        <RefuseModal
          row={action.row}
          busy={busy === action.row.id}
          onClose={() => setAction(null)}
          onSubmit={(reason) => void run(action.row.id, () => decide(action.row.id, "refuse", reason), "Déclaration refusée.")}
        />
      )}
      {action?.kind === "signed" && (
        <SignedModal
          row={action.row}
          onClose={() => setAction(null)}
          onSubmit={(place) => void run(action.row.id, () => markSigned(action.row.id, place), "Inscription enregistrée.")}
        />
      )}
      {action?.kind === "reassign" && (
        <ReassignModal
          row={action.row}
          onClose={() => setAction(null)}
          onSubmit={(commercialId, reason, file) =>
            void run(action.row.id, () => reassign(action.row.id, commercialId, reason, file), "Réattribuée.")
          }
        />
      )}
      {action?.kind === "email" && (
        <EmailDeclarationModal
          onClose={() => setAction(null)}
          onSubmit={(input) => void run("email", () => recordEmailDeclaration(input), "Déclaration enregistrée.")}
        />
      )}
    </div>
  );
}

function InTalksSelect({ row, onChange }: { row: AdminDeclaration; onChange: (value: boolean | null) => void }) {
  const value = row.in_talks_override === null ? "auto" : row.in_talks_override ? "oui" : "non";
  return (
    <select
      aria-label="En discussion avec Ominin"
      value={value}
      onChange={(event) => onChange(event.target.value === "auto" ? null : event.target.value === "oui")}
      className="rounded-full border border-hairline bg-background px-3 py-1.5 text-xs font-semibold text-muted"
    >
      <option value="auto">En discussion : calculé</option>
      <option value="oui">En discussion : forcé oui</option>
      <option value="non">En discussion : forcé non</option>
    </select>
  );
}

function RefuseModal({
  row,
  busy,
  onClose,
  onSubmit,
}: {
  row: AdminDeclaration;
  busy: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <Modal
      title={`Refuser · ${row.restaurant_name}`}
      onClose={onClose}
      footer={
        <button type="button" disabled={busy || !reason.trim()} onClick={() => onSubmit(reason.trim())} className={PRIMARY}>
          Refuser
        </button>
      }
    >
      <Field label="Motif" required hint="Envoyé au commercial : l’article 4.3 demande un refus motivé.">
        <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className={`${inputClass} resize-none`} data-autofocus />
      </Field>
    </Modal>
  );
}

function usePlaces() {
  const [places, setPlaces] = useState<ClientPlace[] | null>(null);
  useEffect(() => {
    void fetchClientPlaces().then(setPlaces, () => setPlaces([]));
  }, []);
  return places;
}

function SignedModal({
  row,
  sameOwner,
  onClose,
  onSubmit,
}: {
  row: AdminDeclaration;
  /** Nouvel établissement du même exploitant (art. 4.4) plutôt que l'inscription elle-même. */
  sameOwner?: boolean;
  onClose: () => void;
  onSubmit: (place: { kind: string; id: string }) => void;
}) {
  const places = usePlaces();
  const [choice, setChoice] = useState("");
  const free = (places ?? []).filter((place) => !place.restaurant_id || place.restaurant_id === row.restaurant_id);
  return (
    <Modal
      title={sameOwner ? `Même exploitant · ${row.restaurant_name}` : `Inscrit · ${row.restaurant_name}`}
      onClose={onClose}
      footer={
        <button
          type="button"
          disabled={!choice}
          onClick={() => {
            const [kind, id] = choice.split(":");
            onSubmit({ kind, id });
          }}
          className={PRIMARY}
        >
          {sameOwner ? "Ajouter le Client Apporté" : "Marquer inscrit"}
        </button>
      }
    >
      <div className="flex flex-col gap-3">
        <Field label="Établissement ou boutique inscrit" required>
          <select value={choice} onChange={(event) => setChoice(event.target.value)} className={inputClass}>
            <option value="">—</option>
            {free.map((place) => (
              <option key={`${place.kind}:${place.id}`} value={`${place.kind}:${place.id}`}>
                {place.name} ({place.kind === "shop" ? "boutique" : "établissement"})
              </option>
            ))}
          </select>
        </Field>
        <p className="text-sm text-muted">
          {sameOwner
            ? "Même SIREN (siret de l’établissement ou de la boutique) ou pièces à l’appui : il devient un Client Apporté de la même déclaration, pour sa propre période."
            : "La déclaration est signée et la fiche reliée au client ; le commercial est prévenu par e-mail (art. 6.2)."}
        </p>
      </div>
    </Modal>
  );
}

function useSignedCommerciaux() {
  const [rows, setRows] = useState<CommercialRow[]>([]);
  useEffect(() => {
    void fetchCommerciaux().then((loaded) => setRows(loaded.filter((row) => row.signed)));
  }, []);
  return rows;
}

function ReassignModal({
  row,
  onClose,
  onSubmit,
}: {
  row: AdminDeclaration;
  onClose: () => void;
  onSubmit: (commercialId: string, reason: string, file: File) => void;
}) {
  const commerciaux = useSignedCommerciaux().filter((commercial) => commercial.id !== row.commercial_id);
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  return (
    <Modal
      title={`Réattribuer · ${row.restaurant_name}`}
      onClose={onClose}
      footer={
        <button type="button" disabled={!to || !reason.trim() || !file} onClick={() => onSubmit(to, reason.trim(), file!)} className={PRIMARY}>
          Réattribuer
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          Pendant une réservation, seulement avec l’accord écrit de {row.commercial_name ?? row.commercial_email}. La
          nouvelle réservation garde la même échéance.
        </p>
        <Field label="Nouveau commercial" required>
          <select value={to} onChange={(event) => setTo(event.target.value)} className={inputClass}>
            <option value="">—</option>
            {commerciaux.map((commercial) => (
              <option key={commercial.id} value={commercial.id}>
                {commercial.name ?? commercial.email}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Motif" required>
          <input value={reason} onChange={(event) => setReason(event.target.value)} className={inputClass} />
        </Field>
        <Field label="Accord écrit du titulaire (PDF ou image)" required>
          <input type="file" accept="application/pdf,image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="text-sm" />
        </Field>
      </div>
    </Modal>
  );
}

function EmailDeclarationModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (input: {
    commercialId: string;
    restaurantId: string;
    declaredAt: string;
    products: Product[];
    contactRole: string;
  }) => void;
}) {
  const commerciaux = useSignedCommerciaux();
  const [commercialId, setCommercialId] = useState("");
  const [lead, setLead] = useState<LeadLite | null>(null);
  const [when, setWhen] = useState("");
  const [products, setProducts] = useState<Product[]>(["menu"]);
  const [role, setRole] = useState<string>(CONTACT_ROLES[0]);
  return (
    <Modal
      title="Déclaration reçue par e-mail"
      onClose={onClose}
      footer={
        <button
          type="button"
          disabled={!commercialId || !lead || !when || !products.length}
          onClick={() =>
            onSubmit({
              commercialId,
              restaurantId: lead!.restaurantId,
              declaredAt: fromDatetimeLocalValue(when),
              products,
              contactRole: role,
            })
          }
          className={PRIMARY}
        >
          Enregistrer
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Commercial" required>
          <select value={commercialId} onChange={(event) => setCommercialId(event.target.value)} className={inputClass}>
            <option value="">—</option>
            {commerciaux.map((commercial) => (
              <option key={commercial.id} value={commercial.id}>
                {commercial.name ?? commercial.email}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">Restaurant *</span>
          <RestaurantPicker value={lead} onSelect={setLead} />
        </div>
        <Field label="Reçue le (date de l’e-mail)" required>
          <input type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} className={inputClass} />
        </Field>
        <div role="group" aria-label="Offre visée" className="flex flex-wrap gap-2">
          {PRODUCT_CHOICES.map((choice) => {
            const on = products.includes(choice.id);
            return (
              <button
                key={choice.id}
                type="button"
                aria-pressed={on}
                onClick={() => setProducts(on ? products.filter((id) => id !== choice.id) : [...products, choice.id])}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${on ? "border-ember-2/50 bg-ember-2/10" : "border-hairline text-muted"}`}
              >
                {choice.label}
              </button>
            );
          })}
        </div>
        <Field label="Interlocuteur (fonction)">
          <select value={role} onChange={(event) => setRole(event.target.value)} className={inputClass}>
            {CONTACT_ROLES.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </Field>
        <p className="text-xs text-muted">
          Une déclaration concurrente plus récente encore en attente est refusée ; une concurrente déjà confirmée garde le restaurant.
        </p>
      </div>
    </Modal>
  );
}
