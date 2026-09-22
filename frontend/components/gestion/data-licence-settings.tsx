"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { LEGAL_PATHS } from "@/lib/legal/constants";
import { createClient } from "@/lib/supabase/client";

/*
 * Réglage de licence de données, promis par l'article « Données et
 * amélioration des Services » des CGV et par l'accord de sous-traitance :
 * l'opposition doit être exerçable à tout moment, sinon la clause ne vaut
 * pas. Elle ne porte que sur les données personnelles des convives, une fois
 * anonymisées — les données d'exploitation du restaurant restent couvertes
 * par la licence du contrat, et le dire ici évite de laisser croire l'inverse.
 *
 * Écriture directe : les policies « gerant insert » et « gerant update » de
 * etablissement_data_licence tiennent l'autorisation côté Postgres.
 */
export function DataLicenceSettings({
  etablissementId,
}: {
  etablissementId: string;
}) {
  const toast = useToast();
  const [optOut, setOptOut] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase
      .from("etablissement_data_licence")
      .select("training_opt_out")
      .eq("etablissement_id", etablissementId)
      .maybeSingle()
      .then(({ data, error }) => {
        // Lecture en échec : on affiche l'erreur plutôt qu'une case décochée,
        // qui dirait « non opposé » à un gérant qui s'est opposé.
        if (error) setLoadError(error.message);
        else setOptOut(data?.training_opt_out ?? false);
      });
  }, [etablissementId]);

  const save = async (next: boolean) => {
    setBusy(true);
    const previous = optOut;
    setOptOut(next);
    const supabase = createClient();
    const { error } = await supabase
      .from("etablissement_data_licence")
      .upsert(
        // Pas d'updated_at : la date d'un choix contractuel se prend sur
        // l'horloge de la base, pas sur celle du navigateur du gérant.
        { etablissement_id: etablissementId, training_opt_out: next },
        { onConflict: "etablissement_id" }
      );
    setBusy(false);
    if (error) {
      setOptOut(previous);
      toast.error(error.message);
      return;
    }
    toast.success(
      next
        ? "Réutilisation désactivée pour les données de vos clients."
        : "Réutilisation activée."
    );
  };

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-hairline bg-surface p-6">
      <div>
        <h2 className="font-display text-lg font-medium">Données et modèles</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Les données personnelles de vos clients peuvent être anonymisées,
          puis servir à améliorer et entraîner nos modèles — prévisions,
          comparatifs, suggestions. Vos données d’exploitation (carte, ventes,
          horaires) restent couvertes par le contrat et ne sont pas concernées
          par ce réglage.{" "}
          <Link
            href={LEGAL_PATHS.dpa}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-hairline underline-offset-2 transition-colors hover:text-foreground"
          >
            Accord de sous-traitance
          </Link>
        </p>
      </div>
      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-muted">
        <input
          type="checkbox"
          checked={optOut ?? false}
          disabled={optOut === null || busy}
          onChange={(event) => void save(event.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-[var(--ember-2)]"
        />
        <span>
          Je m’oppose à la réutilisation des données anonymisées de mes clients.
        </span>
      </label>
      {loadError && (
        <p className="text-sm text-ember-3">
          Votre choix n’a pas pu être lu. Rechargez la page avant de le modifier.
        </p>
      )}
    </section>
  );
}
