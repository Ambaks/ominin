"use client";

import { useId, useState } from "react";
import { PhotoField } from "@/components/gestion/photo-field";
import { Field, GlassButton, Input, Plate, Segmented, Select, Sheet } from "@/components/gestion/ui";
import { parsePriceInput, priceToInput } from "@/lib/gestion/format";
import type { PrizeDraft } from "@/lib/gestion/wheel";
import { formatPrice } from "@/lib/menu/format";
import { prizeChances } from "@/lib/menu/wheel";
import type { MenuCategory, MenuItem } from "@/lib/menu-data";
import { chanceText } from "./wheel-format";

/*
 * Un lot de la roue : un article de la carte, dont le nom, la photo et le
 * prix viennent tout seuls, ou autre chose, avec son nom, sa photo et ce
 * qu'il vaut. Sa chance se lit pendant la saisie, au budget de la roue.
 */

type Kind = "carte" | "autre";

const KINDS = [
  { value: "carte", label: "De la carte" },
  { value: "autre", label: "Autre chose" },
] as const;

export function PrizeSheet({
  initial,
  categories,
  items,
  budget,
  otherPrices,
  onSave,
  onRemove,
  onClose,
}: {
  /** Le lot à modifier ; null pour en ajouter un. */
  initial: PrizeDraft | null;
  categories: MenuCategory[];
  items: Map<string, MenuItem>;
  /** Le budget saisi, s'il est valable : la chance se calcule avec. */
  budget: number | null;
  /** Les prix des autres lots de la roue. */
  otherPrices: number[];
  onSave: (prize: PrizeDraft) => void;
  onRemove?: () => void;
  onClose: () => void;
}) {
  const formId = useId();
  const [kind, setKind] = useState<Kind>(initial && !initial.itemId ? "autre" : "carte");
  const [itemId, setItemId] = useState(initial?.itemId ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [image, setImage] = useState(initial?.image ?? "");
  const [priceRaw, setPriceRaw] = useState(initial?.price ? priceToInput(initial.price) : "");
  const [submitted, setSubmitted] = useState(false);

  const item = kind === "carte" ? items.get(itemId) : undefined;
  const parsedPrice = parsePriceInput(priceRaw.replace(/[€\s]/g, ""));
  const price = kind === "carte" ? item?.price ?? null : parsedPrice;
  const errors = {
    item: kind === "carte" && !item ? "Choisissez un article de la carte." : item && item.price <= 0 ? "Cet article est offert à la carte : choisissez-en un qui a un prix." : undefined,
    label: kind === "autre" && !label.trim() ? "Donnez-lui un nom, par exemple « Tote bag »." : undefined,
    price: kind === "autre" && !(parsedPrice && parsedPrice > 0) ? "Indiquez ce qu'il vaut, par exemple 12 ou 7,50." : undefined,
    image: kind === "autre" && !image.trim() ? "Ajoutez une photo : c'est elle qu'on voit sur la roue." : undefined,
  };
  const valid = !Object.values(errors).some(Boolean);
  const chance = budget && price && price > 0 ? prizeChances(budget, [...otherPrices, price]).at(-1)! : null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!valid) return;
    onSave(
      kind === "carte"
        ? { itemId, label: label.trim(), image: image.trim() }
        : { label: label.trim(), image: image.trim(), price: parsedPrice! }
    );
  };

  return (
    <Sheet
      title={initial ? "Modifier le lot" : "Ajouter un lot"}
      description="Un article de votre carte, ou autre chose : un nom, une photo, un prix."
      onClose={onClose}
      footer={
        <>
          {onRemove && (
            <GlassButton variant="danger" onClick={onRemove} className="mr-auto">
              Retirer de la roue
            </GlassButton>
          )}
          <GlassButton onClick={onClose}>Annuler</GlassButton>
          <GlassButton variant="primary" type="submit" form={formId}>
            {initial ? "Valider" : "Ajouter le lot"}
          </GlassButton>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Segmented
          label="Ce que la roue offre"
          options={KINDS}
          value={kind}
          onChange={(next) => {
            setKind(next);
            setSubmitted(false);
          }}
          glass={false}
        />

        {kind === "carte" ? (
          <>
            <Field label="Article" required error={submitted ? errors.item : undefined}>
              <Select value={itemId} onChange={(event) => setItemId(event.target.value)} data-autofocus>
                <option value="">Choisir un article…</option>
                {categories.map((category) => (
                  <optgroup key={category.id} label={category.name}>
                    {category.items.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.name} · {formatPrice(candidate.price)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </Field>
            <Field label="Nom sur la roue" hint="Court, il tient sur une case. Vide : le nom de la carte.">
              <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder={item?.name ?? "Café"} maxLength={40} />
            </Field>
            <PhotoField
              value={image}
              onChange={setImage}
              alt={label || item?.name || "Lot de la roue"}
              label={item?.image ? "Autre photo (facultatif)" : "Photo"}
            />
          </>
        ) : (
          <>
            <Field label="Nom" required error={submitted ? errors.label : undefined}>
              <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Tote bag" maxLength={40} data-autofocus />
            </Field>
            <Field
              label="Valeur"
              required
              hint="Ce qu'il vaut pour vous : plus il vaut, plus il sort rarement."
              error={submitted ? errors.price : undefined}
            >
              <Input
                numeric
                unit="€"
                value={priceRaw}
                onChange={(event) => setPriceRaw(event.target.value)}
                onBlur={() => parsedPrice !== null && setPriceRaw(priceToInput(parsedPrice))}
                placeholder="12,00"
                className="w-32"
              />
            </Field>
            <PhotoField
              value={image}
              onChange={setImage}
              alt={label || "Lot de la roue"}
              error={submitted ? errors.image : undefined}
            />
          </>
        )}

        <Plate className="flex items-center justify-between gap-3 p-4">
          <span className="text-g-label text-muted">Sa chance à chaque tour</span>
          <span className="text-right text-g-body font-semibold tabular-nums">
            {chance === null ? "—" : chanceText(chance)}
          </span>
        </Plate>
      </form>
    </Sheet>
  );
}
