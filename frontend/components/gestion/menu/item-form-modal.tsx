"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { PriceInput } from "@/components/ui/price-input";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { DEFAULT_VAT_RATE, VAT_RATES } from "@/lib/gestion/constants";
import { parsePriceInput, priceToInput } from "@/lib/gestion/format";
import { uploadPhoto } from "@/lib/gestion/photo";
import { isPickupShop } from "@/lib/gestion/selectors";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import { BADGE_LABELS } from "@/lib/menu/format";
import { type Badge, type MenuCategory, type MenuItem } from "@/lib/menu-data";
import {
  OptionsEditor,
  draftToOptions,
  optionsToDraft,
  type OptionGroupDraft,
} from "./options-editor";

export function ItemFormModal({
  item,
  initialCategoryId,
  categories,
  importCandidates,
  onClose,
}: {
  /** undefined ⇒ création. */
  item?: MenuItem;
  initialCategoryId: string;
  categories: MenuCategory[];
  importCandidates: MenuItem[];
  onClose: () => void;
}) {
  const { hasFeature, products } = useGestionAccess();
  const state = useGestion();
  // Sans service à table, ni accord ni cuisine : des mots qui vont à toute boutique.
  const pickupShop = isPickupShop(state);
  const toast = useToast();

  const [name, setName] = useState(item?.name ?? "");
  const [printName, setPrintName] = useState(item?.printName ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [price, setPrice] = useState(item ? priceToInput(item.price) : "");
  const [detail, setDetail] = useState(item?.detail ?? "");
  const [stock, setStock] = useState(item?.stock != null ? String(item.stock) : "");
  const [notice, setNotice] = useState(item?.noticeHours != null ? String(item.noticeHours) : "");
  const [image, setImage] = useState(item?.image ?? "");
  const [badges, setBadges] = useState<Badge[]>(item?.badges ?? []);
  const [pairing, setPairing] = useState(item?.pairing ?? "");
  const [vatRate, setVatRate] = useState(
    String(item?.vatRate ?? DEFAULT_VAT_RATE)
  );
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [options, setOptions] = useState<OptionGroupDraft[]>(
    optionsToDraft(item?.options)
  );
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handlePhotoFile = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      setImage(await uploadPhoto(file));
      toast.success("Photo téléversée.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "L'envoi de la photo a échoué."
      );
    } finally {
      setUploading(false);
    }
  };

  const parsedPrice = parsePriceInput(price);
  const stockTrimmed = stock.trim();
  const parsedStock = stockTrimmed === "" ? null : Number.parseInt(stockTrimmed, 10);
  const stockValid =
    parsedStock === null || (Number.isInteger(parsedStock) && parsedStock >= 0);
  const noticeTrimmed = notice.trim();
  const parsedNotice = noticeTrimmed === "" ? null : Number(noticeTrimmed);
  const noticeValid =
    parsedNotice === null || (Number.isInteger(parsedNotice) && parsedNotice > 0);
  const noticeInvalid = submitted && !noticeValid;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!name.trim() || parsedPrice === null || !stockValid || !noticeValid) return;

    const input: api.ItemInput = {
      name: name.trim(),
      printName: printName.trim(),
      description: description.trim(),
      price: parsedPrice,
      detail: detail.trim(),
      stock: parsedStock,
      image: image.trim(),
      badges,
      pairing: pairing.trim(),
      options: draftToOptions(options),
      categoryId,
      vatRate: Number(vatRate),
      noticeHours: parsedNotice,
    };
    try {
      if (item) {
        await api.updateItem(item.id, input);
        toast.success("Article modifié.");
      } else {
        await api.createItem(input);
        toast.success("Article ajouté.");
      }
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    }
  };

  return (
    <Modal
      title={item ? "Modifier l'article" : "Nouvel article"}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold text-muted transition-colors hover:text-foreground"
          >
            Annuler
          </button>
          <button
            type="submit"
            form="item-form"
            className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background"
          >
            Enregistrer
          </button>
        </>
      }
    >
      <form id="item-form" onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <Field label="Nom" required>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nom de l'article"
              className={`${inputClass} ${submitted && !name.trim() ? "border-ember-3/60" : ""}`}
            />
          </Field>
          <Field label="Prix" required>
            <PriceInput
              value={price}
              onChange={setPrice}
              invalid={submitted && parsedPrice === null}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_8rem_8rem]">
          <Field label="Catégorie" required>
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className={inputClass}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Stock" hint="Vide = illimité">
            <input
              value={stock}
              onChange={(event) => setStock(event.target.value)}
              inputMode="numeric"
              placeholder="∞"
              className={`${inputClass} ${submitted && !stockValid ? "border-ember-3/60" : ""}`}
            />
          </Field>
          <Field
            label="TVA"
            hint={pickupShop ? "Reprise sur les tickets et les paiements" : "Appliquée à cet article en caisse"}
          >
            <select
              value={vatRate}
              onChange={(event) => setVatRate(event.target.value)}
              className={inputClass}
            >
              {VAT_RATES.map((rate) => (
                <option key={rate} value={String(rate)}>
                  {String(rate).replace(".", ",")} %
                </option>
              ))}
            </select>
          </Field>
        </div>

        {products.collect && (
          <Field
            label="Délai de commande (heures)"
            hint="Click & collect : le client choisit un retrait au plus tôt ce délai après sa commande. Vide = pour le prochain créneau."
            error={noticeInvalid ? "Indiquez un nombre entier d'heures, ou laissez vide." : undefined}
          >
            <input
              value={notice}
              onChange={(event) => setNotice(event.target.value)}
              inputMode="numeric"
              placeholder="48"
              aria-invalid={noticeInvalid || undefined}
              className={`${inputClass} ${noticeInvalid ? "border-ember-3/60" : ""}`}
            />
          </Field>
        )}

        {hasFeature("terminaux") && (
          <Field
            label="Nom sur le ticket"
            hint={`Ce que la ${pickupShop ? "préparation" : "cuisine"} lit sur l'imprimante. Vide : le nom de la carte.`}
          >
            <input
              value={printName}
              onChange={(event) => setPrintName(event.target.value)}
              placeholder={name.trim() || (pickupShop ? "Tarte 6 parts" : "Entrecôte")}
              maxLength={40}
              className={inputClass}
            />
          </Field>
        )}

        <Field label="Description">
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            placeholder="Ingrédients, préparation…"
            className={`${inputClass} resize-none`}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Détail"
            hint={pickupShop ? "Format ou portions (ex. 6 parts)" : "Format ou volume (ex. 33 cl)"}
          >
            <input
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
              className={inputClass}
            />
          </Field>
          {/* Masqué, l'accord déjà saisi reste enregistré tel quel. */}
          {!pickupShop && (
            <Field label="Accord suggéré">
              <input
                value={pairing}
                onChange={(event) => setPairing(event.target.value)}
                placeholder="Idéal avec un Chianti"
                className={inputClass}
              />
            </Field>
          )}
        </div>

        <Field
          label="Photo"
          hint="Téléversez une image (compressée automatiquement) ou collez une URL"
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <label
                className={`shrink-0 cursor-pointer rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
                  uploading
                    ? "border border-hairline text-faint"
                    : "ember-gradient text-background"
                }`}
              >
                {uploading ? "Envoi…" : "Téléverser une photo"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploading}
                  onChange={(event) => void handlePhotoFile(event)}
                  className="hidden"
                />
              </label>
              <input
                value={image}
                onChange={(event) => setImage(event.target.value)}
                type="url"
                placeholder="ou https://…"
                className={inputClass}
              />
            </div>
            {image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt="Aperçu de la photo du plat"
                className="h-24 w-40 rounded-xl border border-hairline object-cover"
              />
            )}
          </div>
        </Field>

        <Field label="Badges">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(BADGE_LABELS) as Badge[]).map((badge) => {
              const active = badges.includes(badge);
              return (
                <button
                  key={badge}
                  type="button"
                  onClick={() =>
                    setBadges(
                      active
                        ? badges.filter((b) => b !== badge)
                        : [...badges, badge]
                    )
                  }
                  aria-pressed={active}
                  className={`rounded-full px-4 py-2.5 text-sm font-semibold transition-all ${
                    active
                      ? "ember-gradient text-background"
                      : "border border-hairline text-muted hover:border-ember-2/40 hover:text-foreground"
                  }`}
                >
                  {BADGE_LABELS[badge]}
                </button>
              );
            })}
          </div>
        </Field>

        {hasFeature("options") && (
          <Field label="Options et variantes">
            <OptionsEditor
              value={options}
              onChange={setOptions}
              importCandidates={importCandidates}
            />
          </Field>
        )}
      </form>
    </Modal>
  );
}
