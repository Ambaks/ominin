"use client";

import { useState } from "react";
import { Field, GlassButton, Input, Plate } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { lockAdmin } from "@/lib/gestion/admin-lock";
import { describeError } from "@/lib/gestion/errors";
import { isPickupShop } from "@/lib/gestion/selectors";
import { useGestion } from "@/lib/gestion/store";

const CODE_MIN = 4;
const CODE_MAX = 8;

/*
 * Code d'accès de la tablette de salle. Une fois posé, l'espace s'ouvre en
 * vue salle sur chaque appareil : commandes, tables et pointage, rien de
 * plus. Le bouton Admin de l'en-tête rend les écrans du gérant à qui connaît
 * le code. C'est ce qui permet de laisser une tablette au comptoir sans y
 * laisser la caisse et les paiements. En boutique à emporter, sans salle,
 * c'est la tablette du comptoir. Vit dans Réglages › Appareils.
 */
export function TabletSettings({ pinSet }: { pinSet: boolean }) {
  const toast = useToast();
  const state = useGestion();
  const pickupShop = isPickupShop(state);
  const vue = pickupShop ? "vue comptoir" : "vue salle";
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const tooShort = code.length > 0 && code.length < CODE_MIN;
  const reason = busy
    ? "Un instant…"
    : tooShort
      ? `${CODE_MIN} chiffres au moins pour enregistrer.`
      : !code && !pinSet
        ? "Aucun code à retirer."
        : null;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (reason) return;
    setBusy(true);
    try {
      await api.setAdminPin(code);
      // Le nouveau code doit valoir tout de suite, y compris ici.
      if (code) lockAdmin();
      setCode("");
      toast.success(code ? "Code enregistré." : "Code retiré.");
    } catch (error) {
      toast.error(describeError(error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Plate data-visite="etablissement-tablette" className="flex flex-col gap-4 p-5">
      <div>
        <h3 className="text-g-body font-semibold">
          {pickupShop ? "Tablette du comptoir" : "Tablette de salle"}
        </h3>
        <p className="mt-1 text-g-meta text-muted">
          {pinSet
            ? `Un code est posé : l’espace démarre en ${vue} et le bouton Admin ouvre vos écrans. Saisissez un nouveau code pour le remplacer, ou laissez vide pour retirer le verrou.`
            : `Posez un code pour que l’espace démarre en ${vue} sur chaque appareil. L’équipe garde les commandes, ${pickupShop ? "les retraits" : "les tables"} et le pointage ; vos écrans s’ouvrent au code.`}
        </p>
      </div>
      <form onSubmit={save} className="grid gap-4">
        <Field label="Code d’accès" hint={`De ${CODE_MIN} à ${CODE_MAX} chiffres. Vide : aucun verrou.`}>
          <Input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, CODE_MAX))}
            placeholder={pinSet ? "••••" : "Aucun code"}
          />
        </Field>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {reason && <p className="text-g-meta text-muted">{reason}</p>}
          <GlassButton variant="primary" type="submit" disabled={reason !== null}>
            {code || !pinSet ? "Enregistrer" : "Retirer le code"}
          </GlassButton>
        </div>
      </form>
    </Plate>
  );
}
