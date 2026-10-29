"use client";

import { useCallback, useEffect, useState } from "react";
import { FieldGroup, Choice, cardClass, errorMessage, ghostButton, primaryButton } from "@/components/commercial/space/ui";
import { ConnectComposer } from "@/components/composer/connect-composer";
import { AcceptTerms, useContract } from "@/components/legal/accept-terms";
import { Field, inputClass } from "@/components/ui/field";
import { SIGNUP_KINDS, type SignupAccountInput, type SignupKind, type SignupProgress } from "@/lib/commercial/signup-form";
import type { Answers } from "@/lib/composer";
import { compressPhoto } from "@/lib/gestion/photo";
import { connectCommission, quotePage } from "@/lib/landing-data";

type Draft = Omit<SignupAccountInput, "setup" | "versions" | "kind"> & { kind?: SignupKind };

/* Les écrans d'avant le compte : tout reste dans le navigateur jusqu'à l'accord aux CGV. */
type BeforeAccount = "compte" | "restaurant" | "responsable" | "service" | "offre";

function Shell({ step, children }: { step: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-6 px-4 py-8">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">{step}</p>
      {children}
    </div>
  );
}

const title = (text: string) => <h1 className="font-display text-2xl font-medium tracking-tight text-balance">{text}</h1>;

async function post(id: string, action: string, body?: unknown): Promise<{ url?: string }> {
  const response = await fetch(`/api/commercial/inscription/${id}/${action}`, {
    method: "POST",
    ...(body instanceof FormData ? { body } : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) }),
  });
  const result = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!response.ok) throw new Error(result.error ?? "Une erreur est survenue.");
  return result;
}

/*
 * Le questionnaire d'inscription d'un restaurant, rempli par le gérant avec
 * le commercial (sur le téléphone de l'un ou de l'autre). Aucun prix, aucun
 * paiement : on récupère les infos, on crée le compte, puis on branche Stripe
 * et HubRise (ou plus tard) et on prend le menu en photo.
 */
export function SignupQuestionnaire({ id, hubriseManagerUrl }: { id: string; hubriseManagerUrl: string | null }) {
  const [progress, setProgress] = useState<SignupProgress | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState<BeforeAccount>("compte");
  const [draft, setDraft] = useState<Draft>({ email: "", password: "", name: "", managerName: "", managerPhone: "", managerEmail: "" });
  const [setup, setSetup] = useState<Answers | null>(null);
  const { contract, contractError } = useContract();
  const [accepted, setAccepted] = useState(false);
  const [hasHubrise, setHasHubrise] = useState<boolean | null>(null);
  const [photosDone, setPhotosDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    () =>
      fetch(`/api/commercial/inscription/${id}`).then(async (response) => {
        const result = (await response.json()) as SignupProgress & { error?: string };
        if (!response.ok) return setLoadError(result.error ?? "Inscription introuvable.");
        setProgress(result);
        setDraft((current) => ({ ...current, name: current.name || result.restaurant }));
      }),
    [id]
  );
  useEffect(() => void load(), [load]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };
  const redirectTo = (action: string) => run(async () => void (window.location.href = (await post(id, action)).url!));
  const later = (what: "stripe" | "hubrise") => run(async () => {
    await post(id, "plus-tard", { step: what });
    await load();
  });

  if (loadError) return <Shell step="Inscription">{title(loadError)}</Shell>;
  if (!progress) return <Shell step="Inscription"><div aria-busy className="shimmer h-40 rounded-2xl" /></Shell>;

  const set = (key: keyof Draft) => (event: React.ChangeEvent<HTMLInputElement>) => setDraft({ ...draft, [key]: event.target.value });
  const errorNote = error && <p className="text-sm text-ember-3">{error}</p>;
  const back = (to: BeforeAccount) => (
    <button type="button" onClick={() => setStep(to)} className="text-sm text-muted underline">
      Retour
    </button>
  );

  if (progress.finished) {
    return (
      <Shell step="Inscription terminée">
        {title(`${progress.restaurant} est inscrit.`)}
        <p className="text-muted">Notre équipe prépare votre menu. Vous recevez un e-mail pour ouvrir votre espace de gestion.</p>
      </Shell>
    );
  }

  if (!progress.accountCreated) {
    if (step === "compte") {
      return (
        <Shell step="1 · Votre compte">
          {title("Créons votre compte Ominin.")}
          <p className="text-muted">C’est avec lui que vous gérerez votre restaurant ensuite.</p>
          <Field label="E-mail" required>
            <input type="email" autoComplete="email" value={draft.email} onChange={set("email")} className={inputClass} />
          </Field>
          <Field label="Mot de passe (6 caractères au moins)" required>
            <input type="password" autoComplete="new-password" value={draft.password} onChange={set("password")} className={inputClass} />
          </Field>
          <button type="button" disabled={!draft.email.includes("@") || draft.password.length < 6} onClick={() => setStep("restaurant")} className={primaryButton}>
            Continuer
          </button>
        </Shell>
      );
    }
    if (step === "restaurant") {
      return (
        <Shell step="2 · Le restaurant">
          {title("Votre restaurant")}
          <Field label="Nom du restaurant" required>
            <input value={draft.name} onChange={set("name")} className={inputClass} />
          </Field>
          <FieldGroup label="Type d’établissement" required>
            <Choice options={SIGNUP_KINDS} value={draft.kind} onChange={(kind) => setDraft({ ...draft, kind })} />
          </FieldGroup>
          <button type="button" disabled={!draft.name.trim() || !draft.kind} onClick={() => setStep("responsable")} className={primaryButton}>
            Continuer
          </button>
          {back("compte")}
        </Shell>
      );
    }
    if (step === "responsable") {
      return (
        <Shell step="3 · Le responsable">
          {title("Qui suivra la mise en place avec nous ?")}
          <Field label="Nom du gérant ou du responsable" required>
            <input value={draft.managerName} onChange={set("managerName")} className={inputClass} />
          </Field>
          <Field label="Téléphone" required>
            <input type="tel" inputMode="tel" value={draft.managerPhone} onChange={set("managerPhone")} className={inputClass} />
          </Field>
          <Field label="Ou e-mail, à défaut">
            <input type="email" value={draft.managerEmail} onChange={set("managerEmail")} placeholder={draft.email} className={inputClass} />
          </Field>
          <button
            type="button"
            disabled={!draft.managerName.trim()}
            onClick={() => {
              if (!draft.managerPhone.trim() && !draft.managerEmail.trim()) setDraft({ ...draft, managerEmail: draft.email });
              setStep("service");
            }}
            className={primaryButton}
          >
            Continuer
          </button>
          {back("restaurant")}
        </Shell>
      );
    }
    if (step === "service") {
      return (
        <Shell step="4 · Votre service">
          <ConnectComposer
            defaultTables={quotePage.defaultTables}
            onDone={(answers) => {
              setSetup(answers);
              setStep("offre");
            }}
          />
        </Shell>
      );
    }
    return (
      <Shell step="5 · L’offre">
        {title(`${connectCommission.percent} % ${connectCommission.basis}. Rien d’autre.`)}
        <div className={`${cardClass} flex flex-col gap-3 text-sm`}>
          <p>
            <span className="font-semibold">Ce que couvrent les {connectCommission.percent} % :</span> les frais Stripe, les frais HubRise et la
            maintenance.
          </p>
          <p>
            <span className="font-semibold">Pourquoi c’est vite rentable :</span> moins de charge salariale, une meilleure expérience pour vos
            clients, et des clients plus fidèles.
          </p>
        </div>
        {contractError ? <p className="text-sm text-ember-3">{contractError}</p> : <AcceptTerms contract={contract} checked={accepted} onChange={setAccepted} />}
        {errorNote}
        <button
          type="button"
          disabled={!accepted || !contract || !setup || !draft.kind || busy}
          onClick={() =>
            run(async () => {
              await post(id, "compte", { ...draft, kind: draft.kind!, setup: setup!, versions: contract!.versions } satisfies SignupAccountInput);
              await load();
            })
          }
          className={primaryButton}
        >
          Créer mon compte
        </button>
        {back("service")}
      </Shell>
    );
  }

  if (progress.stripe === "todo") {
    return (
      <Shell step="6 · Stripe">
        {title("Recevoir l’argent de vos clients")}
        <p className="text-muted">Stripe verse directement sur votre compte bancaire ce que vos clients paient en ligne. Gardez votre pièce d’identité et votre IBAN à portée de main.</p>
        {errorNote}
        <button type="button" disabled={busy} onClick={() => void redirectTo("stripe")} className={primaryButton}>
          Créer mon compte Stripe
        </button>
        <button type="button" disabled={busy} onClick={() => void later("stripe")} className={ghostButton}>
          Faire plus tard
        </button>
      </Shell>
    );
  }

  if (progress.hubrise === "todo") {
    return (
      <Shell step="7 · HubRise">
        {title("Relier votre caisse")}
        <p className="text-muted">HubRise fait passer les commandes de votre menu à votre caisse.</p>
        {hasHubrise === false ? (
          <div className={`${cardClass} flex flex-col gap-3 text-sm`}>
            <p>Créez votre compte HubRise, puis revenez ici pour le relier.</p>
            {hubriseManagerUrl && (
              <a href={hubriseManagerUrl} target="_blank" rel="noopener" className={ghostButton}>
                Créer mon compte HubRise
              </a>
            )}
          </div>
        ) : (
          hasHubrise === null && (
            <FieldGroup label="Avez-vous un compte HubRise ?">
              <Choice options={[{ id: "yes", label: "Oui" }, { id: "no", label: "Non" }]} value={undefined} onChange={(answer) => setHasHubrise(answer === "yes")} />
            </FieldGroup>
          )
        )}
        {errorNote}
        {hasHubrise !== null && (
          <button type="button" disabled={busy} onClick={() => void redirectTo("hubrise")} className={primaryButton}>
            Relier mon compte HubRise
          </button>
        )}
        <button type="button" disabled={busy} onClick={() => void later("hubrise")} className={ghostButton}>
          Faire plus tard
        </button>
      </Shell>
    );
  }

  if (!photosDone) {
    return (
      <Shell step="8 · Votre carte">
        {title("Prenez votre menu en photo")}
        <p className="text-muted">Facultatif : nos équipes s’en servent pour préparer votre menu en ligne.</p>
        <label className={`${primaryButton} cursor-pointer`}>
          {busy ? "Envoi…" : "Ajouter des photos"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              const files = [...(event.target.files ?? [])];
              event.target.value = "";
              void run(async () => {
                for (const file of files) {
                  const form = new FormData();
                  const photo = await compressPhoto(file);
                  form.set("file", new File([photo], file.name, { type: photo.type }));
                  await post(id, "photos", form);
                }
                await load();
              });
            }}
          />
        </label>
        {progress.photos > 0 && <p className="text-sm text-muted">{progress.photos} photo{progress.photos > 1 ? "s" : ""} envoyée{progress.photos > 1 ? "s" : ""}.</p>}
        {errorNote}
        <button type="button" disabled={busy} onClick={() => setPhotosDone(true)} className={ghostButton}>
          {progress.photos > 0 ? "Continuer" : "Passer"}
        </button>
      </Shell>
    );
  }

  return (
    <Shell step="9 · Récap">
      {title("Tout est prêt.")}
      <dl className={`${cardClass} flex flex-col gap-2 text-sm`}>
        {[
          ["Restaurant", progress.restaurant],
          ["Stripe", progress.stripe === "done" ? "Branché" : "À faire plus tard"],
          ["HubRise", progress.hubrise === "done" ? "Branché" : "À faire plus tard"],
          ["Photos du menu", String(progress.photos)],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-muted">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {errorNote}
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          run(async () => {
            await post(id, "fin");
            await load();
          })
        }
        className={primaryButton}
      >
        Terminer l’inscription
      </button>
    </Shell>
  );
}
