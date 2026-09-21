"use client";

import { useState } from "react";
import { SquareMark } from "@/components/landing/install-scenes";
import { QrLive } from "@/components/landing/qr-live";
import { IconButton } from "@/components/ui/icon-button";
import {
  installSection,
  pricingSection,
  qrShowcase,
  quotePage,
  starterKit,
  type Plan,
} from "@/lib/landing-data";
import { formatPrice } from "@/lib/menu-data";
import {
  hasInstallOptions,
  quoteLines,
  quotePlan,
  quoteTotal,
  type StarterQuote,
} from "@/lib/quote";

const squareCost = installSection.paths.find((path) => path.id === "square")
  ?.cost.value;

function StepHeading({
  index,
  title,
  subtitle,
}: {
  index: number;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-baseline gap-4">
      <span className="ember-text font-display text-3xl font-medium">
        {String(index).padStart(2, "0")}
      </span>
      <div>
        <h2 className="font-display text-xl font-medium tracking-tight">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}

function PlanPrice({ plan }: { plan: Plan }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className="ember-text font-display text-3xl font-medium">
        {formatPrice(plan.price)}
      </span>
      <span className="text-sm text-faint">{pricingSection.perMonth}</span>
      {plan.commission && (
        <span className="whitespace-nowrap rounded-full border border-ember-2/40 px-2.5 py-0.5 font-display text-sm font-medium">
          + {plan.commission.percent} %
        </span>
      )}
    </p>
  );
}

/** Interrupteur décoratif : l'état est porté par le bouton qui l'entoure. */
function Switch({ on, inverse }: { on: boolean; inverse?: boolean }) {
  return (
    <span
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${
        on
          ? inverse
            ? "bg-background"
            : "ember-gradient"
          : "bg-foreground/15"
      }`}
      aria-hidden
    >
      <span
        className={`absolute top-1 size-4 rounded-full transition-all duration-300 ${
          on ? "left-6" : "left-1"
        } ${on && inverse ? "bg-foreground" : "bg-background"}`}
      />
    </span>
  );
}

export function QuoteBuilder({
  initial,
  locked = false,
  submitLabel,
  onSubmit,
}: {
  initial: StarterQuote;
  /** Offre et tables figées : l'établissement existe déjà (activation). */
  locked?: boolean;
  submitLabel: string;
  onSubmit: (quote: StarterQuote) => Promise<void> | void;
}) {
  const [plan, setPlan] = useState(initial.plan);
  // Saisie brute : le champ peut être vide le temps de taper un nombre.
  const [tablesInput, setTablesInput] = useState(
    initial.tables > 0 ? String(initial.tables) : ""
  );
  const [omilink, setOmilink] = useState(initial.omilink);
  const [square, setSquare] = useState(initial.square);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = Number(tablesInput);
  const tables = Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
  const quote: StarterQuote = { plan, tables, omilink, square };
  const options = hasInstallOptions(plan);
  const selected = quotePlan(plan);
  const total = quoteTotal(quote);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSubmit(quote);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Une erreur est survenue."
      );
      setBusy(false);
    }
  };

  // Activation : offre et tables sont déjà fixées, il ne reste qu'une étape.
  const optionsStep = locked ? 1 : 3;

  return (
    <div
      className={`grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start ${
        locked ? "" : "pb-24 lg:pb-0"
      }`}
    >
      <div className="flex flex-col gap-6">
        {!locked && (
          <section className="rise flex flex-col gap-6 rounded-3xl border border-hairline bg-surface p-6 sm:p-8">
            <StepHeading index={1} title={quotePage.plan.title} />
            <div role="radiogroup" className="grid gap-3 sm:grid-cols-2">
              {pricingSection.plans.map((candidate) => {
                const active = candidate.id === plan;
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setPlan(candidate.id)}
                    className={`relative flex flex-col gap-3 rounded-2xl border p-5 text-left transition-all duration-300 ${
                      active
                        ? "border-ember-2/50 bg-background/50 shadow-lg shadow-ember-2/10"
                        : "border-hairline hover:border-ember-2/30"
                    }`}
                  >
                    <span
                      className={`absolute right-4 top-4 flex size-5 items-center justify-center rounded-full border text-[10px] font-bold transition-colors ${
                        active
                          ? "ember-gradient border-transparent text-background"
                          : "border-hairline text-transparent"
                      }`}
                      aria-hidden
                    >
                      ✓
                    </span>
                    <span>
                      <span className="block font-display text-lg font-medium">
                        {candidate.name}
                      </span>
                      <span className="mt-0.5 block pr-6 text-sm text-muted">
                        {candidate.tagline}
                      </span>
                    </span>
                    <PlanPrice plan={candidate} />
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {!locked && (
          <section
            className="rise flex flex-col gap-6 rounded-3xl border border-hairline bg-surface p-6 sm:p-8"
            style={{ animationDelay: "80ms" }}
          >
            <StepHeading index={2} title={quotePage.tables.title} />
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <IconButton
                    aria-label={quotePage.tables.decrease}
                    disabled={tables <= 1}
                    onClick={() => setTablesInput(String(tables - 1))}
                  >
                    −
                  </IconButton>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={tablesInput}
                    onChange={(event) => setTablesInput(event.target.value)}
                    aria-label={quotePage.tables.inputLabel}
                    className="ember-text w-28 bg-transparent text-center font-display text-6xl font-medium outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <IconButton
                    aria-label={quotePage.tables.increase}
                    onClick={() => setTablesInput(String(tables + 1))}
                  >
                    +
                  </IconButton>
                </div>
                <p className="max-w-xs text-sm leading-relaxed text-muted">
                  {quotePage.tables.hint}
                </p>
              </div>

              <div
                className="relative mx-auto w-32 rotate-3 rounded-2xl border border-hairline bg-surface-raised p-3 text-center shadow-xl shadow-black/30 sm:mx-0"
                aria-hidden
              >
                {tables > 0 && (
                  <span
                    key={tables}
                    className="pop ember-gradient absolute -right-3 -top-3 rounded-full px-2.5 py-1 text-[11px] font-bold text-background shadow-lg"
                  >
                    × {tables}
                  </span>
                )}
                <p className="ember-text text-[9px] font-bold uppercase tracking-[0.22em]">
                  {quotePage.tables.sticker}
                </p>
                <div className="mx-auto mt-2 w-fit rounded-lg bg-white p-1.5">
                  <QrLive
                    path={qrShowcase.qrPath}
                    alt=""
                    className="size-[4.25rem] rounded"
                  />
                </div>
                <p className="mt-2 font-display text-sm font-semibold">
                  Table {tables || 1}
                </p>
              </div>
            </div>
          </section>
        )}

        {options && (
          <section
            className="rise flex flex-col gap-6 rounded-3xl border border-hairline bg-surface p-6 sm:p-8"
            style={{ animationDelay: "160ms" }}
          >
            <StepHeading
              index={optionsStep}
              title={quotePage.options.title}
              subtitle={quotePage.options.subtitle}
            />
            <div className="flex flex-col gap-3">
              <button
                type="button"
                aria-pressed={omilink}
                onClick={() => setOmilink(!omilink)}
                className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 rounded-2xl border p-5 text-left transition-all duration-300 sm:gap-y-0.5 ${
                  omilink
                    ? "border-ember-2/50 bg-background/50 shadow-lg shadow-ember-2/10"
                    : "border-hairline hover:border-ember-2/30"
                }`}
              >
                <span className="relative flex h-10 w-14 shrink-0 rounded-lg border border-hairline bg-surface-raised sm:row-span-2">
                  <span
                    className={`absolute left-2 top-2 size-1.5 rounded-full bg-ember-1 ${
                      omilink
                        ? "led-breathe shadow-[0_0_8px_var(--ember-1)]"
                        : "opacity-30"
                    }`}
                  />
                </span>
                <span className="text-sm font-medium sm:self-end">
                  {quotePage.options.omilink.title}
                </span>
                <span className="flex shrink-0 flex-col items-end gap-2 sm:row-span-2">
                  <span className="whitespace-nowrap font-display text-lg font-medium">
                    + {formatPrice(starterKit.omilink.price)}
                  </span>
                  <Switch on={omilink} />
                </span>
                <span className="col-span-3 text-[13px] leading-relaxed text-muted sm:col-span-1 sm:col-start-2 sm:self-start">
                  {quotePage.options.omilink.description}
                </span>
              </button>

              <button
                type="button"
                aria-pressed={square}
                onClick={() => setSquare(!square)}
                className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 rounded-2xl border p-5 text-left transition-all duration-300 sm:gap-y-0.5 ${
                  square
                    ? "border-transparent bg-foreground text-background"
                    : "border-hairline hover:border-foreground/30"
                }`}
              >
                <span className="flex h-10 w-14 shrink-0 items-center justify-center sm:row-span-2">
                  <SquareMark className="size-8" />
                </span>
                <span className="text-sm font-medium sm:self-end">
                  {quotePage.options.square.title}
                </span>
                <span className="flex shrink-0 flex-col items-end gap-2 sm:row-span-2">
                  <span className="whitespace-nowrap font-display text-lg font-medium">
                    {quotePage.options.square.price}
                  </span>
                  <Switch on={square} inverse />
                </span>
                <span
                  className={`col-span-3 text-[13px] leading-relaxed sm:col-span-1 sm:col-start-2 sm:self-start ${
                    square ? "text-background/70" : "text-muted"
                  }`}
                >
                  {quotePage.options.square.description} Abonnement Square{" "}
                  {squareCost}, {quotePage.bill.squareNote}.
                </span>
              </button>
            </div>
            <a
              href={quotePage.options.otherTill.href}
              className="self-start text-xs text-muted underline decoration-hairline underline-offset-4 transition-colors hover:text-foreground"
            >
              {quotePage.options.otherTill.label}
            </a>
          </section>
        )}
      </div>

      <aside
        className="rise relative overflow-hidden rounded-3xl border border-ember-2/30 bg-surface p-6 shadow-lg shadow-ember-2/5 sm:p-8 lg:sticky lg:top-24"
        style={{ animationDelay: "240ms" }}
      >
        <div
          className="ember-glow pointer-events-none absolute inset-0"
          aria-hidden
        />
        <div className="relative flex flex-col gap-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-display text-lg italic text-muted">
              {quotePage.bill.label}
            </p>
            {locked && selected && (
              <p className="text-xs text-faint">
                Ominin {selected.name} · {tables}{" "}
                {tables > 1
                  ? quotePage.tables.unit.many
                  : quotePage.tables.unit.one}
              </p>
            )}
          </div>

          {tables > 0 ? (
            <dl className="flex flex-col gap-3">
              {quoteLines(quote).map((line) => (
                <div key={line.id} className="rise flex items-baseline gap-2 text-sm">
                  <dt className="text-muted">
                    {line.label}
                    {line.detail && (
                      <span className="block text-xs text-faint">
                        {line.detail}
                      </span>
                    )}
                  </dt>
                  <span
                    className="min-w-4 flex-1 translate-y-[-3px] border-b border-dotted border-foreground/20"
                    aria-hidden
                  />
                  <dd className="whitespace-nowrap font-semibold">
                    {formatPrice(line.amount)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-muted">{quotePage.bill.empty}</p>
          )}

          <div className="flex items-end justify-between gap-3 border-t border-dashed border-hairline pt-5">
            <p className="pb-1 text-xs font-semibold uppercase tracking-wider text-muted">
              {quotePage.bill.today}
            </p>
            <p
              key={total}
              className="pop ember-text font-display text-4xl font-medium"
            >
              {tables > 0 ? formatPrice(total) : "—"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy || tables < 1}
            className="ember-gradient rounded-full px-5 py-3 text-center text-sm font-semibold text-background transition-opacity disabled:opacity-50"
          >
            {submitLabel}
          </button>
          {error && <p className="text-sm text-ember-3">{error}</p>}

          {selected && (
            <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-hairline bg-background/40 p-4 text-xs">
              <p className="font-semibold uppercase tracking-wider text-faint">
                {quotePage.bill.then}
              </p>
              <p className="flex justify-between gap-3">
                <span className="text-muted">Ominin {selected.name}</span>
                <span className="font-semibold">
                  {formatPrice(selected.price)}
                  {pricingSection.perMonth}
                  {selected.price > 0 && `, ${quotePage.bill.noCommitment}`}
                </span>
              </p>
              {selected.commission && (
                <p className="flex justify-between gap-3">
                  <span className="text-muted">Commission</span>
                  <span className="text-right font-semibold">
                    {selected.commission.percent} % {selected.commission.basis}
                  </span>
                </p>
              )}
              {options && square && (
                <p className="flex justify-between gap-3">
                  <span className="text-muted">Abonnement Square</span>
                  <span className="text-right font-semibold">
                    {squareCost}, {quotePage.bill.squareNote}
                  </span>
                </p>
              )}
            </div>
          )}

          <ul className="flex flex-col gap-1 text-[11px] text-faint">
            {quotePage.microcopy.map((line) => (
              <li key={line} className="flex items-center gap-1.5">
                <span className="text-ember-1">✓</span>
                {line}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Mobile : le total reste sous le pouce pendant qu'on compose. L'écran
          d'activation s'en passe — l'espace de gestion a sa barre en bas. */}
      {!locked && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-background/90 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-5 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                {quotePage.bill.today}
              </p>
              <p
                key={total}
                className="pop ember-text font-display text-2xl font-medium"
              >
                {tables > 0 ? formatPrice(total) : "—"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy || tables < 1}
              className="ember-gradient rounded-full px-6 py-2.5 text-sm font-semibold text-background transition-opacity disabled:opacity-50"
            >
              {submitLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
