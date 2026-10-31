"use client";

import { useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { PhotoField } from "@/components/gestion/photo-field";
import { GlassButton } from "@/components/gestion/ui";
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

/*
 * La fiche article en deux temps (UX-SIMPLICITÉ § 3.6) : nom, prix, catégorie
 * et photo suffisent à créer ; « Ajouter des détails » déplie le reste en
 * groupes nommés. À la modification, les groupes qui portent une valeur sont
 * déjà ouverts.
 */
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
  const form = useRef<HTMLFormElement>(null);

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
  const [vatRate, setVatRate] = useState(String(item?.vatRate ?? DEFAULT_VAT_RATE));
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  // Une boisson ne montre pas d'allergènes sur le menu : rien à saisir.
  const current = categories.find((entry) => entry.id === categoryId);
  const drink = current ? isDrinkCategory(current) : false;
  const [options, setOptions] = useState<OptionGroupDraft[]>(optionsToDraft(item?.options));
  const [details, setDetails] = useState(Boolean(item));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const parsedPrice = parsePriceInput(price);
  const stockTrimmed = stock.trim();
  const parsedStock = stockTrimmed === "" ? null : Number.parseInt(stockTrimmed, 10);
  const stockValid =
    parsedStock === null || (Number.isInteger(parsedStock) && parsedStock >= 0);
  const noticeTrimmed = notice.trim();
  const parsedNotice = noticeTrimmed === "" ? null : Number(noticeTrimmed);
  const noticeValid =
    parsedNotice === null || (Number.isInteger(parsedNotice) && parsedNotice > 0);
  const nameError = submitted && !name.trim() ? "Donnez un nom à l'article." : undefined;
  const priceError =
    submitted && parsedPrice === null ? "Indiquez un prix, par exemple 12,50." : undefined;
  const stockError =
    submitted && !stockValid ? "Un nombre entier, ou vide pour illimité." : undefined;
  const noticeError =
    submitted && !noticeValid ? "Un nombre entier d'heures, ou vide." : undefined;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!name.trim() || parsedPrice === null || !stockValid || !noticeValid) {
      // Une erreur dans un groupe replié ne se verrait pas : tout s'ouvre.
      if (!stockValid || !noticeValid) setDetails(true);
      return;
    }

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
    setSaving(true);
    try {
      if (item) {
        await api.updateItem(item.id, input);
        toast.success(`« ${input.name} » modifié.`);
      } else {
        await api.createItem(input);
        toast.success(`« ${input.name} » ajouté : il rejoint votre menu dans la minute.`);
      }
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Impossible d'enregistrer. Rechargez la page et réessayez."
      );
      setSaving(false);
    }
  };

  const menuOpen = Boolean(description || detail || pairing || badges.length);
  const kitchenOpen = Boolean(printName || stock || (item && item.vatRate != null && item.vatRate !== DEFAULT_VAT_RATE));

  return (
    <Modal
      title={item ? "Modifier l'article" : "Nouvel article"}
      onClose={onClose}
      footer={
        <>
          <GlassButton onClick={onClose}>Annuler</GlassButton>
          <GlassButton
            variant="primary"
            disabled={saving}
            onClick={() => form.current?.requestSubmit()}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </GlassButton>
        </>
      }
    >
      <form ref={form} onSubmit={submit} noValidate className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <Field label="Nom" required error={nameError}>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={pickupShop ? "Tarte aux pommes" : "Burrata di Parma"}
              aria-invalid={nameError ? true : undefined}
              data-autofocus={item ? undefined : ""}
              className={inputClass}
            />
          </Field>
          <Field label="Prix" required error={priceError}>
            <PriceInput value={price} onChange={setPrice} invalid={Boolean(priceError)} />
          </Field>
        </div>

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

        <PhotoField value={image} onChange={setImage} alt="Aperçu de la photo du plat" />

        {!details ? (
          <div className="flex flex-col gap-1.5 self-start">
            <GlassButton onClick={() => setDetails(true)}>Ajouter des détails</GlassButton>
            <span className="text-g-meta text-muted">
              Description, allergènes, options, cuisine… tout peut attendre.
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Group title="Sur le menu" open={menuOpen || !item}>
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
                  label="Format"
                  hint={pickupShop ? "Portions (ex. 6 parts)" : "Volume ou portion (ex. 33 cl)"}
                >
                  <input
                    value={detail}
                    onChange={(event) => setDetail(event.target.value)}
                    className={inputClass}
                  />
                </Field>
                {/* Masqué, l'accord déjà saisi reste enregistré tel quel. */}
                {!pickupShop && (
                  <Field label="Suggestion" hint="Affichée sous le plat">
                    <input
                      value={pairing}
                      onChange={(event) => setPairing(event.target.value)}
                      placeholder="Idéal avec un Chianti"
                      className={inputClass}
                    />
                  </Field>
                )}
              </div>
              <ChipsField label="Mentions">
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
              </ChipsField>
            </Group>

            {!drink && (
              <Group title="Allergènes" open={allergens !== null}>
                <AllergensField value={allergens} onChange={setAllergens} />
              </Group>
            )}

            {hasFeature("options") && (
              <Group title="Options et variantes" open={options.length > 0}>
                <OptionsEditor
                  value={options}
                  onChange={setOptions}
                  importCandidates={importCandidates}
                />
              </Group>
            )}

            <Group title={pickupShop ? "En préparation" : "En cuisine"} open={kitchenOpen}>
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
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Stock" hint="Vide = illimité" error={stockError}>
                  <input
                    value={stock}
                    onChange={(event) => setStock(event.target.value)}
                    inputMode="numeric"
                    placeholder="∞"
                    aria-invalid={stockError ? true : undefined}
                    className={inputClass}
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
            </Group>

            {products.collect && (
              <Group title="À emporter" open={notice !== ""}>
                <Field
                  label="Délai de commande (heures)"
                  hint="Click & collect : le client choisit un retrait au plus tôt ce délai après sa commande. Vide = pour le prochain créneau."
                  error={noticeError}
                >
                  <input
                    value={notice}
                    onChange={(event) => setNotice(event.target.value)}
                    inputMode="numeric"
                    placeholder="48"
                    aria-invalid={noticeError ? true : undefined}
                    className={inputClass}
                  />
                </Field>
              </Group>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}

/** Un groupe de détails, replié tant qu'il n'a rien à dire. */
function Group({ title, open, children }: { title: string; open: boolean; children: ReactNode }) {
  // L'état initial seulement : ensuite le gérant plie et déplie à sa guise.
  const [initial] = useState(open);
  return (
    <details open={initial} className="g-plate group p-4">
      <summary className="flex min-h-g-control cursor-pointer list-none items-center justify-between gap-3 text-g-body font-semibold [&::-webkit-details-marker]:hidden">
        {title}
        <svg
          viewBox="0 0 24 24"
          className="size-4 text-muted transition-transform group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="flex flex-col gap-4 pt-3">{children}</div>
    </details>
  );
}

/* Pas de Field : son <label> renverrait un clic sur l'intitulé au premier bouton. */
function ChipsField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-g-axis font-semibold uppercase tracking-wider text-faint">
        {label}
      </legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

const chip = (active: boolean) =>
  `g-press inline-flex min-h-g-control items-center gap-1.5 rounded-full px-3.5 text-g-label font-semibold ${
    active ? "ember-gradient text-background" : "border border-hairline text-foreground"
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
  return (
    <div className="flex flex-col gap-2">
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
        className={`${chip(none)} self-start ${none ? "" : "border-dashed"}`}
      >
        <svg viewBox="0 0 16 16" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3.5 8.5l3 3 6-7" />
        </svg>
        Aucun des 14
      </button>
      <p aria-live="polite" className="text-g-meta text-muted">
        {value === null
          ? "Rien de coché : la fiche affichera « Allergènes non renseignés »."
          : none
            ? "La fiche affichera « Aucun des 14 allergènes ». Seulement si vous en êtes sûr."
            : "Affichés un par un sur la fiche du plat."}
      </p>
    </div>
  );
}
