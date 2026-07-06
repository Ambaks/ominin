import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";

export function FeatureLocked() {
  return (
    <EmptyState
      title="Disponible avec l'offre Smart"
      body="Le suivi des commandes et la gestion des tables font partie des offres Smart et Connect."
      action={
        <Link
          href="/gestion"
          className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background"
        >
          Retour à l’aperçu
        </Link>
      }
    />
  );
}
