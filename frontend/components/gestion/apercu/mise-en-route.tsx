"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import * as api from "@/lib/gestion/api";
import { isItemAvailable, isPickupShop } from "@/lib/gestion/selectors";
import type { GestionState } from "@/lib/gestion/types";
import { getPushStatus, type PushStatus } from "@/lib/push/client";
import { collectSiteUrl, menuSiteUrl } from "@/lib/site";
import { CheckIcon, ExternalLinkIcon } from "../icons";
import { GlassButton, GlassFrame, Plate } from "../ui";

/*
 * « Avant votre premier service » (UX-SIMPLICITÉ § 3.3) : la carte de
 * bienvenue et la liste de mise en route, à la place de la visite d'accueil.
 * Chaque étape est un lien direct et se coche d'elle-même quand la donnée
 * existe. La carte disparaît seule une fois tout fait, ou d'un « Masquer »
 * — mémorisé comme la visite d'accueil l'était : « bienvenue » rejoint les
 * visites vues du compte.
 */

interface Step {
  id: string;
  label: string;
  href: string;
  done: boolean;
  /** La page client, dans un nouvel onglet. */
  external?: boolean;
}

export function MiseEnRoute({ state }: { state: GestionState }) {
  // L'abonnement push se lit sur l'appareil, pas dans l'état : on l'attend
  // avant d'afficher la liste, plutôt que de cocher une étape après coup.
  const [push, setPush] = useState<PushStatus | null>(null);
  useEffect(() => {
    let live = true;
    void getPushStatus().then((status) => {
      if (live) setPush(status);
    });
    return () => {
      live = false;
    };
  }, []);

  if (
    state.role !== "gerant" ||
    !state.visitesVues ||
    state.visitesVues.includes("bienvenue") ||
    push === null
  ) {
    return null;
  }

  const pickupShop = isPickupShop(state);
  const items = state.categories.flatMap((category) => category.items);
  const { etablissement, features } = state;
  const steps: Step[] = [
    { id: "carte", label: "Créer ma carte", href: "/gestion/menu", done: items.length > 0 },
    {
      id: "client",
      label: pickupShop ? "Vérifier ma boutique côté client" : "Vérifier mon menu côté client",
      href: pickupShop
        ? `${collectSiteUrl}/${etablissement.slug}`
        : `${menuSiteUrl}/m/${etablissement.slug}`,
      external: true,
      done: items.some(isItemAvailable),
    },
  ];
  if (features.commandes) {
    steps.push({
      id: "paiement",
      label: "Relier mon compte de paiement",
      href: "/gestion/etablissement",
      done: etablissement.paymentProvider !== null || etablissement.onlinePayment,
    });
  }
  if (features.roles) {
    steps.push({
      id: "equipe",
      label: "Inviter mon équipe",
      href: "/gestion/equipe",
      done:
        state.staff.length > 0 ||
        state.members.some((member) => member.userId !== state.userId),
    });
  }
  // Sans Web Push sur cet appareil, l'étape n'a rien à cocher ici.
  if (features.commandes && push !== "unsupported") {
    steps.push({
      id: "alertes",
      label: "Recevoir les commandes sur cet appareil",
      href: "/gestion/notifications",
      done: push === "on",
    });
  }
  if (pickupShop || etablissement.serviceMode === "fast_food") {
    steps.push({
      id: "horaires",
      label: "Vérifier mes horaires",
      href: "/gestion/etablissement",
      done: etablissement.openingHours !== null || etablissement.hours.trim() !== "",
    });
  }

  const done = steps.filter((step) => step.done).length;
  const next = steps.find((step) => !step.done);
  if (!next) return null;
  const remaining = steps.length - done;
  const startLabel = next.id === "carte" ? "Commencer par ma carte" : next.label;

  return (
    <GlassFrame entity="orders" eyebrow="Avant votre premier service" icon={<CheckIcon />}>
      <Plate>
        <div className="p-5">
          <h2 className="font-display text-g-h2">Bienvenue, {etablissement.name}</h2>
          <p className="mt-1.5 text-g-body text-muted">
            {done === 0
              ? "Votre espace est prêt. Quelques étapes, et vos clients commandent."
              : `Encore ${remaining} étape${remaining > 1 ? "s" : ""} avant d’ouvrir.`}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {next.external ? (
              <a
                href={next.href}
                target="_blank"
                rel="noopener"
                className="g-btn g-btn-primary g-press"
              >
                {startLabel}
                <ExternalLinkIcon />
              </a>
            ) : (
              <GlassButton variant="primary" href={next.href}>
                {startLabel}
              </GlassButton>
            )}
            <button
              type="button"
              onClick={() => void api.markVisitesVues(["bienvenue"])}
              className="text-g-label font-medium text-muted underline-offset-2 hover:underline"
            >
              Masquer
            </button>
          </div>
        </div>
        <div className="border-t border-hairline px-5 pb-2 pt-4">
          <div className="flex items-center gap-3 pb-2">
            <span className="text-g-meta text-muted tabular-nums">
              {done} sur {steps.length}
            </span>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={steps.length}
              aria-valuenow={done}
              aria-label="Mise en route"
              className="g-progress flex-1"
              style={{ "--g-v": done, "--g-max": steps.length } as CSSProperties}
            >
              <i />
            </div>
          </div>
          <ol className="m-0 list-none p-0">
            {steps.map((step) => {
              const body = (
                <>
                  <span className="g-check" data-done={step.done ? "" : undefined} aria-hidden>
                    <CheckIcon />
                  </span>
                  <span className="g-step-label min-w-0 flex-1 truncate text-g-body font-medium">
                    {step.label}
                  </span>
                  <span className="text-g-meta text-muted">
                    {step.done ? "Fait" : step.external ? <ExternalLinkIcon className="size-4" /> : "›"}
                  </span>
                </>
              );
              return (
                <li key={step.id}>
                  {step.external ? (
                    <a
                      href={step.href}
                      target="_blank"
                      rel="noopener"
                      className="g-step"
                      data-done={step.done ? "" : undefined}
                    >
                      {body}
                    </a>
                  ) : (
                    <Link href={step.href} className="g-step" data-done={step.done ? "" : undefined}>
                      {body}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </Plate>
    </GlassFrame>
  );
}
