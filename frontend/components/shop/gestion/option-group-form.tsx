"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { Toggle } from "@/components/ui/toggle";
import { centsToEurosInput, eurosToCents } from "@/lib/shop/format";
import * as api from "@/lib/shop/gestion-api";
import type { OptionGroupWithValues } from "@/lib/shop/types";
import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from "../icons";
import { Card, dangerButton, primaryButton, secondaryButton } from "./page-header";

interface ValueDraft {
  id?: string;
  label: string;
  priceDelta: string;
  isAvailable: boolean;
}

export function OptionGroupForm({ shopId, group }: { shopId: string; group: OptionGroupWithValues | null }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [values, setValues] = useState<ValueDraft[]>((group?.shop_option_values ?? []).map((v) => ({ id: v.id, label: v.label, priceDelta: v.price_delta_cents ? centsToEurosInput(v.price_delta_cents) : "", isAvailable: v.is_available })));
  const [bulk, setBulk] = useState("");

  const update = (i: number, patch: Partial<ValueDraft>) => setValues(values.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  const move = (i: number, delta: number) => {
    const next = [...values];
    const t = i + delta;
    if (t < 0 || t >= next.length) return;
    [next[i], next[t]] = [next[t], next[i]];
    setValues(next);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const id = await api.saveOptionGroup(
        shopId,
        group?.id ?? null,
        { name: name.trim(), description: description.trim() || null },
        values.filter((v) => v.label.trim()).map((v) => ({ id: v.id, label: v.label.trim(), price_delta_cents: v.priceDelta.trim() ? eurosToCents(v.priceDelta) || 0 : 0, is_available: v.isAvailable }))
      );
      toast.success("Liste enregistrée");
      if (group) router.refresh();
      else router.push(`/gestion/options/${id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.");
    }
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-start">
      <div className="flex flex-col gap-6">
        <Card title="Liste">
          <div className="grid gap-4">
            <Field label="Nom de la liste" required hint="Exemple : Parfum KAYALI.">
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="Note interne">
              <textarea className={`${inputClass} min-h-16`} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
          </div>
        </Card>
        <Card title="Valeurs proposées" description="Dans l'ordre d'affichage. Désactivez une valeur en rupture plutôt que de la supprimer." action={<button type="button" onClick={() => setValues([...values, { label: "", priceDelta: "", isAvailable: true }])} className={secondaryButton}>+ Ajouter</button>}>
          <div className="flex flex-col gap-2.5">
            {values.length === 0 && <p className="text-sm text-muted">Aucune valeur.</p>}
            {values.map((v, i) => (
              <div key={v.id ?? `new-${i}`} className="grid items-center gap-2 rounded-xl border border-hairline bg-background p-2.5 sm:grid-cols-[1fr_110px_auto_auto]">
                <input className={inputClass} value={v.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="Vanilla | 28" aria-label={`Valeur ${i + 1}`} />
                <input className={inputClass} value={v.priceDelta} onChange={(e) => update(i, { priceDelta: e.target.value })} placeholder="+ € (opt.)" inputMode="decimal" aria-label="Supplément" />
                <label className="flex items-center gap-2 text-xs">
                  <Toggle checked={v.isAvailable} onChange={(val) => update(i, { isAvailable: val })} label="Disponible" /> Dispo
                </label>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => move(i, -1)} aria-label="Monter" className="flex size-8 items-center justify-center rounded-full text-muted hover:text-foreground">
                    <ArrowUpIcon className="size-3.5" />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} aria-label="Descendre" className="flex size-8 items-center justify-center rounded-full text-muted hover:text-foreground">
                    <ArrowDownIcon className="size-3.5" />
                  </button>
                  <button type="button" onClick={() => setValues(values.filter((_, j) => j !== i))} aria-label="Supprimer" className="flex size-8 items-center justify-center rounded-full text-muted hover:text-ember-3">
                    <TrashIcon className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
            <div className="mt-2 flex flex-col gap-2 rounded-xl border border-dashed border-hairline p-3">
              <Field label="Ajouter plusieurs valeurs d'un coup (une par ligne)">
                <textarea className={`${inputClass} min-h-16`} value={bulk} onChange={(e) => setBulk(e.target.value)} />
              </Field>
              <button
                type="button"
                disabled={!bulk.trim()}
                onClick={() => {
                  setValues([...values, ...bulk.split("\n").map((l) => l.trim()).filter(Boolean).map((label) => ({ label, priceDelta: "", isAvailable: true }))]);
                  setBulk("");
                }}
                className={`${secondaryButton} w-fit`}
              >
                Ajouter ces valeurs
              </button>
            </div>
          </div>
        </Card>
      </div>
      <div className="flex flex-col gap-2 lg:sticky lg:top-24">
        <button type="submit" disabled={busy} className={`${primaryButton} justify-center`}>
          {group ? "Enregistrer" : "Créer la liste"}
        </button>
        {group && (
          <button type="button" onClick={() => setDeleteOpen(true)} className={`${dangerButton} justify-center`}>
            Supprimer la liste
          </button>
        )}
        <p className="text-xs leading-relaxed text-faint">Une liste peut être rattachée à plusieurs produits depuis leur fiche, avec un libellé différent.</p>
      </div>
      {group && deleteOpen && (
        <ConfirmDialog
          title="Supprimer cette liste ?"
          message="Elle sera retirée de tous les produits qui l'utilisent."
          confirmLabel="Supprimer"
          destructive
          onClose={() => setDeleteOpen(false)}
          onConfirm={async () => {
            try {
              await api.deleteOptionGroup(group.id);
              toast.success("Liste supprimée");
              router.push("/gestion/options");
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Suppression impossible.");
            }
          }}
        />
      )}
    </form>
  );
}
