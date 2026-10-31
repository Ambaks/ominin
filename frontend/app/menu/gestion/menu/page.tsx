"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { FormuleBuilder } from "@/components/gestion/formules/formule-builder";
import { FormuleCard } from "@/components/gestion/formules/formule-card";
import { Presentation } from "@/components/gestion/formules/presentation";
import { CategoryManager } from "@/components/gestion/menu/category-manager";
import { ItemFormModal } from "@/components/gestion/menu/item-form-modal";
import { MenuItemCard } from "@/components/gestion/menu/menu-item-card";
import { TarifsInline } from "@/components/gestion/tarifs-planifies";
import { EmptyState, GlassButton, SectionHeading, Segmented } from "@/components/gestion/ui";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, inputClass } from "@/components/ui/field";
import { useRunMutation, useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { WAIT_TICK_MS } from "@/lib/gestion/constants";
import { closedItems, serviceClock } from "@/lib/gestion/fermetures";
import { isPickupShop } from "@/lib/gestion/selectors";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import {
  loadItemRoutingMap,
  loadPrinters,
  setItemPrinter,
  type Printer,
} from "@/lib/gestion/terminaux";
import type { Formule } from "@/lib/gestion/types";
import { useNow } from "@/lib/gestion/use-now";
import { isDrinkCategory } from "@/lib/menu/category-icons";
import { effectiveTarif, fetchActiveTarifs, type TarifMap } from "@/lib/menu/tarifs";
import type { MenuItem } from "@/lib/menu-data";
import { moved } from "@/lib/move";
import { createClient } from "@/lib/supabase/client";

type View = "menu" | "formules";

const VIEWS: { value: View; label: string }[] = [
  { value: "menu", label: "Carte" },
  { value: "formules", label: "Formules" },
];

export default function MenuPage() {
  const state = useGestion();
  const { can, role, hasFeature } = useGestionAccess();
  const run = useRunMutation();
  const toast = useToast();
  const [view, setView] = useState<View>("menu");
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [creatingItem, setCreatingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<MenuItem | null>(null);
  const [managingCats, setManagingCats] = useState(false);
  const [creatingFormule, setCreatingFormule] = useState(false);
  const [editingFormule, setEditingFormule] = useState<Formule | null>(null);
  const [deletingFormule, setDeletingFormule] = useState<Formule | null>(null);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [routing, setRouting] = useState<Map<string, string>>(new Map());
  // Les prix que les tarifs planifiés donnent à cet instant, relus en base :
  // c'est la fonction SQL qui facture qui répond, pas un calcul refait ici.
  const [tarifs, setTarifs] = useState<TarifMap>(new Map());
  // La fermeture de 22 h se lit sur les fiches sans recharger la page.
  const now = useNow(WAIT_TICK_MS);

  const etablissementId = state?.etablissement.id;
  const priceRules = state?.priceRules;
  const showRouting = hasFeature("commandes") && printers.length > 0;
  const canRoute = role === "gerant";

  const refreshRouting = useCallback(async () => {
    if (!etablissementId) return;
    const p = await loadPrinters(etablissementId);
    setPrinters(p);
    const map = await loadItemRoutingMap(p.map((pr) => pr.id));
    setRouting(map);
  }, [etablissementId]);

  useEffect(() => {
    // Faux positif : les setState de refreshRouting arrivent après des await
    // (réponse réseau), pas de façon synchrone dans l'effet.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshRouting().catch(() => {});
  }, [refreshRouting]);

  useEffect(() => {
    if (!etablissementId) return;
    let live = true;
    // `priceRules` en dépendance : après une modification, la relecture montre
    // le prix qui en découle plutôt que celui d'avant.
    fetchActiveTarifs(createClient(), etablissementId)
      .then((loaded) => {
        if (live) setTarifs(loaded);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [etablissementId, priceRules]);

  const handlePrinterChange = async (itemId: string, printerId: string | null) => {
    setRouting((prev) => {
      const next = new Map(prev);
      if (printerId) next.set(itemId, printerId);
      else next.delete(itemId);
      return next;
    });
    try {
      await setItemPrinter(itemId, printerId);
    } catch {
      toast.error("Imprimante non enregistrée : vérifiez le réseau, puis réessayez.");
      await refreshRouting();
    }
  };

  if (!state) return null;

  const canEditMenu = can("menu.edit");
  const canEditFormules = can("formules.edit");
  const categories = state.categories;
  const category = categories.find((c) => c.id === activeCatId) ?? categories[0];
  const importCandidates = categories
    .flatMap((c) => c.items)
    .filter((item) => item.options?.length);
  const editingCategoryId = editingItem
    ? categories.find((c) => c.items.some((item) => item.id === editingItem.id))?.id
    : undefined;
  // Les tarifs planifiés se règlent ici, devant l'article ou la catégorie
  // qu'ils touchent — c'est là que le gérant regarde ses prix.
  const canTarif = can("etablissement.edit");
  // Boutique à emporter : le « + » des tarifs reste sur la catégorie, dont le
  // formulaire vise aussi bien un seul article ; les articles n'affichent que
  // leurs tarifs existants.
  const pickupShop = isPickupShop(state);
  const rulesOn = (kind: "item" | "category", id: string) =>
    state.priceRules.filter((rule) =>
      rule.targets.some((target) => target.kind === kind && target.id === id)
    );
  const closed = closedItems(
    state.closures,
    categories,
    serviceClock(now, state.dayEndHour),
    state.dayEndHour
  );
  const itemCount = categories.reduce((sum, c) => sum + c.items.length, 0);

  const moveItem = (index: number, delta: -1 | 1) => {
    if (!category) return;
    const ids = moved(
      category.items.map((item) => item.id),
      index,
      delta
    );
    void run(() => api.reorderItems(category.id, ids));
  };

  const addItemButton = (visite?: boolean) =>
    canEditMenu &&
    category && (
      <GlassButton
        variant="primary"
        data-visite={visite ? "menu-ajouter" : undefined}
        onClick={() => setCreatingItem(true)}
      >
        + Ajouter un article
      </GlassButton>
    );

  return (
    <div className="flex flex-col gap-g-gap">
      <section className="g-rise" style={{ "--g-i": 0 } as CSSProperties}>
        <SectionHeading
          level={1}
          title={view === "menu" ? "Carte" : "Formules"}
          sub={
            view === "menu"
              ? itemCount === 0
                ? "Ce que vos clients lisent en scannant le QR code."
                : `${itemCount} article${itemCount > 1 ? "s" : ""} dans ${categories.length} catégorie${categories.length > 1 ? "s" : ""} · un changement apparaît sur le menu dans la minute.`
              : "Entrée + plat, menu du midi… en tête du menu client."
          }
          right={
            <div data-visite="menu-vues" className="rounded-full">
              <Segmented<View> label="Vue" options={VIEWS} value={view} onChange={setView} />
            </div>
          }
        />
      </section>

      {view === "menu" && (
        <>
          {!category ? (
            <section className="g-rise" style={{ "--g-i": 1 } as CSSProperties}>
              <EmptyState
                text="Aucune catégorie : créez-en une (entrées, pizzas, boissons…), le bouton « + Ajouter un article » apparaît alors."
                action={
                  canEditMenu && (
                    <GlassButton
                      variant="primary"
                      data-visite="menu-premiere-categorie"
                      onClick={() => setManagingCats(true)}
                    >
                      Créer une catégorie
                    </GlassButton>
                  )
                }
              />
            </section>
          ) : (
            <>
              <section
                className="g-rise flex flex-wrap items-center gap-2"
                style={{ "--g-i": 1 } as CSSProperties}
              >
                <div
                  role="tablist"
                  aria-label="Catégories"
                  className="no-scrollbar -mx-4 flex max-w-full gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
                >
                  {categories.map((c) => {
                    const active = c.id === category.id;
                    return (
                      <GlassButton
                        key={c.id}
                        role="tab"
                        aria-selected={active}
                        variant={active ? "primary" : "secondary"}
                        onClick={() => setActiveCatId(c.id)}
                      >
                        {c.name}
                        <span className={`text-g-meta tabular-nums ${active ? "" : "text-muted"}`}>
                          {c.items.length}
                        </span>
                      </GlassButton>
                    );
                  })}
                </div>
                {canEditMenu && (
                  <div className="ml-auto flex shrink-0 gap-2">
                    <GlassButton data-visite="menu-categories" onClick={() => setManagingCats(true)}>
                      Catégories
                    </GlassButton>
                    {addItemButton(true)}
                  </div>
                )}
              </section>

              <section
                className="g-rise flex flex-col gap-3"
                style={{ "--g-i": 2 } as CSSProperties}
              >
                {canEditMenu ? (
                  <Field label="Note de catégorie" hint="Affichée sous son nom sur le menu client.">
                    <input
                      key={category.id}
                      defaultValue={category.tagline ?? ""}
                      placeholder="Servies avec leur pain maison…"
                      onBlur={(event) => {
                        const value = event.target.value;
                        if (value.trim() === (category.tagline ?? "")) return;
                        void run(
                          () => api.updateCategoryTagline(category.id, value),
                          "Note enregistrée."
                        );
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur();
                      }}
                      className={`${inputClass} max-w-xl`}
                    />
                  </Field>
                ) : (
                  category.tagline && (
                    <p className="text-g-meta text-muted">{category.tagline}</p>
                  )
                )}

                {/* Un tarif posé ici vaut pour toute la catégorie, articles
                    ajoutés plus tard compris. */}
                <TarifsInline
                  target={{ kind: "category", id: category.id }}
                  owned={rulesOn("category", category.id)}
                  categories={categories}
                  canEdit={canTarif}
                />
              </section>

              {category.items.length === 0 ? (
                <section className="g-rise" style={{ "--g-i": 3 } as CSSProperties}>
                  <EmptyState
                    text={`« ${category.name} » est vide : ajoutez un premier article.`}
                    action={addItemButton()}
                  />
                </section>
              ) : (
                <div className="grid gap-g-gap lg:grid-cols-2">
                  {category.items.map((item, index) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      index={index + 3}
                      drink={isDrinkCategory(category)}
                      printers={showRouting ? printers : []}
                      printerId={routing.get(item.id) ?? null}
                      canRoute={canRoute}
                      first={index === 0}
                      last={index === category.items.length - 1}
                      tarifs={
                        <TarifsInline
                          target={{ kind: "item", id: item.id }}
                          owned={rulesOn("item", item.id)}
                          inherited={rulesOn("category", category.id)}
                          categories={categories}
                          canEdit={canTarif}
                          offerNew={!pickupShop}
                          effective={effectiveTarif(tarifs, item)}
                        />
                      }
                      closedBy={closed.get(item.id)}
                      onMove={canEditMenu ? (delta) => moveItem(index, delta) : undefined}
                      onEdit={() => setEditingItem(item)}
                      onDelete={() => setDeletingItem(item)}
                      onPrinterChange={(pid) => void handlePrinterChange(item.id, pid)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {view === "formules" && (
        <>
          {canEditFormules && state.formules.length > 0 && (
            <section className="g-rise flex justify-end" style={{ "--g-i": 1 } as CSSProperties}>
              <GlassButton variant="primary" onClick={() => setCreatingFormule(true)}>
                + Nouvelle formule
              </GlassButton>
            </section>
          )}

          {state.formules.length === 0 ? (
            <section className="g-rise" style={{ "--g-i": 1 } as CSSProperties}>
              <EmptyState
                text="Aucune formule : proposez un menu à étapes (entrée + plat + dessert…) à un prix unique."
                action={
                  canEditFormules && (
                    <GlassButton variant="primary" onClick={() => setCreatingFormule(true)}>
                      Créer une formule
                    </GlassButton>
                  )
                }
              />
            </section>
          ) : (
            <div className="grid gap-g-gap lg:grid-cols-2">
              {state.formules.map((formule, index) => (
                <FormuleCard
                  key={formule.id}
                  formule={formule}
                  index={index + 2}
                  placed={Boolean(formule.affiche)}
                  onEdit={() => setEditingFormule(formule)}
                  onDelete={() => setDeletingFormule(formule)}
                />
              ))}
            </div>
          )}

          <section
            className="g-rise"
            style={{ "--g-i": state.formules.length + 2 } as CSSProperties}
          >
            <Presentation
              affiches={state.affiches}
              formules={state.formules}
              canEdit={canEditFormules}
            />
          </section>
        </>
      )}

      {(creatingItem || editingItem) && category && (
        <ItemFormModal
          item={editingItem ?? undefined}
          initialCategoryId={editingCategoryId ?? category.id}
          categories={categories}
          importCandidates={importCandidates.filter((item) => item.id !== editingItem?.id)}
          onClose={() => {
            setCreatingItem(false);
            setEditingItem(null);
          }}
        />
      )}

      {deletingItem && (
        <ConfirmDialog
          title={`Supprimer « ${deletingItem.name} » ?`}
          message="L'article sera retiré définitivement du menu. Pour une rupture passagère, désactivez plutôt « En vente »."
          confirmLabel="Supprimer"
          destructive
          onClose={() => setDeletingItem(null)}
          onConfirm={() =>
            void run(async () => {
              await api.deleteItem(deletingItem.id);
              setDeletingItem(null);
            }, "Article supprimé.")
          }
        />
      )}

      {managingCats && (
        <CategoryManager categories={categories} onClose={() => setManagingCats(false)} />
      )}

      {(creatingFormule || editingFormule) && (
        <FormuleBuilder
          formule={editingFormule ?? undefined}
          categories={categories}
          onClose={() => {
            setCreatingFormule(false);
            setEditingFormule(null);
          }}
        />
      )}

      {deletingFormule && (
        <ConfirmDialog
          title={`Supprimer « ${deletingFormule.name} » ?`}
          message="La formule sera retirée définitivement du menu. Pour une pause, désactivez plutôt « En vente »."
          confirmLabel="Supprimer"
          destructive
          onClose={() => setDeletingFormule(null)}
          onConfirm={() =>
            void run(async () => {
              await api.deleteFormule(deletingFormule.id);
              setDeletingFormule(null);
            }, "Formule supprimée.")
          }
        />
      )}
    </div>
  );
}
