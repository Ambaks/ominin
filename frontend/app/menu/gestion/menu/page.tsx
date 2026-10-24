"use client";

import { useCallback, useEffect, useState } from "react";
import { AfficheCard } from "@/components/gestion/formules/affiche-card";
import { AfficheFormModal } from "@/components/gestion/formules/affiche-form-modal";
import { FormuleCard } from "@/components/gestion/formules/formule-card";
import { FormuleFormModal } from "@/components/gestion/formules/formule-form-modal";
import { CategoryManager } from "@/components/gestion/menu/category-manager";
import { ItemFormModal } from "@/components/gestion/menu/item-form-modal";
import { MenuItemCard } from "@/components/gestion/menu/menu-item-card";
import { TarifsInline } from "@/components/gestion/tarifs-planifies";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PillTabs } from "@/components/ui/pill-tabs";
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
import type { Affiche, Formule } from "@/lib/gestion/types";
import { useNow } from "@/lib/gestion/use-now";
import { isDrinkCategory } from "@/lib/menu/category-icons";
import { effectiveTarif, fetchActiveTarifs, type TarifMap } from "@/lib/menu/tarifs";
import type { MenuItem } from "@/lib/menu-data";
import { moved } from "@/lib/move";
import { createClient } from "@/lib/supabase/client";

type View = "menu" | "formules";

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
  const [formuleSlot, setFormuleSlot] = useState<Formule["affiche"]>();
  const [editingFormule, setEditingFormule] = useState<Formule | null>(null);
  const [deletingFormule, setDeletingFormule] = useState<Formule | null>(null);
  const [creatingAffiche, setCreatingAffiche] = useState(false);
  const [editingAffiche, setEditingAffiche] = useState<Affiche | null>(null);
  const [deletingAffiche, setDeletingAffiche] = useState<Affiche | null>(null);
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

  const handlePrinterChange = async (
    itemId: string,
    printerId: string | null
  ) => {
    setRouting((prev) => {
      const next = new Map(prev);
      if (printerId) next.set(itemId, printerId);
      else next.delete(itemId);
      return next;
    });
    try {
      await setItemPrinter(itemId, printerId);
    } catch {
      toast.error("Erreur lors de l'enregistrement.");
      await refreshRouting();
    }
  };

  if (!state) return null;

  const canEditMenu = can("menu.edit");
  const canEditFormules = can("formules.edit");
  const unplacedFormules = state.formules.filter((formule) => !formule.affiche);
  const categories = state.categories;
  const category =
    categories.find((c) => c.id === activeCatId) ?? categories[0];
  const importCandidates = categories
    .flatMap((c) => c.items)
    .filter((item) => item.options?.length);
  const editingCategoryId = editingItem
    ? categories.find((c) => c.items.some((item) => item.id === editingItem.id))?.id
    : undefined;
  const menuItems = categories.flatMap((c) => c.items);
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

  const moveItem = (index: number, delta: -1 | 1) => {
    if (!category) return;
    const ids = moved(
      category.items.map((item) => item.id),
      index,
      delta
    );
    void run(() => api.reorderItems(category.id, ids));
  };

  const viewTab = (id: View, label: string) => (
    <button
      type="button"
      onClick={() => setView(id)}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
        view === id
          ? "ember-gradient text-background"
          : "text-muted hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            data-visite="menu-vues"
            className="flex rounded-full border border-hairline p-1"
          >
            {viewTab("menu", "Menu")}
            {viewTab("formules", "Formules")}
          </div>
        </div>

        {view === "menu" && canEditMenu && (
          <div className="flex gap-2">
            <button
              type="button"
              data-visite="menu-categories"
              onClick={() => setManagingCats(true)}
              className="rounded-full border border-hairline px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
            >
              Catégories
            </button>
            {category && (
              <button
                type="button"
                data-visite="menu-ajouter"
                onClick={() => setCreatingItem(true)}
                className="ember-gradient rounded-full px-4 py-2.5 text-sm font-semibold text-background"
              >
                + Ajouter un article
              </button>
            )}
          </div>
        )}

        {view === "formules" && canEditFormules && (
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCreatingAffiche(true)}
              className="rounded-full border border-hairline px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
            >
              + Nouvelle affiche
            </button>
            <button
              type="button"
              onClick={() => setCreatingFormule(true)}
              className="ember-gradient rounded-full px-4 py-2.5 text-sm font-semibold text-background"
            >
              + Nouvelle formule
            </button>
          </div>
        )}
      </div>

      {view === "menu" && (
        <>
          {!category ? (
            <EmptyState
              title="Aucune catégorie"
              body="Créez une première catégorie pour organiser votre menu."
              action={
                canEditMenu && (
                  <button
                    type="button"
                    data-visite="menu-premiere-categorie"
                    onClick={() => setManagingCats(true)}
                    className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background"
                  >
                    Créer une catégorie
                  </button>
                )
              }
            />
          ) : (
            <>
              <PillTabs
                tabs={categories.map((c) => ({
                  id: c.id,
                  label: c.name,
                  count: c.items.length,
                }))}
                activeId={category.id}
                onSelect={setActiveCatId}
              />

              {canEditMenu ? (
                <input
                  key={category.id}
                  defaultValue={category.tagline ?? ""}
                  placeholder="Note de catégorie affichée sur le menu client…"
                  aria-label="Note de catégorie"
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
                  className="border-b border-hairline bg-transparent py-2 font-display text-base italic text-muted outline-none transition-colors placeholder:text-faint focus:border-ember-2/50 lg:pointer-fine:text-sm"
                />
              ) : (
                category.tagline && (
                  <p className="font-display text-sm italic text-muted">
                    {category.tagline}
                  </p>
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

              {category.items.length === 0 ? (
                <EmptyState
                  title="Catégorie vide"
                  body="Ajoutez un premier article à cette catégorie."
                />
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {category.items.map((item, index) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
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
                      onPrinterChange={(pid) =>
                        void handlePrinterChange(item.id, pid)
                      }
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
          <p className="text-sm text-muted">
            Les formules s&rsquo;affichent au-dessus des catégories sur le menu
            client — inutile de créer une catégorie pour elles. Une affiche
            présente vos offres en visuel : elle défile en haut du menu, avec
            un bouton par formule placée dessus.
          </p>

          {state.affiches.map((affiche) => (
            <AfficheCard
              key={affiche.id}
              affiche={affiche}
              formules={state.formules}
              canEdit={canEditFormules}
              onEdit={() => setEditingAffiche(affiche)}
              onDelete={() => setDeletingAffiche(affiche)}
              onCreateFormule={setFormuleSlot}
              onEditFormule={setEditingFormule}
              onDeleteFormule={setDeletingFormule}
            />
          ))}

          {state.affiches.length > 0 && unplacedFormules.length > 0 && (
            <h3 className="mt-2 font-display text-lg font-medium">
              Formules sans affiche{" "}
              <span className="text-sm font-normal text-muted">
                · en tuiles sur le menu
              </span>
            </h3>
          )}

          {state.formules.length === 0 && state.affiches.length === 0 ? (
            <EmptyState
              title="Aucune formule"
              body="Créez une formule pour proposer un menu à étapes (entrée + plat + dessert…), ou commencez par l'affiche qui présente vos offres."
              action={
                canEditFormules && (
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCreatingAffiche(true)}
                      className="rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
                    >
                      Créer une affiche
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreatingFormule(true)}
                      className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background"
                    >
                      Créer une formule
                    </button>
                  </div>
                )
              }
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {unplacedFormules.map((formule) => (
                <FormuleCard
                  key={formule.id}
                  formule={formule}
                  onEdit={() => setEditingFormule(formule)}
                  onDelete={() => setDeletingFormule(formule)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {(creatingItem || editingItem) && category && (
        <ItemFormModal
          item={editingItem ?? undefined}
          initialCategoryId={editingCategoryId ?? category.id}
          categories={categories}
          importCandidates={importCandidates.filter(
            (item) => item.id !== editingItem?.id
          )}
          onClose={() => {
            setCreatingItem(false);
            setEditingItem(null);
          }}
        />
      )}

      {deletingItem && (
        <ConfirmDialog
          title={`Supprimer « ${deletingItem.name} » ?`}
          message="L'article sera retiré définitivement du menu."
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

      {(creatingFormule || editingFormule || formuleSlot) && (
        <FormuleFormModal
          formule={editingFormule ?? undefined}
          slot={formuleSlot}
          menuItems={menuItems}
          onClose={() => {
            setCreatingFormule(false);
            setEditingFormule(null);
            setFormuleSlot(undefined);
          }}
        />
      )}

      {(creatingAffiche || editingAffiche) && (
        <AfficheFormModal
          affiche={editingAffiche ?? undefined}
          onClose={() => {
            setCreatingAffiche(false);
            setEditingAffiche(null);
          }}
        />
      )}

      {deletingAffiche && (
        <ConfirmDialog
          title="Supprimer cette affiche ?"
          message="Ses formules restent en vente, en tuiles sur le menu."
          confirmLabel="Supprimer"
          destructive
          onClose={() => setDeletingAffiche(null)}
          onConfirm={() =>
            void run(async () => {
              await api.deleteAffiche(deletingAffiche.id);
              setDeletingAffiche(null);
            }, "Affiche supprimée.")
          }
        />
      )}

      {deletingFormule && (
        <ConfirmDialog
          title={`Supprimer « ${deletingFormule.name} » ?`}
          message="La formule sera retirée définitivement du menu."
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
