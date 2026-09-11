"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { Toggle } from "@/components/ui/toggle";
import { PERSONALIZATION_MAX_LENGTH } from "@/lib/shop/constants";
import { centsToEurosInput, eurosToCents, slugify } from "@/lib/shop/format";
import * as api from "@/lib/shop/gestion-api";
import type { OptionGroupWithValues, ProductDetail, ShopCategory, ShopProductBadge } from "@/lib/shop/types";
import { TrashIcon } from "../icons";
import { ImageUploader, type UploadedImage } from "./image-uploader";
import { Card, dangerButton, primaryButton, secondaryButton } from "./page-header";

interface OptionLinkDraft {
  group_id: string;
  label: string;
  is_required: boolean;
}

export function ProductForm({ shopId, product, categories, optionGroups }: { shopId: string; product: ProductDetail | null; categories: ShopCategory[]; optionGroups: OptionGroupWithValues[] }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [subtitle, setSubtitle] = useState(product?.subtitle ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [composition, setComposition] = useState((product?.composition ?? []).join("\n"));
  const [price, setPrice] = useState(centsToEurosInput(product?.price_cents ?? 0));
  const [compareAt, setCompareAt] = useState(centsToEurosInput(product?.compare_at_price_cents));
  const [categoryId, setCategoryId] = useState(product?.category_id ?? "");
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [isFeatured, setIsFeatured] = useState(product?.is_featured ?? false);
  const [badge, setBadge] = useState<ShopProductBadge | "">(product?.badge ?? "");
  const [stock, setStock] = useState(product?.stock != null ? String(product.stock) : "");
  const [sortOrder, setSortOrder] = useState(String(product?.sort_order ?? 0));
  const [personalizationLabel, setPersonalizationLabel] = useState(product?.personalization_label ?? "");
  const [seoTitle, setSeoTitle] = useState(product?.seo_title ?? "");
  const [seoDescription, setSeoDescription] = useState(product?.seo_description ?? "");
  const [images, setImages] = useState<UploadedImage[]>((product?.shop_product_images ?? []).map((i) => ({ url: i.url, alt: i.alt })));
  const [links, setLinks] = useState<OptionLinkDraft[]>((product?.shop_product_options ?? []).map((l) => ({ group_id: l.group_id, label: l.label, is_required: l.is_required })));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const priceCents = eurosToCents(price);
    if (Number.isNaN(priceCents)) {
      toast.error("Prix invalide.");
      return;
    }
    setBusy(true);
    try {
      const id = await api.saveProduct(
        shopId,
        product?.id ?? null,
        {
          name: name.trim(),
          slug: slugify(slug || name),
          subtitle: subtitle.trim() || null,
          description: description.trim() || null,
          composition: composition.split("\n").map((l) => l.trim()).filter(Boolean),
          price_cents: priceCents,
          compare_at_price_cents: compareAt.trim() ? eurosToCents(compareAt) : null,
          category_id: categoryId || null,
          is_active: isActive,
          is_featured: isFeatured,
          badge: badge || null,
          stock: stock.trim() ? Number.parseInt(stock, 10) : null,
          sort_order: Number.parseInt(sortOrder, 10) || 0,
          personalization_label: personalizationLabel.trim() || null,
          seo_title: seoTitle.trim() || null,
          seo_description: seoDescription.trim() || null,
        },
        images.map((i) => ({ url: i.url, alt: i.alt || `${name.trim()}` })),
        links.filter((l) => l.group_id).map((l) => ({ ...l, label: l.label.trim() || "Option" }))
      );
      toast.success(product ? "Produit enregistré" : "Produit créé");
      if (product) router.refresh();
      else router.push(`/gestion/produits/${id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.");
    }
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
      <div className="flex flex-col gap-6">
        <Card title="Informations">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Nom" required>
                <input className={inputClass} value={name} onChange={(e) => { setName(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} required />
              </Field>
            </div>
            <Field label="Adresse (slug)" required hint={`/produit/${slug || "…"}`}>
              <input className={inputClass} value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} required />
            </Field>
            <Field label="Collection">
              <select className={inputClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Sans collection</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Sous-titre" hint="Affiché sous le nom dans la grille.">
                <input className={inputClass} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Description">
                <textarea className={`${inputClass} min-h-32`} value={description} onChange={(e) => setDescription(e.target.value)} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Composition" hint="Un élément par ligne.">
                <textarea className={`${inputClass} min-h-32`} value={composition} onChange={(e) => setComposition(e.target.value)} />
              </Field>
            </div>
          </div>
        </Card>

        <Card title="Photos" description="La première photo est celle de la grille.">
          <ImageUploader images={images} onChange={setImages} />
        </Card>

        <Card
          title="Options au choix"
          description="Par exemple le parfum. Les listes de valeurs se gèrent dans « Options »."
          action={
            <button type="button" disabled={optionGroups.length === 0} onClick={() => setLinks([...links, { group_id: optionGroups[0]?.id ?? "", label: optionGroups[0]?.name ?? "", is_required: true }])} className={secondaryButton}>
              + Ajouter
            </button>
          }
        >
          <div className="flex flex-col gap-3">
            {links.length === 0 && <p className="text-sm text-muted">Aucune option : le produit s&apos;ajoute au panier tel quel.</p>}
            {links.map((link, i) => (
              <div key={i} className="grid gap-3 rounded-xl border border-hairline bg-background p-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
                <Field label="Liste">
                  <select
                    className={inputClass}
                    value={link.group_id}
                    onChange={(e) => {
                      const group = optionGroups.find((g) => g.id === e.target.value);
                      setLinks(links.map((l, j) => (j === i ? { ...l, group_id: e.target.value, label: l.label || group?.name || "" } : l)));
                    }}
                  >
                    {optionGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Libellé affiché">
                  <input className={inputClass} value={link.label} onChange={(e) => setLinks(links.map((l, j) => (j === i ? { ...l, label: e.target.value } : l)))} />
                </Field>
                <label className="flex items-center gap-2 pb-2 text-sm">
                  <Toggle checked={link.is_required} onChange={(v) => setLinks(links.map((l, j) => (j === i ? { ...l, is_required: v } : l)))} label="Obligatoire" />
                  Obligatoire
                </label>
                <button type="button" onClick={() => setLinks(links.filter((_, j) => j !== i))} aria-label="Retirer" className="mb-2 flex size-9 items-center justify-center rounded-full text-muted hover:text-ember-3">
                  <TrashIcon className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Personnalisation" description={`Un champ libre de ${PERSONALIZATION_MAX_LENGTH} caractères au plus (une initiale, un âge) proposé à l'ajout au panier. Vide : pas de personnalisation.`}>
          <Field label="Libellé du champ" hint="Par exemple « Lettre ou chiffre sur la box ».">
            <input className={inputClass} value={personalizationLabel} onChange={(e) => setPersonalizationLabel(e.target.value)} maxLength={80} />
          </Field>
        </Card>

        <Card title="Référencement" description="Titre et description affichés dans Google (optionnel).">
          <div className="grid gap-4">
            <Field label="Titre SEO">
              <input className={inputClass} value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} maxLength={160} />
            </Field>
            <Field label="Description SEO">
              <textarea className={`${inputClass} min-h-20`} value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} maxLength={300} />
            </Field>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-6 lg:sticky lg:top-24">
        <Card title="Prix et disponibilité">
          <div className="grid gap-4">
            <Field label="Prix TTC (€)" required>
              <input className={inputClass} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} required />
            </Field>
            <Field label="Prix barré (€)" hint="Pour afficher une promotion.">
              <input className={inputClass} inputMode="decimal" value={compareAt} onChange={(e) => setCompareAt(e.target.value)} />
            </Field>
            <Field label="Stock" hint="Vide = illimité.">
              <input className={inputClass} inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} />
            </Field>
            <Field label="Badge">
              <select className={inputClass} value={badge} onChange={(e) => setBadge(e.target.value as ShopProductBadge | "")}>
                <option value="">Aucun</option>
                <option value="best-seller">Best-seller</option>
                <option value="nouveau">Nouveau</option>
                <option value="coup-de-coeur">Coup de cœur</option>
              </select>
            </Field>
            <Field label="Ordre d'affichage" hint="Les plus petits en premier.">
              <input className={inputClass} inputMode="numeric" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            </Field>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>
                Visible en boutique
                <span className="block text-xs text-muted">Décochez pour masquer sans supprimer.</span>
              </span>
              <Toggle checked={isActive} onChange={setIsActive} label="Visible en boutique" />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>
                Mis en avant
                <span className="block text-xs text-muted">Affiché sur la page d&apos;accueil.</span>
              </span>
              <Toggle checked={isFeatured} onChange={setIsFeatured} label="Mis en avant" />
            </label>
          </div>
        </Card>
        <button type="submit" disabled={busy} className={`${primaryButton} justify-center`}>
          {busy ? "Enregistrement…" : product ? "Enregistrer" : "Créer le produit"}
        </button>
        {product && (
          <button type="button" onClick={() => setDeleteOpen(true)} className={`${dangerButton} justify-center`}>
            Supprimer ce produit
          </button>
        )}
      </div>

      {product && deleteOpen && (
        <ConfirmDialog
          title="Supprimer ce produit ?"
          message="Les commandes passées conservent leur historique. Cette action est définitive."
          confirmLabel="Supprimer"
          destructive
          onClose={() => setDeleteOpen(false)}
          onConfirm={async () => {
            try {
              await api.deleteProduct(product.id);
              toast.success("Produit supprimé");
              router.push("/gestion/produits");
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Suppression impossible.");
            }
          }}
        />
      )}
    </form>
  );
}
