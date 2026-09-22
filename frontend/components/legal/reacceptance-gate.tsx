"use client";

import { useState } from "react";
import { PRICE_NOTICE_DAYS } from "@/lib/legal/constants";
import {
  isSignable,
  signContract,
  type ContractScope,
  type SignableContract,
} from "@/lib/legal/client";
import { frenchDate } from "@/lib/legal/format";
import { AcceptTerms, useContractState } from "./accept-terms";

/*
 * Verrou de réacceptation. C'est la contrepartie de la clause de révision :
 * un tarif ne change pas parce qu'Ominin l'a décidé, il change parce que le
 * client a de nouveau signé — après le préavis annoncé, et libre de résilier
 * sans frais plutôt que d'accepter. Sans cet écran la clause serait un
 * déséquilibre significatif (art. 1171 code civil) ; avec lui, elle tient.
 *
 * Trois états :
 *  - une version est annoncée pour plus tard → bandeau d'information, rien
 *    n'est bloqué, le client a le temps de lire et de partir ;
 *  - elle est en vigueur et signée → rien ne s'affiche ;
 *  - elle est en vigueur et non signée → l'espace est remplacé par la demande
 *    d'accord, pour le gérant seul. Le texte distingue une première signature
 *    d'une réacceptation.
 */
export function ReacceptanceGate({
  scope,
  children,
}: {
  /** Espace qui monte le verrou : c'est son contrat qu'on signe ici. */
  scope: ContractScope;
  children: React.ReactNode;
}) {
  const { state, error: loadError, reload } = useContractState({ scope });
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /*
   * Le verrou ne se ferme que sur une certitude : les textes sont publiés et
   * le périmètre ne les a pas signés. Dans tous les autres cas — état pas
   * encore lu, textes non publiés, appel en échec — il laisse passer : un
   * verrou qui se refermerait sur une panne d'Ominin enfermerait le client
   * hors de son espace, sans issue, pour protéger une formalité.
   *
   * Qui peut signer se décide ensuite, par le rôle : le mêler à cette
   * condition rendrait le cas du personnel inatteignable.
   */
  const locked = Boolean(isSignable(state) && state.accepted === false);

  if (!locked) {
    return (
      <>
        {state?.pending && (
          <div className="mb-6 rounded-2xl border border-ember-2/40 bg-surface p-4 text-sm leading-relaxed">
            <p className="font-semibold">
              Nos conditions évoluent le{" "}
              {frenchDate(state.pending.effectiveFrom)}.
            </p>
            <p className="mt-1 text-muted">{state.pending.summary}</p>
            <p className="mt-2 text-xs text-faint">
              Vous en êtes informé au moins {PRICE_NOTICE_DAYS} jours à
              l’avance. Si elles ne vous conviennent pas, vous pouvez résilier
              avant cette date, sans frais ni préavis.
            </p>
          </div>
        )}
        {children}
      </>
    );
  }

  const contract = state as SignableContract;
  // Première signature ou réacceptation : annoncer « nos conditions ont
  // évolué » à qui n'a jamais rien signé serait faux, et inquiétant.
  const firstSignature = contract.everSigned === false;

  /*
   * Le personnel n'est jamais arrêté. Il ne signe pas — seul le gérant le
   * peut — et couper la cuisine ou la salle en plein service pour un contrat
   * non signé ferait payer au restaurant une formalité qui ne le concerne
   * pas. Un bandeau suffit à faire remonter l'information au gérant.
   */
  if (contract.canSign === false) {
    return (
      <>
        <div className="mb-6 rounded-2xl border border-ember-2/40 bg-surface p-4 text-sm leading-relaxed">
          {`${
            firstSignature
              ? "Nos conditions doivent être acceptées"
              : "Nos conditions ont évolué. Elles doivent être acceptées"
          } par ${
            scope === "shop" ? "la propriétaire de la boutique" : "votre gérant"
          }, depuis son espace.`}
        </div>
        {children}
      </>
    );
  }

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      // Aucun `trainingOptOut` : cet écran ne pose pas la question, et
      // renvoyer une valeur lue ailleurs risquerait d'écraser le choix du
      // gérant par un défaut.
      await signContract(contract.versions, {
        context: firstSignature ? "onboarding" : "reacceptation",
        scope,
      });
      reload();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Une erreur est survenue."
      );
    } finally {
      // Toujours réarmé : une relecture qui rendrait encore « non signé »
      // laisserait sinon un bouton mort et aucun message.
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5 rounded-2xl border border-hairline bg-surface p-8">
      <div className="flex flex-col gap-2 text-center">
        <p className="ember-text text-[10px] font-semibold uppercase tracking-[0.28em]">
          {firstSignature ? "Nos conditions" : "Conditions mises à jour"}
        </p>
        <h1 className="font-display text-2xl font-medium tracking-tight">
          {firstSignature
            ? "Merci d’accepter nos conditions"
            : "Merci de relire nos conditions"}
        </h1>
        <p className="text-sm leading-relaxed text-muted">
          {firstSignature
            ? "Elles encadrent votre abonnement et l’usage de vos données. Vous pouvez les consulter et les enregistrer à tout moment."
            : "Une nouvelle version est entrée en vigueur. Votre accord la rend applicable à votre abonnement ; à défaut, il prend fin à l’échéance de la période en cours, sans frais."}
        </p>
      </div>

      <AcceptTerms
        contract={contract}
        checked={accepted}
        onChange={setAccepted}
        disabled={busy}
      />

      <button
        type="button"
        onClick={() => void confirm()}
        disabled={busy || !accepted}
        className="ember-gradient rounded-full px-6 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
      >
        {firstSignature
          ? "J’accepte les conditions"
          : "J’accepte les nouvelles conditions"}
      </button>
      {(error || loadError) && (
        <p className="text-center text-sm text-ember-3">{error ?? loadError}</p>
      )}
    </div>
  );
}
