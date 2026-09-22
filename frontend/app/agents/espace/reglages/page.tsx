"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { XIcon } from "@/components/gestion/icons";
import { Field, inputClass } from "@/components/ui/field";
import { useRunMutation, useToast } from "@/components/ui/toast";
import { connectGmail, disconnectGmail, saveSettings } from "@/lib/agents/api";
import {
  DAILY_LIMIT_MAX,
  DAILY_LIMIT_MIN,
  MODE_LABELS,
  WEEK_DAYS,
} from "@/lib/agents/constants";
import { useAgents, useAgentsState } from "@/lib/agents/context";
import { TARGET_SUGGESTIONS } from "@/lib/agents/targets";
import type { AgentMode, AgentProfile, AgentSettings } from "@/lib/agents/types";

const SECTION = "flex flex-col gap-4 rounded-2xl border border-hairline bg-surface p-5 lg:p-6";
const SECTION_TITLE = "font-display text-lg font-medium";
const HOURS = Array.from({ length: 25 }, (_, hour) => hour);

/** Retour du flux OAuth Google (/api/agents/gmail/callback?…). */
const GMAIL_OUTCOMES: Record<string, { ok: boolean; message: string }> = {
  ok: { ok: true, message: "Gmail est connecté." },
  scopes: {
    ok: false,
    message: "Cochez les deux autorisations demandées par Google (envoi et lecture), sinon l'agent ne peut pas travailler.",
  },
  erreur: { ok: false, message: "La connexion à Gmail a échoué. Réessayez." },
};

function toSettings(profile: AgentProfile): AgentSettings {
  const {
    company_name, sender_name, sender_role, phone, website, offer, strengths,
    call_to_action, reply_notes, targets, cities, mode, enabled, send_days,
    send_start_hour, send_end_hour, daily_limit,
  } = profile;
  return {
    company_name, sender_name, sender_role, phone, website, offer, strengths,
    call_to_action, reply_notes, targets, cities, mode, enabled, send_days,
    send_start_hour, send_end_hour, daily_limit,
  };
}

/** Liste de valeurs en pastilles + champ d'ajout (Entrée ou bouton). */
function ChipsInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const value = draft.trim();
    if (value && !values.some((v) => v.toLowerCase() === value.toLowerCase())) {
      onChange([...values, value]);
    }
    setDraft("");
  };
  return (
    <div className="flex flex-col gap-3">
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((value) => (
            <span
              key={value}
              className="flex items-center gap-1.5 rounded-full border border-ember-2/40 bg-ember-2/10 py-1 pl-3 pr-1.5 text-sm"
            >
              {value}
              <button
                type="button"
                onClick={() => onChange(values.filter((v) => v !== value))}
                aria-label={`Retirer ${value}`}
                className="rounded-full p-0.5 text-muted hover:text-foreground"
              >
                <XIcon className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          className={inputClass}
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
        />
        <button
          type="button"
          onClick={add}
          className="shrink-0 rounded-xl border border-hairline px-4 text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          Ajouter
        </button>
      </div>
    </div>
  );
}

export default function AgentsSettingsPage() {
  const { profile, mailbox } = useAgentsState();
  const { setProfile, reload } = useAgents();
  const run = useRunMutation();
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState<AgentSettings>(() => toSettings(profile));
  const [busy, setBusy] = useState(false);

  const gmailOutcome = params.get("gmail");
  useEffect(() => {
    if (!gmailOutcome) return;
    const outcome = GMAIL_OUTCOMES[gmailOutcome] ?? GMAIL_OUTCOMES.erreur;
    if (outcome.ok) toast.success(outcome.message);
    else toast.error(outcome.message);
    router.replace("/espace/reglages#gmail");
  }, [gmailOutcome, toast, router]);

  const set = <K extends keyof AgentSettings>(key: K, value: AgentSettings[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const toggleDay = (day: number) =>
    set(
      "send_days",
      form.send_days.includes(day)
        ? form.send_days.filter((d) => d !== day)
        : [...form.send_days, day].sort((a, b) => a - b)
    );

  const toggleTarget = (target: string) =>
    set(
      "targets",
      form.targets.includes(target)
        ? form.targets.filter((t) => t !== target)
        : [...form.targets, target]
    );

  const customTargets = form.targets.filter((t) => !TARGET_SUGGESTIONS.includes(t));
  const invalidHours = form.send_end_hour <= form.send_start_hour;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    await run(async () => {
      setProfile(await saveSettings(form));
    }, "Réglages enregistrés.");
    setBusy(false);
  };

  const disconnect = () =>
    void run(async () => {
      await disconnectGmail();
      reload();
    }, "Gmail déconnecté.");

  return (
    <form onSubmit={save} className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-medium">Réglages</h1>
        <p className="mt-1 text-sm text-muted">
          Ce que l&apos;agent dit de vous, à qui il écrit, et à quel rythme.
        </p>
      </div>

      <section className={SECTION}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className={SECTION_TITLE}>Prospection</h2>
            <p className="mt-1 text-sm text-muted">
              En pause, l&apos;agent ne contacte plus personne de nouveau, mais continue de lire vos
              réponses et d&apos;envoyer celles que vous validez.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.enabled}
            aria-label="Prospection en marche"
            onClick={() => set("enabled", !form.enabled)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${form.enabled ? "ember-gradient" : "bg-surface-raised border border-hairline"}`}
          >
            <span
              className={`absolute top-1 size-5 rounded-full bg-background shadow transition-all ${form.enabled ? "left-6" : "left-1"}`}
            />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(MODE_LABELS) as AgentMode[]).map((mode) => {
            const active = form.mode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => set("mode", mode)}
                aria-pressed={active}
                className={`flex flex-col gap-1 rounded-xl border p-4 text-left transition-colors ${
                  active ? "border-ember-2/60 bg-ember-2/10" : "border-hairline hover:border-ember-2/30"
                }`}
              >
                <span className="text-sm font-semibold">{MODE_LABELS[mode].title}</span>
                <span className="text-xs leading-relaxed text-muted">{MODE_LABELS[mode].body}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className={SECTION}>
        <h2 className={SECTION_TITLE}>Créneau d&apos;envoi</h2>
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">Jours</span>
          <div className="flex flex-wrap gap-2">
            {WEEK_DAYS.map((day) => {
              const active = form.send_days.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  title={day.label}
                  aria-label={day.label}
                  aria-pressed={active}
                  onClick={() => toggleDay(day.value)}
                  className={`size-10 rounded-full text-sm font-semibold transition-colors ${
                    active ? "ember-gradient text-background" : "border border-hairline text-muted hover:text-foreground"
                  }`}
                >
                  {day.short}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="De">
            <select
              className={inputClass}
              value={form.send_start_hour}
              onChange={(event) => set("send_start_hour", Number(event.target.value))}
            >
              {HOURS.slice(0, 24).map((hour) => (
                <option key={hour} value={hour}>{hour} h</option>
              ))}
            </select>
          </Field>
          <Field label="À">
            <select
              className={inputClass}
              value={form.send_end_hour}
              onChange={(event) => set("send_end_hour", Number(event.target.value))}
            >
              {HOURS.slice(1).map((hour) => (
                <option key={hour} value={hour}>{hour} h</option>
              ))}
            </select>
          </Field>
          <Field label="E-mails par jour" hint={`Entre ${DAILY_LIMIT_MIN} et ${DAILY_LIMIT_MAX}.`}>
            <input
              type="number"
              min={DAILY_LIMIT_MIN}
              max={DAILY_LIMIT_MAX}
              required
              className={inputClass}
              value={form.daily_limit}
              onChange={(event) => set("daily_limit", Number(event.target.value))}
            />
          </Field>
        </div>
        {invalidHours && (
          <p className="text-sm text-ember-3">L&apos;heure de fin doit suivre l&apos;heure de début.</p>
        )}
        <p className="text-xs text-faint">
          Heure de Paris. Les envois sont étalés sur le créneau, jamais en rafale — c&apos;est ce
          qui garde vos e-mails hors des indésirables.
        </p>
      </section>

      <section className={SECTION}>
        <h2 className={SECTION_TITLE}>Votre entreprise</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom de l'entreprise" required>
            <input className={inputClass} value={form.company_name} onChange={(event) => set("company_name", event.target.value)} />
          </Field>
          <Field label="Site web">
            <input className={inputClass} value={form.website} placeholder="https://" onChange={(event) => set("website", event.target.value)} />
          </Field>
          <Field label="Votre nom" required hint="Les e-mails sont signés et envoyés à ce nom.">
            <input className={inputClass} value={form.sender_name} onChange={(event) => set("sender_name", event.target.value)} />
          </Field>
          <Field label="Votre fonction">
            <input className={inputClass} value={form.sender_role} placeholder="Gérant" onChange={(event) => set("sender_role", event.target.value)} />
          </Field>
          <Field label="Téléphone" hint="Ajouté à la signature.">
            <input type="tel" className={inputClass} value={form.phone} onChange={(event) => set("phone", event.target.value)} />
          </Field>
        </div>
      </section>

      <section className={SECTION}>
        <h2 className={SECTION_TITLE}>Votre offre</h2>
        <Field label="Ce que vous proposez" required hint="Vos services, concrètement : c'est la matière de chaque e-mail.">
          <textarea
            className={`${inputClass} min-h-28`}
            value={form.offer}
            placeholder="Sablage et aérogommage : décapage de façades, pierres, poutres, métal…"
            onChange={(event) => set("offer", event.target.value)}
          />
        </Field>
        <Field label="Vos points forts">
          <textarea
            className={`${inputClass} min-h-20`}
            value={form.strengths}
            placeholder="20 ans d'expérience, intervention rapide, déplacement dans tout le département…"
            onChange={(event) => set("strengths", event.target.value)}
          />
        </Field>
        <Field label="Ce que vous attendez du premier e-mail">
          <input
            className={inputClass}
            value={form.call_to_action}
            placeholder="Obtenir un appel ou une demande de devis"
            onChange={(event) => set("call_to_action", event.target.value)}
          />
        </Field>
        <Field
          label="Infos que l'agent peut donner en réponse"
          hint="Tarifs indicatifs, délais, zone d'intervention… Sans rien ici, il ne donne ni prix ni date et propose d'en parler."
        >
          <textarea
            className={`${inputClass} min-h-20`}
            value={form.reply_notes}
            onChange={(event) => set("reply_notes", event.target.value)}
          />
        </Field>
      </section>

      <section className={SECTION}>
        <div>
          <h2 className={SECTION_TITLE}>Cibles</h2>
          <p className="mt-1 text-sm text-muted">
            Les entreprises à qui écrire. Chaque cible est cherchée dans Google Maps, ville par ville.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {TARGET_SUGGESTIONS.map((target) => {
            const active = form.targets.includes(target);
            return (
              <button
                key={target}
                type="button"
                aria-pressed={active}
                onClick={() => toggleTarget(target)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "border-ember-2/50 bg-ember-2/10 text-foreground"
                    : "border-hairline text-muted hover:text-foreground"
                }`}
              >
                {target}
              </button>
            );
          })}
        </div>
        <ChipsInput
          values={customTargets}
          onChange={(custom) =>
            set("targets", [...form.targets.filter((t) => TARGET_SUGGESTIONS.includes(t)), ...custom])
          }
          placeholder="Autre cible (ex. : Entreprise de démolition)"
        />
      </section>

      <section className={SECTION}>
        <div>
          <h2 className={SECTION_TITLE}>Zone</h2>
          <p className="mt-1 text-sm text-muted">Les villes où chercher vos prospects.</p>
        </div>
        <ChipsInput
          values={form.cities}
          onChange={(cities) => set("cities", cities)}
          placeholder="Ville (ex. : Nîmes)"
        />
      </section>

      <section id="gmail" className={`${SECTION} scroll-mt-24`}>
        <div>
          <h2 className={SECTION_TITLE}>Boîte Gmail</h2>
          <p className="mt-1 text-sm text-muted">
            Les e-mails partent de votre adresse et les réponses y arrivent. L&apos;agent ne lit que
            les conversations qu&apos;il a lui-même ouvertes, et ne modifie rien dans votre boîte.
          </p>
        </div>
        {mailbox && !mailbox.error ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-hairline px-3 py-1.5 text-sm font-medium">
              {mailbox.email}
            </span>
            <button
              type="button"
              onClick={disconnect}
              className="rounded-full border border-hairline px-4 py-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
            >
              Déconnecter
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3">
            {mailbox?.error && <p className="text-sm text-ember-3">{mailbox.error}</p>}
            <button
              type="button"
              onClick={() => void run(connectGmail)}
              className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background"
            >
              {mailbox ? "Reconnecter Gmail" : "Connecter Gmail"}
            </button>
            <p className="text-xs text-faint">
              Google peut afficher « application non validée » : cliquez sur « Paramètres avancés »
              puis « Accéder à Ominin », et cochez les deux autorisations.
            </p>
          </div>
        )}
      </section>

      <div className="sticky bottom-20 z-30 flex justify-end lg:bottom-6">
        <button
          type="submit"
          disabled={busy || invalidHours}
          className="ember-gradient rounded-full px-6 py-3 text-sm font-semibold text-background shadow-[0_0_24px_rgba(226,118,75,0.35)] disabled:opacity-60"
        >
          {busy ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
