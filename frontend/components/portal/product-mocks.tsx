"use client";

import { useLanguage } from "@/lib/portal/language";
import { agentsMock, clipMock } from "@/lib/portal-data";

/*
 * Écrans des produits sans capture, dessinés dans le téléphone de la rangée :
 * l'agent (son journal) et le clipper (ses comptes, son dépôt, ses
 * publications). Un composant par produit, l'étape choisit ce qu'il montre.
 */

const row = "rounded-2xl border border-hairline bg-background/60 px-3 py-2.5";
const label = "text-[10px] font-semibold uppercase tracking-[0.2em] text-faint";

function Check() {
  return (
    <span className="ember-gradient flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-background" aria-hidden>
      ✓
    </span>
  );
}

export function AgentsMock({ step }: { step: number }) {
  const { t } = useLanguage();
  const m = agentsMock;
  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="flex items-center justify-between">
        <span className={label}>{t(m.title)}</span>
        <span className="size-1.5 rounded-full bg-ember-1" />
      </p>

      {step === 0 && (
        <div className={row}>
          <p className={label}>{t(m.profile.heading)}</p>
          <dl className="mt-2 flex flex-col gap-2">
            {m.profile.rows.map((r) => (
              <div key={r.label.fr} className="flex items-baseline justify-between gap-3">
                <dt className="text-xs text-muted">{t(r.label)}</dt>
                <dd className="text-right text-xs font-semibold">{t(r.value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {step === 1 && (
        <div className={`${row} flex items-center gap-3`}>
          <Check />
          <span className="min-w-0">
            <span className={`block ${label}`}>{t(m.gmail.heading)}</span>
            <span className="block truncate text-sm font-semibold">{m.gmail.address}</span>
            <span className="block text-xs text-muted">{t(m.gmail.note)}</span>
          </span>
        </div>
      )}

      {step >= 2 && (
        <ol className="flex flex-col gap-2">
          {m.entries.map((e) => (
            <li key={e.time} className={`${row} flex gap-3 ${step === 3 ? "opacity-50" : ""}`}>
              <span className="shrink-0 text-[11px] tabular-nums text-faint">{e.time}</span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold leading-snug">{t(e.text)}</span>
                <span className={`block text-[11px] ${e.pending ? "font-semibold text-ember-2" : "text-muted"}`}>{t(e.detail)}</span>
              </span>
            </li>
          ))}
        </ol>
      )}

      {step === 3 && (
        <div className="rounded-2xl border border-ember-2/40 bg-ember-2/10 px-3 py-3">
          <p className="flex items-center justify-between">
            <span className="text-xs font-bold">{m.reply.from}</span>
            <span className="text-[11px] tabular-nums text-faint">{m.reply.time}</span>
          </p>
          <p className="mt-1 text-sm leading-snug">{t(m.reply.text)}</p>
          <p className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-ember-2">
            <Check />
            {t(m.reply.status)}
          </p>
        </div>
      )}
    </div>
  );
}

export function ClipMock({ step }: { step: number }) {
  const { t } = useLanguage();
  const m = clipMock;
  return (
    <div className="flex flex-col gap-3 text-sm">
      {step === 0 && (
        <>
          <p className={label}>{t(m.accounts.heading)}</p>
          <ul className="flex flex-col gap-2">
            {m.accounts.platforms.map((p) => (
              <li key={p} className={`${row} flex items-center justify-between gap-3`}>
                <span className="text-sm font-semibold">{p}</span>
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-ember-2">
                  <Check />
                  {t(m.accounts.connected)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {(step === 1 || step === 2) && (
        <>
          <p className={label}>{t(m.clip.heading)}</p>
          <div className={`${row} flex items-center gap-3`}>
            <span className="ember-gradient flex size-10 shrink-0 items-center justify-center rounded-xl text-background" aria-hidden>
              ▶
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{m.clip.file}</span>
              <span className="block text-[11px] tabular-nums text-muted">{m.clip.duration}</span>
            </span>
          </div>
          <p className="flex items-center gap-2 text-[11px] font-semibold text-ember-2">
            <span className="size-1.5 animate-pulse rounded-full bg-ember-1 motion-reduce:animate-none" />
            {t(m.clip.agentLine)}
          </p>
        </>
      )}

      {step === 2 && (
        <ul className="flex flex-col gap-2">
          {m.posts.map((p) => (
            <li key={p.platform} className={row}>
              <p className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.15em]">{p.platform}</span>
                <span className={`text-[11px] ${p.live ? "font-semibold text-ember-2" : "text-faint"}`}>{t(p.status)}</span>
              </p>
              <p className="mt-0.5 truncate text-xs text-muted">{t(p.caption)}</p>
            </li>
          ))}
        </ul>
      )}

      {step === 3 && (
        <>
          <p className={label}>{t(m.scale.heading)}</p>
          <dl className="flex flex-col gap-2">
            {m.scale.rows.map((r) => (
              <div key={r.label.fr} className={`${row} flex items-baseline justify-between gap-3`}>
                <dd className="kit-display ember-text text-3xl tabular-nums">{r.value}</dd>
                <dt className="text-right text-xs text-muted">{t(r.label)}</dt>
              </div>
            ))}
          </dl>
        </>
      )}
    </div>
  );
}
