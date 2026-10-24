"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { PhotoField } from "@/components/gestion/photo-field";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { PriceInput } from "@/components/ui/price-input";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { DEFAULT_VAT_RATE, VAT_RATES } from "@/lib/gestion/constants";
import { parsePriceInput, priceToInput } from "@/lib/gestion/format";
import { isPickupShop } from "@/lib/gestion/selectors";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import { AllergenIcon } from "@/components/menu/allergen-icon";
import { isDrinkCategory } from "@/lib/menu/category-icons";
import { ALLERGEN_LABELS, BADGE_LABELS } from "@/lib/menu/format";
import { type Allergen, type Badge, type MenuCategory, type MenuItem } from "@/lib/menu-data";
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
  const [allergens, setAllergens] = useState<Allergen[] | null>(item?.allergens ?? null);
  const [pairing, setPairing] = useState(item?.pairing ?? "");
  const [vatRate, setVatRate] = useState(
    String(item?.vatRate ?? DEFAULT_VAT_RATE)
  );
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  // Une boisson ne montre pas d'allergènes sur le menu : rien à saisir.
  const current = categories.find((entry) => entry.id === categoryId);
  const drink = current ? isDrinkCategory(current) : false;
  const [options, setOptions] = useState<OptionGroupDraft[]>(
    optionsToDraft(item?.options)
  );
  const [submitted, setSubmitted] = useState(false);

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
      allergens,
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

        {!drink && (
          <AllergensField value={allergens} onChange={setAllergens} />
        )}

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

        <PhotoField value={image} onChange={setImage} alt="Aperçu de la photo du plat" />

        <Field label="Badges">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(BADGE_LABELS) as Badge[]).map((badge) => {
              const active = badges.includes(badge);
              return (
                <button
                  key={badge}
                  type="button"
                  onClick={() =>
                    setBadges((current) =>
                      current.includes(badge)
                        ? current.filter((b) => b !== badge)
                        : [...current, badge]
                    )
                  }
                  aria-pressed={active}
                  className={chip(active)}
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

const chip = (active: boolean) =>
  `inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-all ${
    active
      ? "ember-gradient text-background"
      : "border border-foreground/30 text-foreground/85 hover:border-ember-2/60 hover:text-foreground"
  }`;

/**
 * Les quatorze allergènes, et « Aucun » : rien de coché, ils ne sont pas
 * renseignés et le menu invite le client à demander à l'équipe ; « Aucun »
 * dit que le plat n'en contient aucun.
 */
function AllergensField({
  value,
  onChange,
}: {
  value: Allergen[] | null;
  onChange: Dispatch<SetStateAction<Allergen[] | null>>;
}) {
  const none = value?.length === 0;
  const toggle = (allergen: Allergen) =>
    onChange((current) => {
      const next = current?.includes(allergen)
        ? current.filter((a) => a !== allergen)
        : [...(current ?? []), allergen];
      return next.length ? next : null;
    });
  // Pas Field : son <label> renverrait un clic sur l'intitulé au premier bouton, et cocherait le gluten.
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint">
        Allergènes
      </legend>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(ALLERGEN_LABELS) as Allergen[]).map((allergen) => {
          const active = value?.includes(allergen) ?? false;
          return (
            <button
              key={allergen}
              type="button"
              onClick={() => toggle(allergen)}
              aria-pressed={active}
              className={chip(active)}
            >
              <AllergenIcon allergen={allergen} className="size-4 shrink-0" />
              {ALLERGEN_LABELS[allergen]}
            </button>
          );
        })}
      </div>
      {/* À part : « Aucun » affiche une promesse sur le menu, pas un allergène de plus. */}
      <button
        type="button"
        onClick={() => onChange((current) => (current?.length === 0 ? null : []))}
        aria-pressed={none}
        className={`${chip(none)} self-start ${none ? "" : "border-dashed border-foreground/45"}`}
      >
        <svg viewBox="0 0 16 16" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3.5 8.5l3 3 6-7" />
        </svg>
        Aucun des 14
      </button>
      <p aria-live="polite" className="text-xs text-muted">
        {value === null
          ? "Rien de coché : la fiche affichera « Allergènes non renseignés »."
          : none
            ? "La fiche affichera « Aucun des 14 allergènes ». Seulement si vous en êtes sûr."
            : "Affichés un par un sur la fiche du plat."}
      </p>
    </fieldset>
  );
}
