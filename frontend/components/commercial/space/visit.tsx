"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import type { MapRestaurant } from "@/lib/commercial/api";
import { SIGNUP_KINDS } from "@/lib/commercial/signup-form";
import { REFUSAL_REASONS, visitMessage, type VisitInput, type VisitReason } from "@/lib/commercial/visit";
import { useAccount, spaceHref } from "./shell";
import { FieldGroup, PageTitle, cardClass, Choice, errorMessage, ghostButton, primaryButton } from "./ui";

type Step = "home" | "no_follow_up" | "not_interested" | "absent" | "recap";

const bigButton = "min-h-16 w-full flex-col gap-0.5 text-base";

/*
 * La visite sur place : le deck, l'inscription, ou « pas de suite
 * aujourd'hui » (pas intéressé, avec le motif ; responsable absent, avec le
 * contact). Le récap montre la phrase qui partira dans #terrain.
 */
export function VisitScreen({ place }: { place: MapRestaurant }) {
  const account = useAccount();
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<Step>("home");
  const [visit, setVisit] = useState<VisitInput | null>(null);
  const [reason, setReason] = useState<VisitReason>();
  const [note, setNote] = useState("");
  const [contact, setContact] = useState({ name: "", phone: "", email: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (!visit) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/commercial/visite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId: place.id, visit }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "La visite n’a pas été enregistrée.");
      toast.success("Visite enregistrée.");
      router.push(spaceHref("/carte"));
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  };

  if (place.state === "client") {
    return <PageTitle sub="Ce restaurant est déjà client d’Ominin.">{place.name}</PageTitle>;
  }
  if (place.state === "visited" && !place.mine) {
    return <PageTitle sub={`Ce restaurant est suivi par ${place.holder}.`}>{place.name}</PageTitle>;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageTitle sub={place.address ?? undefined}>{place.name}</PageTitle>

      {step === "home" && (
        <div className="flex flex-col gap-3">
          <FieldGroup label="Le deck, selon l’établissement" hint="À montrer au gérant, même sans réseau une fois ouvert.">
            <div className="grid grid-cols-3 gap-2">
              {SIGNUP_KINDS.map((kind) => (
                <a key={kind.id} href={spaceHref(`/ressources/decks/${kind.id}?restaurant=${place.id}`)} className={ghostButton}>
                  {kind.label}
                </a>
              ))}
            </div>
          </FieldGroup>
          <Link href={spaceHref(`/inscription/${place.id}`)} className={`${primaryButton} ${bigButton}`}>
            Lancer l’inscription
            <span className="text-xs font-normal">Avec le gérant, sur place</span>
          </Link>
          <button type="button" onClick={() => setStep("no_follow_up")} className={`${ghostButton} ${bigButton}`}>
            Pas de suite aujourd’hui
            <span className="text-xs font-normal">Pas intéressé, ou responsable absent</span>
          </button>
        </div>
      )}

      {step === "no_follow_up" && (
        <div className="flex flex-col gap-3">
          <button type="button" onClick={() => setStep("not_interested")} className={`${ghostButton} ${bigButton}`}>
            Restaurateur pas intéressé
          </button>
          <button type="button" onClick={() => setStep("absent")} className={`${ghostButton} ${bigButton}`}>
            Responsable absent
          </button>
          <button type="button" onClick={() => setStep("home")} className="text-sm text-muted underline">
            Retour
          </button>
        </div>
      )}

      {step === "not_interested" && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            setVisit({ outcome: "not_interested", reason, note });
            setStep("recap");
          }}
        >
          <FieldGroup label="Pourquoi ?" required>
            <Choice options={REFUSAL_REASONS} value={reason} onChange={setReason} />
          </FieldGroup>
          <Field label="Ses arguments, avec tes mots">
            <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} className={inputClass} />
          </Field>
          <button type="submit" disabled={!reason} className={primaryButton}>
            Voir le récap
          </button>
          <button type="button" onClick={() => setStep("no_follow_up")} className="text-sm text-muted underline">
            Retour
          </button>
        </form>
      )}

      {step === "absent" && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            setVisit({ outcome: "absent", contact_name: contact.name, contact_phone: contact.phone, contact_email: contact.email });
            setStep("recap");
          }}
        >
          <Field label="Téléphone du responsable ou du gérant">
            <input type="tel" inputMode="tel" value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} className={inputClass} />
          </Field>
          <Field label="Ou son e-mail, à défaut">
            <input type="email" value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} className={inputClass} />
          </Field>
          <Field label="Son nom (facultatif)">
            <input value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} className={inputClass} />
          </Field>
          <button type="submit" disabled={!contact.phone.trim() && !contact.email.trim()} className={primaryButton}>
            Voir le récap
          </button>
          <button type="button" onClick={() => setStep("no_follow_up")} className="text-sm text-muted underline">
            Retour
          </button>
        </form>
      )}

      {step === "recap" && visit && (
        <div className="flex flex-col gap-4">
          <dl className={`${cardClass} flex flex-col gap-2 text-sm`}>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Résultat</dt>
              <dd>{visit.outcome === "absent" ? "Responsable absent" : "Pas intéressé"}</dd>
            </div>
            {visit.reason && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Motif</dt>
                <dd>{REFUSAL_REASONS.find((entry) => entry.id === visit.reason)?.label}</dd>
              </div>
            )}
            {visit.note && <p className="text-muted">{visit.note}</p>}
            {(visit.contact_phone || visit.contact_email) && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Contact</dt>
                <dd className="min-w-0 text-right break-words">
                  {[visit.contact_name, visit.contact_phone, visit.contact_email].filter(Boolean).join(" · ")}
                </dd>
              </div>
            )}
          </dl>
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">Message envoyé sur Discord</span>
            <p className={`${cardClass} text-sm`}>{visitMessage(account.first_name ?? account.email, place.name, visit.outcome)}</p>
            <span className="text-xs text-faint">Le contact et le nom du gérant ne partent jamais sur Discord.</span>
          </div>
          {error && <p className="text-sm text-ember-3">{error}</p>}
          <button type="button" disabled={busy} onClick={() => void send()} className={primaryButton}>
            Valider et envoyer
          </button>
          <button type="button" onClick={() => setStep(visit.outcome)} className="text-sm text-muted underline">
            Modifier
          </button>
        </div>
      )}
    </div>
  );
}
