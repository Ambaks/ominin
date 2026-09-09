"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { lockAdmin, unlockAdmin } from "@/lib/gestion/admin-lock";
import { useGestion, useRealRole, useTabletLocked } from "@/lib/gestion/store";
import { LockIcon } from "./icons";

/*
 * Passage en mode gérant depuis la tablette du restaurant. Le compte est
 * celui de l'établissement : l'espace y démarre en vue salle, ce bouton
 * l'ouvre au code, et le referme d'un geste quand la tablette retourne au
 * comptoir. Il ne paraît que si un code est posé (page Établissement).
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
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    } finally {
      setBusy(false);
    }
  };

  if (!locked) {
    return (
      <button
        type="button"
        onClick={() => lockAdmin()}
        title="Revenir à la vue salle"
        aria-label="Revenir à la vue salle"
        className="rounded-full border border-hairline p-2 text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
      >
        <LockIcon className="size-3.5" />
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="rounded-full border border-hairline px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
      >
        Admin
      </button>
      {asking && (
        <Modal
          title="Mode gérant"
          onClose={() => {
            setAsking(false);
            setCode("");
          }}
          footer={
            <button
              type="submit"
              form="admin-code"
              disabled={busy || code.length < 4}
              className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-40"
            >
              Ouvrir
            </button>
          }
        >
          <form id="admin-code" onSubmit={submit} className="flex flex-col gap-4">
            <p className="text-sm leading-relaxed text-muted">
              Entrez le code de l&rsquo;établissement pour ouvrir les écrans du
              gérant sur cette tablette.
            </p>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 8))
              }
              aria-label="Code d'accès"
              className="w-full rounded-xl border border-hairline bg-background px-4 py-3 text-center font-display text-2xl tracking-[0.5em] outline-none transition-colors focus:border-ember-2/50"
            />
          </form>
        </Modal>
      )}
    </>
  );
}
