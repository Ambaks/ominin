"use client";

import { useState } from "react";
import { GlassButton, Input, Sheet } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { describeError } from "@/lib/gestion/errors";
import { lockAdmin, unlockAdmin } from "@/lib/gestion/admin-lock";
import { isPickupShop } from "@/lib/gestion/selectors";
import { useGestion, useRealRole, useTabletLocked } from "@/lib/gestion/store";
import { LockIcon } from "./icons";

/*
 * Passage en mode gérant depuis la tablette du restaurant. Le compte est
 * celui de l'établissement : l'espace y démarre en vue salle (vue comptoir
 * dans une boutique à emporter seule), ce bouton
 * l'ouvre au code, et le referme d'un geste quand la tablette retourne au
 * comptoir. Il ne paraît que si un code est posé (page Réglages).
 */
export function AdminLockButton() {
  const state = useGestion();
  const realRole = useRealRole();
  const locked = useTabletLocked();
  const toast = useToast();
  const [asking, setAsking] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  // Seul le compte gérant a quelque chose à déverrouiller, et seulement si un
  // code est posé : sans code, rien n'est verrouillé et refermer ne voudrait
  // rien dire (le bouton n'aurait aucun effet).
  if (realRole !== "gerant" || !state?.etablissement.adminPinSet) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (await api.verifyAdminPin(code)) {
        unlockAdmin();
        setAsking(false);
        setCode("");
      } else {
        toast.error("Code incorrect.");
      }
    } catch (error) {
      toast.error(
        describeError(error).message
      );
    } finally {
      setBusy(false);
    }
  };

  if (!locked) {
    const retour = isPickupShop(state)
      ? "Revenir à la vue comptoir"
      : "Revenir à la vue salle";
    return (
      <GlassButton variant="icon" onClick={() => lockAdmin()} title={retour} aria-label={retour}>
        <LockIcon />
      </GlassButton>
    );
  }

  return (
    <>
      <GlassButton onClick={() => setAsking(true)}>Admin</GlassButton>
      {asking && (
        <Sheet
          title="Mode gérant"
          onClose={() => {
            setAsking(false);
            setCode("");
          }}
          footer={
            <>
              {code.length < 4 && <p>Tapez le code pour ouvrir.</p>}
              <GlassButton variant="primary" type="submit" form="admin-code" disabled={busy || code.length < 4}>
                Ouvrir
              </GlassButton>
            </>
          }
        >
          <form id="admin-code" onSubmit={submit} className="flex flex-col gap-4">
            <p className="text-g-label text-muted">
              Entrez le code de l&rsquo;établissement pour ouvrir les écrans du
              gérant sur cette tablette.
            </p>
            <Input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              data-autofocus
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 8))
              }
              aria-label="Code d'accès"
              className="text-center tracking-widest"
            />
          </form>
        </Sheet>
      )}
    </>
  );
}
