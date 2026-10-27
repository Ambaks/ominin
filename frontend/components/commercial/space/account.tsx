"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useRunMutation } from "@/components/ui/toast";
import { resign } from "@/lib/commercial/api";
import { commercialName } from "@/lib/commercial/record";
import { COMMERCIAL_NOTICE_MONTHS } from "@/lib/legal/constants";
import { frenchDate } from "@/lib/legal/format";
import { commercialPrefix } from "@/lib/site";
import { createClient } from "@/lib/supabase/client";
import { useAccount } from "./shell";
import { PageTitle, SectionTitle, cardClass, ghostButton } from "./ui";

/** Compte : identité déclarée à la signature, fin du contrat, résiliation (art. 7.2). */
export function AccountPanel() {
  const account = useAccount();
  const router = useRouter();
  const run = useRunMutation();
  const [confirming, setConfirming] = useState(false);

  const signOut = async () => {
    await createClient().auth.signOut();
    window.location.assign(`${commercialPrefix}/connexion`);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageTitle>Mon compte</PageTitle>
      <section className="flex flex-col gap-2.5">
        <SectionTitle>Identité</SectionTitle>
        <dl className={`${cardClass} grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm`}>
          <dt className="text-muted">Nom</dt>
          <dd>
            {account.first_name && account.last_name
              ? commercialName({ firstName: account.first_name, lastName: account.last_name })
              : "—"}
          </dd>
          <dt className="text-muted">SIRET</dt>
          <dd>{account.siret ?? "—"}</dd>
          <dt className="text-muted">Adresse</dt>
          <dd className="break-words">{account.address ?? "—"}</dd>
          <dt className="text-muted">Téléphone</dt>
          <dd>{account.phone ?? "—"}</dd>
          <dt className="text-muted">E-mail</dt>
          <dd className="break-all">{account.email}</dd>
        </dl>
        <p className="text-xs text-faint">
          L’identité fait partie du contrat signé : pour la changer, écrivez à Ominin.
        </p>
      </section>

      <section className="flex flex-col gap-2.5">
        <SectionTitle>Contrat</SectionTitle>
        <div className={`${cardClass} flex flex-col gap-3 text-sm`}>
          {account.contract_end && (
            <p>
              {account.ended ? "Terminé le " : "Prend fin le "}
              <span className="font-medium">{frenchDate(account.contract_end)}</span>
              {account.option_exercised_at && !account.ended ? ", option de prolongation levée par Ominin." : "."}
            </p>
          )}
          {!account.ended && (
            <p className="text-muted">
              Déclarations en cours au plus :{" "}
              <span className="text-foreground">{account.declaration_cap ?? "pas de plafond"}</span>. Carence après un
              abandon ou une expiration :{" "}
              <span className="text-foreground">
                {account.cooldown_days ? `${account.cooldown_days} jours` : "aucune"}
              </span>
              .
            </p>
          )}
          {!account.ended && !account.notice_given_at && (
            <button type="button" onClick={() => setConfirming(true)} className={ghostButton}>
              Résilier mon contrat
            </button>
          )}
        </div>
      </section>

      <button type="button" onClick={() => void signOut()} className={ghostButton}>
        Se déconnecter
      </button>

      {confirming && (
        <ConfirmDialog
          title="Résilier le contrat"
          message={`Votre contrat prendra fin dans ${COMMERCIAL_NOTICE_MONTHS} mois (article 7.2). D’ici là, vos réservations restent valables et vous pouvez encore déclarer ; après, vos déclarations en cours sont closes.`}
          confirmLabel="Résilier"
          destructive
          onClose={() => setConfirming(false)}
          onConfirm={() =>
            void run(async () => {
              setConfirming(false);
              await resign();
              router.refresh();
            }, "Résiliation enregistrée")
          }
        />
      )}
    </div>
  );
}
