"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Toggle } from "@/components/ui/toggle";
import { COUNTRY_NAMES, SHIPPING_KIND_LABELS } from "@/lib/shop/constants";
import { centsToEurosInput, countryName, eurosToCents, formatDate, formatPrice, slugify } from "@/lib/shop/format";
import * as api from "@/lib/shop/gestion-api";
import { shippingDelayLabel } from "@/lib/shop/pricing";
import type { ShopCategory, ShopDiscountCode, ShopDiscountType, ShopFaqItem, ShopShippingKind, ShopShippingMethod } from "@/lib/shop/types";
import { PencilIcon, TrashIcon } from "../icons";
import { Card, dangerButton, primaryButton, secondaryButton, TableShell, td, th } from "./page-header";

/*
 * Gestionnaires en liste + modale : collections, modes de livraison, codes
 * promo, FAQ. Chaque écriture passe par gestion-api (RLS) puis rafraîchit
 * la page serveur.
 */

function useSave() {
  const router = useRouter();
  const toast = useToast();
  return async (action: () => Promise<unknown>, success: string, done?: () => void) => {
    try {
      await action();
      toast.success(success);
      done?.();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    }
  };
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex justify-end gap-1">
      <button type="button" onClick={onEdit} aria-label="Modifier" className="flex size-8 items-center justify-center rounded-full text-muted hover:text-foreground">
        <PencilIcon className="size-4" />
      </button>
      <button type="button" onClick={onDelete} aria-label="Supprimer" className="flex size-8 items-center justify-center rounded-full text-muted hover:text-ember-3">
        <TrashIcon className="size-4" />
      </button>
    </div>
  );
}

function ModalFooter({ onCancel, onSave, disabled }: { onCancel: () => void; onSave: () => void; disabled?: boolean }) {
  return (
    <>
      <button type="button" onClick={onCancel} className={secondaryButton}>
        Annuler
      </button>
      <button type="button" onClick={onSave} disabled={disabled} className={primaryButton}>
        Enregistrer
      </button>
    </>
  );
}

// ---------------------------------------------------------------------------
// Collections

export function CategoriesManager({ shopId, categories }: { shopId: string; categories: ShopCategory[] }) {
  const save = useSave();
  const [editing, setEditing] = useState<{ id: string | null; name: string; slug: string; description: string; imageUrl: string; sortOrder: string; isActive: boolean; isHighlighted: boolean } | null>(null);
  const [deleting, setDeleting] = useState<ShopCategory | null>(null);

  return (
    <Card title="Collections" description="Filtres du catalogue. Celles mises en avant s'affichent en rond sur l'accueil, avec leur photo." action={<button type="button" onClick={() => setEditing({ id: null, name: "", slug: "", description: "", imageUrl: "", sortOrder: String(categories.length + 1), isActive: true, isHighlighted: false })} className={secondaryButton}>+ Ajouter</button>}>
      <ul className="flex flex-col divide-y divide-hairline">
        {categories.length === 0 && <li className="py-2 text-sm text-muted">Aucune collection.</li>}
        {categories.map((c) => (
          <li key={c.id} className="flex items-center gap-3 py-2.5">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-medium">
                {c.name}
                {!c.is_active && <span className="ml-2 text-[10px] uppercase text-faint">masquée</span>}
                {c.is_highlighted && <span className="ml-2 text-[10px] uppercase text-ember-1">accueil</span>}
              </span>
              <span className="truncate text-xs text-faint">?collection={c.slug}</span>
            </span>
            <RowActions onEdit={() => setEditing({ id: c.id, name: c.name, slug: c.slug, description: c.description ?? "", imageUrl: c.image_url ?? "", sortOrder: String(c.sort_order), isActive: c.is_active, isHighlighted: c.is_highlighted })} onDelete={() => setDeleting(c)} />
          </li>
        ))}
      </ul>
      {editing && (
        <Modal
          title={editing.id ? "Modifier la collection" : "Nouvelle collection"}
          onClose={() => setEditing(null)}
          footer={
            <ModalFooter
              onCancel={() => setEditing(null)}
              disabled={!editing.name.trim()}
              onSave={() => save(() => api.saveCategory(shopId, editing.id, { name: editing.name.trim(), slug: slugify(editing.slug || editing.name), description: editing.description.trim() || null, image_url: editing.imageUrl.trim() || null, sort_order: Number.parseInt(editing.sortOrder, 10) || 0, is_active: editing.isActive, is_highlighted: editing.isHighlighted }), "Collection enregistrée", () => setEditing(null))}
            />
          }
        >
          <div className="flex flex-col gap-4">
            <Field label="Nom" required>
              <input className={inputClass} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <Field label="Adresse (slug)" hint="Générée depuis le nom si vide.">
              <input className={inputClass} value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
            </Field>
            <Field label="Description">
              <input className={inputClass} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </Field>
            <Field label="Photo (URL)" hint="Affichée en rond sur l'accueil quand la collection est mise en avant. Format carré ou portrait.">
              <input className={inputClass} value={editing.imageUrl} onChange={(e) => setEditing({ ...editing, imageUrl: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Ordre">
                <input className={inputClass} inputMode="numeric" value={editing.sortOrder} onChange={(e) => setEditing({ ...editing, sortOrder: e.target.value })} />
              </Field>
              <label className="flex items-end gap-3 pb-2 text-sm">
                <Toggle checked={editing.isActive} onChange={(v) => setEditing({ ...editing, isActive: v })} label="Visible" /> Visible
              </label>
              <label className="col-span-2 flex items-center gap-3 text-sm">
                <Toggle checked={editing.isHighlighted} onChange={(v) => setEditing({ ...editing, isHighlighted: v })} label="Mise en avant sur l'accueil" /> Mise en avant sur l&apos;accueil
              </label>
            </div>
          </div>
        </Modal>
      )}
      {deleting && <ConfirmDialog title="Supprimer cette collection ?" message="Les produits associés restent en ligne, sans collection." confirmLabel="Supprimer" destructive onClose={() => setDeleting(null)} onConfirm={() => save(() => api.deleteCategory(deleting.id), "Collection supprimée", () => setDeleting(null))} />}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Livraison

interface ShippingDraft {
  id: string | null;
  name: string;
  carrier: string;
  description: string;
  kind: ShopShippingKind;
  price: string;
  freeAbove: string;
  countries: string[];
  delayMin: string;
  delayMax: string;
  instructions: string;
  isActive: boolean;
  sortOrder: string;
}

export function ShippingManager({ shopId, methods, shopThreshold }: { shopId: string; methods: ShopShippingMethod[]; shopThreshold: number | null }) {
  const save = useSave();
  const [editing, setEditing] = useState<ShippingDraft | null>(null);
  const [deleting, setDeleting] = useState<ShopShippingMethod | null>(null);
  const toDraft = (m: ShopShippingMethod | null): ShippingDraft => ({
    id: m?.id ?? null,
    name: m?.name ?? "",
    carrier: m?.carrier ?? "",
    description: m?.description ?? "",
    kind: m?.kind ?? "home",
    price: centsToEurosInput(m?.price_cents ?? 0),
    freeAbove: centsToEurosInput(m?.free_above_cents),
    countries: m?.countries ?? ["FR"],
    delayMin: m?.delay_min_days != null ? String(m.delay_min_days) : "",
    delayMax: m?.delay_max_days != null ? String(m.delay_max_days) : "",
    instructions: m?.instructions ?? "",
    isActive: m?.is_active ?? true,
    sortOrder: String(m?.sort_order ?? methods.length + 1),
  });
  const d = editing;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button type="button" onClick={() => setEditing(toDraft(null))} className={primaryButton}>
          + Nouveau mode de livraison
        </button>
      </div>
      <TableShell>
        <thead>
          <tr>
            <th className={th}>Actif</th>
            <th className={th}>Nom</th>
            <th className={th}>Type</th>
            <th className={th}>Pays</th>
            <th className={th}>Délai</th>
            <th className={`${th} text-right`}>Tarif</th>
            <th className={th}>Offert dès</th>
            <th className={th}></th>
          </tr>
        </thead>
        <tbody>
          {methods.map((m) => (
            <tr key={m.id}>
              <td className={td}>
                <Toggle checked={m.is_active} onChange={(v) => save(() => api.setShippingMethodActive(m.id, v), v ? "Mode activé" : "Mode désactivé")} label={m.name} />
              </td>
              <td className={td}>
                <span className="block font-medium">{m.name}</span>
                <span className="block text-xs text-muted">{[m.carrier, m.description].filter(Boolean).join(" · ")}</span>
              </td>
              <td className={`${td} text-muted`}>{SHIPPING_KIND_LABELS[m.kind]}</td>
              <td className={`${td} text-muted`}>{m.countries.map(countryName).join(", ")}</td>
              <td className={`${td} text-muted`}>{shippingDelayLabel(m) ?? "—"}</td>
              <td className={`${td} text-right font-semibold tabular-nums`}>{m.price_cents === 0 ? "Offert" : formatPrice(m.price_cents)}</td>
              <td className={`${td} text-muted`}>{m.free_above_cents != null ? formatPrice(m.free_above_cents) : shopThreshold != null ? `${formatPrice(shopThreshold)} (global)` : "—"}</td>
              <td className={td}>
                <RowActions onEdit={() => setEditing(toDraft(m))} onDelete={() => setDeleting(m)} />
              </td>
            </tr>
          ))}
        </tbody>
      </TableShell>

      {d && (
        <Modal
          title={d.id ? "Modifier le mode de livraison" : "Nouveau mode de livraison"}
          onClose={() => setEditing(null)}
          footer={
            <ModalFooter
              onCancel={() => setEditing(null)}
              disabled={!d.name.trim() || d.countries.length === 0}
              onSave={() =>
                save(
                  () =>
                    api.saveShippingMethod(shopId, d.id, {
                      name: d.name.trim(),
                      carrier: d.carrier.trim() || null,
                      description: d.description.trim() || null,
                      kind: d.kind,
                      price_cents: eurosToCents(d.price) || 0,
                      free_above_cents: d.freeAbove.trim() ? eurosToCents(d.freeAbove) : null,
                      countries: d.countries,
                      delay_min_days: d.delayMin.trim() ? Number.parseInt(d.delayMin, 10) : null,
                      delay_max_days: d.delayMax.trim() ? Number.parseInt(d.delayMax, 10) : null,
                      instructions: d.instructions.trim() || null,
                      is_active: d.isActive,
                      sort_order: Number.parseInt(d.sortOrder, 10) || 0,
                    }),
                  "Mode de livraison enregistré",
                  () => setEditing(null)
                )
              }
            />
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Nom" required>
                <input className={inputClass} value={d.name} onChange={(e) => setEditing({ ...d, name: e.target.value })} placeholder="Colissimo à domicile" />
              </Field>
            </div>
            <Field label="Transporteur">
              <input className={inputClass} value={d.carrier} onChange={(e) => setEditing({ ...d, carrier: e.target.value })} />
            </Field>
            <Field label="Type">
              <select className={inputClass} value={d.kind} onChange={(e) => setEditing({ ...d, kind: e.target.value as ShopShippingKind })}>
                {(Object.keys(SHIPPING_KIND_LABELS) as ShopShippingKind[]).map((k) => (
                  <option key={k} value={k}>
                    {SHIPPING_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description courte">
                <input className={inputClass} value={d.description} onChange={(e) => setEditing({ ...d, description: e.target.value })} />
              </Field>
            </div>
            <Field label="Tarif TTC (€)" required>
              <input className={inputClass} inputMode="decimal" value={d.price} onChange={(e) => setEditing({ ...d, price: e.target.value })} />
            </Field>
            <Field label="Offert à partir de (€)" hint="Vide = seuil global de la boutique.">
              <input className={inputClass} inputMode="decimal" value={d.freeAbove} onChange={(e) => setEditing({ ...d, freeAbove: e.target.value })} />
            </Field>
            <Field label="Délai min. (jours ouvrés)">
              <input className={inputClass} inputMode="numeric" value={d.delayMin} onChange={(e) => setEditing({ ...d, delayMin: e.target.value })} />
            </Field>
            <Field label="Délai max. (jours ouvrés)">
              <input className={inputClass} inputMode="numeric" value={d.delayMax} onChange={(e) => setEditing({ ...d, delayMax: e.target.value })} />
            </Field>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">Pays desservis</span>
              <div className="flex flex-wrap gap-2">
                {Object.keys(COUNTRY_NAMES).map((code) => {
                  const on = d.countries.includes(code);
                  return (
                    <button key={code} type="button" onClick={() => setEditing({ ...d, countries: on ? d.countries.filter((c) => c !== code) : [...d.countries, code] })} className={`rounded-full px-3 py-1.5 text-xs font-medium ${on ? "ember-gradient text-background" : "border border-hairline text-muted"}`}>
                      {COUNTRY_NAMES[code]}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="sm:col-span-2">
              <Field label="Consigne affichée à la cliente">
                <textarea className={`${inputClass} min-h-20`} value={d.instructions} onChange={(e) => setEditing({ ...d, instructions: e.target.value })} />
              </Field>
            </div>
            <Field label="Ordre">
              <input className={inputClass} inputMode="numeric" value={d.sortOrder} onChange={(e) => setEditing({ ...d, sortOrder: e.target.value })} />
            </Field>
            <label className="flex items-end gap-3 pb-2 text-sm">
              <Toggle checked={d.isActive} onChange={(v) => setEditing({ ...d, isActive: v })} label="Proposé à la commande" /> Proposé à la commande
            </label>
          </div>
        </Modal>
      )}
      {deleting && <ConfirmDialog title="Supprimer ce mode de livraison ?" message="Les commandes existantes gardent l'intitulé enregistré." confirmLabel="Supprimer" destructive onClose={() => setDeleting(null)} onConfirm={() => save(() => api.deleteShippingMethod(deleting.id), "Mode supprimé", () => setDeleting(null))} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Codes promo

interface DiscountDraft {
  id: string | null;
  code: string;
  type: ShopDiscountType;
  value: string;
  minSubtotal: string;
  startsAt: string;
  endsAt: string;
  maxUses: string;
  isActive: boolean;
}

const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function DiscountManager({ shopId, codes }: { shopId: string; codes: ShopDiscountCode[] }) {
  const save = useSave();
  const [editing, setEditing] = useState<DiscountDraft | null>(null);
  const [deleting, setDeleting] = useState<ShopDiscountCode | null>(null);
  const d = editing;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button type="button" onClick={() => setEditing({ id: null, code: "", type: "percent", value: "10", minSubtotal: "", startsAt: "", endsAt: "", maxUses: "", isActive: true })} className={primaryButton}>
          + Nouveau code
        </button>
      </div>
      <TableShell>
        <thead>
          <tr>
            <th className={th}>Code</th>
            <th className={th}>Réduction</th>
            <th className={th}>Conditions</th>
            <th className={th}>Validité</th>
            <th className={th}>Utilisations</th>
            <th className={th}>Actif</th>
            <th className={th}></th>
          </tr>
        </thead>
        <tbody>
          {codes.length === 0 && (
            <tr>
              <td colSpan={7} className={`${td} py-8 text-center text-muted`}>
                Aucun code promo.
              </td>
            </tr>
          )}
          {codes.map((c) => (
            <tr key={c.id}>
              <td className={`${td} font-semibold tracking-wide`}>{c.code}</td>
              <td className={td}>{c.type === "percent" ? `-${c.value} %` : `-${formatPrice(c.value)}`}</td>
              <td className={`${td} text-muted`}>{c.min_subtotal_cents != null ? `dès ${formatPrice(c.min_subtotal_cents)}` : "—"}</td>
              <td className={`${td} text-muted`}>{c.starts_at || c.ends_at ? `${c.starts_at ? `du ${formatDate(c.starts_at)}` : ""} ${c.ends_at ? `au ${formatDate(c.ends_at)}` : ""}`.trim() : "Sans limite"}</td>
              <td className={`${td} text-muted`}>
                {c.uses}
                {c.max_uses != null && ` / ${c.max_uses}`}
              </td>
              <td className={td}>{c.is_active ? "Actif" : "Inactif"}</td>
              <td className={td}>
                <RowActions onEdit={() => setEditing({ id: c.id, code: c.code, type: c.type, value: c.type === "percent" ? String(c.value) : centsToEurosInput(c.value), minSubtotal: centsToEurosInput(c.min_subtotal_cents), startsAt: toLocalInput(c.starts_at), endsAt: toLocalInput(c.ends_at), maxUses: c.max_uses != null ? String(c.max_uses) : "", isActive: c.is_active })} onDelete={() => setDeleting(c)} />
              </td>
            </tr>
          ))}
        </tbody>
      </TableShell>
      {d && (
        <Modal
          title={d.id ? "Modifier le code" : "Nouveau code promo"}
          onClose={() => setEditing(null)}
          footer={
            <ModalFooter
              onCancel={() => setEditing(null)}
              disabled={d.code.trim().length < 2}
              onSave={() =>
                save(
                  () =>
                    api.saveDiscountCode(shopId, d.id, {
                      code: d.code.trim().toUpperCase(),
                      type: d.type,
                      value: d.type === "percent" ? Number.parseInt(d.value, 10) || 0 : eurosToCents(d.value) || 0,
                      min_subtotal_cents: d.minSubtotal.trim() ? eurosToCents(d.minSubtotal) : null,
                      starts_at: d.startsAt ? new Date(d.startsAt).toISOString() : null,
                      ends_at: d.endsAt ? new Date(d.endsAt).toISOString() : null,
                      max_uses: d.maxUses.trim() ? Number.parseInt(d.maxUses, 10) : null,
                      is_active: d.isActive,
                    }),
                  "Code enregistré",
                  () => setEditing(null)
                )
              }
            />
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Code" required hint="Sans espace, en majuscules.">
              <input className={`${inputClass} uppercase`} value={d.code} onChange={(e) => setEditing({ ...d, code: e.target.value.toUpperCase().replace(/\s/g, "") })} />
            </Field>
            <Field label="Type">
              <select className={inputClass} value={d.type} onChange={(e) => setEditing({ ...d, type: e.target.value as ShopDiscountType })}>
                <option value="percent">Pourcentage</option>
                <option value="fixed">Montant fixe (€)</option>
              </select>
            </Field>
            <Field label={d.type === "percent" ? "Réduction (%)" : "Réduction (€)"} required>
              <input className={inputClass} inputMode="decimal" value={d.value} onChange={(e) => setEditing({ ...d, value: e.target.value })} />
            </Field>
            <Field label="Panier minimum (€)">
              <input className={inputClass} inputMode="decimal" value={d.minSubtotal} onChange={(e) => setEditing({ ...d, minSubtotal: e.target.value })} />
            </Field>
            <Field label="Début">
              <input className={inputClass} type="datetime-local" value={d.startsAt} onChange={(e) => setEditing({ ...d, startsAt: e.target.value })} />
            </Field>
            <Field label="Fin">
              <input className={inputClass} type="datetime-local" value={d.endsAt} onChange={(e) => setEditing({ ...d, endsAt: e.target.value })} />
            </Field>
            <Field label="Nombre max. d'utilisations">
              <input className={inputClass} inputMode="numeric" value={d.maxUses} onChange={(e) => setEditing({ ...d, maxUses: e.target.value })} />
            </Field>
            <label className="flex items-end gap-3 pb-2 text-sm">
              <Toggle checked={d.isActive} onChange={(v) => setEditing({ ...d, isActive: v })} label="Code actif" /> Code actif
            </label>
          </div>
        </Modal>
      )}
      {deleting && <ConfirmDialog title="Supprimer ce code ?" message="Les commandes qui l'ont utilisé gardent la réduction." confirmLabel="Supprimer" destructive onClose={() => setDeleting(null)} onConfirm={() => save(() => api.deleteDiscountCode(deleting.id), "Code supprimé", () => setDeleting(null))} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FAQ

export function FaqManager({ shopId, items }: { shopId: string; items: ShopFaqItem[] }) {
  const save = useSave();
  const [editing, setEditing] = useState<{ id: string | null; question: string; answer: string; sortOrder: string; isActive: boolean } | null>(null);
  const [deleting, setDeleting] = useState<ShopFaqItem | null>(null);
  const d = editing;

  return (
    <Card title="Questions fréquentes" description="Affichées sur la page FAQ, dans l'ordre indiqué." action={<button type="button" onClick={() => setEditing({ id: null, question: "", answer: "", sortOrder: String((items.at(-1)?.sort_order ?? 0) + 1), isActive: true })} className={secondaryButton}>+ Ajouter</button>}>
      <ul className="flex flex-col divide-y divide-hairline">
        {items.length === 0 && <li className="py-2 text-sm text-muted">Aucune question.</li>}
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-3 py-3">
            <span className="w-6 shrink-0 pt-0.5 text-xs text-faint">{item.sort_order}</span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-sm font-medium">
                {item.question}
                {!item.is_active && <span className="ml-2 text-[10px] uppercase text-faint">masquée</span>}
              </span>
              <span className="line-clamp-2 text-xs text-muted">{item.answer}</span>
            </span>
            <RowActions onEdit={() => setEditing({ id: item.id, question: item.question, answer: item.answer, sortOrder: String(item.sort_order), isActive: item.is_active })} onDelete={() => setDeleting(item)} />
          </li>
        ))}
      </ul>
      {d && (
        <Modal title={d.id ? "Modifier la question" : "Nouvelle question"} onClose={() => setEditing(null)} footer={<ModalFooter onCancel={() => setEditing(null)} disabled={!d.question.trim() || !d.answer.trim()} onSave={() => save(() => api.saveFaqItem(shopId, d.id, { question: d.question.trim(), answer: d.answer.trim(), sort_order: Number.parseInt(d.sortOrder, 10) || 0, is_active: d.isActive }), "Question enregistrée", () => setEditing(null))} />}>
          <div className="flex flex-col gap-4">
            <Field label="Question" required>
              <input className={inputClass} value={d.question} onChange={(e) => setEditing({ ...d, question: e.target.value })} />
            </Field>
            <Field label="Réponse" required>
              <textarea className={`${inputClass} min-h-32`} value={d.answer} onChange={(e) => setEditing({ ...d, answer: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Ordre">
                <input className={inputClass} inputMode="numeric" value={d.sortOrder} onChange={(e) => setEditing({ ...d, sortOrder: e.target.value })} />
              </Field>
              <label className="flex items-end gap-3 pb-2 text-sm">
                <Toggle checked={d.isActive} onChange={(v) => setEditing({ ...d, isActive: v })} label="Visible" /> Visible
              </label>
            </div>
          </div>
        </Modal>
      )}
      {deleting && <ConfirmDialog title="Supprimer cette question ?" message="Elle disparaît de la page FAQ." confirmLabel="Supprimer" destructive onClose={() => setDeleting(null)} onConfirm={() => save(() => api.deleteFaqItem(deleting.id), "Question supprimée", () => setDeleting(null))} />}
    </Card>
  );
}
