"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { IconButton } from "@/components/ui/icon-button";
import {
  compose,
  defaultSupports,
  featuredTills,
  initialAnswers,
  isListedTill,
  searchTills,
  tillName,
  visibleSteps,
  type Answers,
  type SupportId,
} from "@/lib/composer";
import { composerPage, starterKit } from "@/lib/landing-data";
import { formatPrice } from "@/lib/menu/format";
import { quotePlan } from "@/lib/quote";
import styles from "./composer.module.css";
import {
  PortVisual,
  PrinterVisual,
  ScreenVisual,
  ServiceVisual,
  SupportCloseUp,
  SupportsScene,
  TicketVisual,
} from "./scenes";

const { questions: q, recap } = composerPage;
const STORAGE_KEY = "ominin:composer";
const commission = quotePlan("connect")?.commission;
const supportLabels: Record<SupportId, string> = {
  cachet: "Cachet",
  poster: starterKit.poster.name,
  sticker: starterKit.sticker.name,
};

function Choice({
  selected,
  onClick,
  label,
  detail,
  visual,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  detail?: string;
  visual?: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-300 ${
        selected
          ? "border-ember-2/60 bg-background/50 shadow-lg shadow-ember-2/10"
          : "border-hairline hover:border-ember-2/30 hover:bg-background/30"
      }`}
    >
      {visual && <span className="flex w-20 shrink-0 justify-center">{visual}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium">{label}</span>
        {detail && <span className="mt-0.5 block text-[13px] text-muted">{detail}</span>}
      </span>
      <span
        className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition-colors ${
          selected
            ? "ember-gradient border-transparent text-background"
            : "border-hairline text-transparent"
        }`}
        aria-hidden
      >
        ✓
      </span>
    </button>
  );
}

function Stepper({
  value,
  min,
  onChange,
  label,
}: {
  value: number;
  min: number;
  onChange: (value: number) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <IconButton aria-label={`${label} : ${q.tables.decrease}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
        −
      </IconButton>
      <span key={value} className="pop min-w-[2ch] text-center font-display text-2xl font-medium tabular-nums">
        {value}
      </span>
      <IconButton aria-label={`${label} : ${q.tables.increase}`} onClick={() => onChange(value + 1)}>
        +
      </IconButton>
    </div>
  );
}

export function ConnectComposer({ defaultTables }: { defaultTables: number }) {
  const [answers, setAnswers] = useState(() => initialAnswers(defaultTables));
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [focus, setFocus] = useState<SupportId>("cachet");
  const card = useRef<HTMLElement>(null);
  const [showOther, setShowOther] = useState(false);
  const [tillQuery, setTillQuery] = useState("");

  const steps = visibleSteps(answers);
  const done = index >= steps.length;
  const step = done ? null : steps[index];
  const composition = compose(answers);
  const cachets = answers.service === "fast_food" ? answers.tables : Math.max(answers.tables, 1);

  const update = (patch: Partial<Answers>) => setAnswers((a) => ({ ...a, ...patch }));
  const go = (delta: 1 | -1) => {
    setDirection(delta > 0 ? "forward" : "backward");
    setIndex((i) => i + delta);
  };

  // Le parcours survit à un aller-retour (fiche de l'imprimante, retour
  // arrière du navigateur) : réponses et question en cours restent dans
  // l'onglet.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const restored = JSON.parse(saved) as { answers: Partial<Answers>; index: number };
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture unique au montage, absente du rendu serveur
      setAnswers({ ...initialAnswers(defaultTables), ...restored.answers });
      setIndex(restored.index);
    } catch {
      // Stockage indisponible (navigation privée) : on repart de zéro.
    }
  }, [defaultTables]);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, index }));
    } catch {
      // Idem : sans stockage, le parcours reste dans la page.
    }
  }, [answers, index]);

  // Sur téléphone, la réponse est souvent sous la ligne de flottaison : la
  // question suivante remonte en vue.
  useEffect(() => {
    if (card.current && card.current.getBoundingClientRect().top < 0) {
      card.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [index]);
  // Une réponse ne change que les questions qui la suivent : avancer d'un
  // cran tombe toujours sur la bonne.
  const choose = (patch: Partial<Answers>) => {
    update(patch);
    go(1);
  };
  const restart = () => {
    setShowOther(false);
    setTillQuery("");
    setAnswers(initialAnswers(defaultTables));
    setDirection("backward");
    setIndex(0);
  };

  const counts: Record<SupportId, number> = { cachet: cachets, ...answers.supports };

  const question = (): { title: string; hint?: string; body: ReactNode; canContinue: boolean } => {
    switch (step?.id) {
      case "hasTill":
        return {
          title: q.hasTill.title,
          hint: q.hasTill.hint,
          canContinue: answers.hasTill !== null,
          body: (["yes", "no", "soon"] as const).map((value) => (
            <Choice key={value} label={q.hasTill.options[value]} selected={answers.hasTill === value} onClick={() => choose({ hasTill: value })} />
          )),
        };
      case "till": {
        const otherOpen = showOther || (answers.till !== null && !featuredTills.some((till) => till.name === answers.till));
        const query = tillQuery.trim();
        const results = searchTills(tillQuery);
        return {
          title: q.till.title,
          canContinue: step.done(answers),
          body: (
            <>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {featuredTills.map((till) => (
                  <button
                    key={till.name}
                    type="button"
                    aria-pressed={answers.till === till.name}
                    onClick={() => {
                      setShowOther(false);
                      choose({ till: till.name });
                    }}
                    className={`flex items-center gap-3 rounded-2xl border p-3 text-left text-sm font-medium transition-all duration-300 ${
                      answers.till === till.name
                        ? "border-ember-2/60 bg-background/50 shadow-lg shadow-ember-2/10"
                        : "border-hairline hover:border-ember-2/30"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={till.icon.src}
                      alt=""
                      className={`size-9 shrink-0 rounded-lg bg-white object-contain ${till.icon.bleed ? "" : "p-1.5"}`}
                    />
                    <span className="min-w-0 truncate">{till.name}</span>
                  </button>
                ))}
                <button
                  type="button"
                  aria-expanded={otherOpen}
                  onClick={() => setShowOther(true)}
                  className={`flex items-center gap-3 rounded-2xl border border-dashed p-3 text-left text-sm font-medium transition-all duration-300 ${
                    otherOpen ? "border-ember-2/60 bg-background/50" : "border-hairline hover:border-ember-2/30"
                  }`}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-foreground/10 text-lg text-muted">+</span>
                  {q.till.other}
                </button>
              </div>
              {otherOpen && (
                <div className="rise flex flex-col overflow-hidden rounded-2xl border border-hairline bg-background/40">
                  <label className="flex items-center gap-3 border-b border-hairline px-4">
                    <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-faint" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                      <circle cx="8.5" cy="8.5" r="5.5" />
                      <path d="m13 13 4 4" strokeLinecap="round" />
                    </svg>
                    <input
                      autoFocus
                      type="search"
                      value={tillQuery}
                      onChange={(event) => setTillQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        const pick = results.length === 1 ? results[0].name : query;
                        if (pick) choose({ till: pick });
                      }}
                      placeholder={q.till.search}
                      aria-label={q.till.search}
                      className="min-w-0 flex-1 bg-transparent py-3.5 text-sm outline-none placeholder:text-faint"
                    />
                  </label>
                  <ul className="max-h-64 overflow-y-auto overscroll-contain p-1.5">
                    {results.map((till) => (
                      <li key={till.name}>
                        <button
                          type="button"
                          aria-pressed={answers.till === till.name}
                          onClick={() => choose({ till: till.name })}
                          className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                            answers.till === till.name ? "bg-ember-2/10" : "hover:bg-foreground/5"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-foreground/10 text-[11px] font-semibold text-muted">
                              {till.name.charAt(0)}
                            </span>
                            <span className="truncate">{till.name}</span>
                          </span>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              till.support === "compatible"
                                ? "bg-ember-2/15 text-ember-1"
                                : "border border-hairline text-faint"
                            }`}
                          >
                            {till.support === "compatible" ? q.till.compatible : q.till.check}
                          </span>
                        </button>
                      </li>
                    ))}
                    {query && !isListedTill(query) && (
                      <li>
                        <button
                          type="button"
                          aria-pressed={answers.till === query}
                          onClick={() => choose({ till: query })}
                          className="flex w-full flex-col gap-0.5 rounded-xl border border-dashed border-hairline px-3 py-2.5 text-left text-sm hover:border-ember-2/40"
                        >
                          <span className="font-medium">{q.till.typed(query)}</span>
                          <span className="text-xs text-muted">{q.till.typedHint}</span>
                        </button>
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </>
          ),
        };
      }
      case "tickets":
        return {
          title: q.tickets.title,
          hint: q.tickets.hint,
          canContinue: answers.tickets !== null,
          body: (
            <>
              <Choice {...q.tickets.options.yes} visual={<TicketVisual />} selected={answers.tickets === true} onClick={() => choose({ tickets: true })} />
              <Choice {...q.tickets.options.no} visual={<ScreenVisual />} selected={answers.tickets === false} onClick={() => choose({ tickets: false })} />
            </>
          ),
        };
      case "hasPrinters":
        return {
          title: q.hasPrinters.title,
          canContinue: answers.hasPrinters !== null,
          body: (
            <>
              <Choice label={q.hasPrinters.options.yes} selected={answers.hasPrinters === true} onClick={() => choose({ hasPrinters: true })} />
              <Choice label={q.hasPrinters.options.no} selected={answers.hasPrinters === false} onClick={() => choose({ hasPrinters: false })} />
            </>
          ),
        };
      case "tillPrints":
        return {
          title: q.tillPrints.title(tillName(answers)),
          canContinue: answers.tillPrints !== null,
          body: (["yes", "no", "unsure"] as const).map((value) => (
            <Choice key={value} label={q.tillPrints.options[value]} selected={answers.tillPrints === value} onClick={() => choose({ tillPrints: value })} />
          )),
        };
      case "link":
        return {
          title: q.link.title,
          hint: q.link.hint,
          canContinue: answers.link !== null,
          body: (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {(["ethernet", "wifi", "usb", "unsure"] as const).map((value) => (
                <Choice
                  key={value}
                  {...q.link.options[value]}
                  visual={<PortVisual kind={value} />}
                  selected={answers.link === value}
                  onClick={() => choose({ link: value })}
                />
              ))}
            </div>
          ),
        };
      case "printerOffer": {
        const usb = answers.hasPrinters === true;
        return {
          title: usb ? q.printerOffer.titleUsb : q.printerOffer.title,
          hint: usb ? q.printerOffer.hintUsb : q.printerOffer.hint,
          canContinue: answers.buyPrinter !== null,
          body: (
            <>
              <div className="flex flex-col items-center gap-5 rounded-2xl border border-hairline bg-background/40 p-5 sm:flex-row sm:items-end">
                <PrinterVisual />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <p className="font-display text-lg font-medium">{starterKit.printer.model}</p>
                  <p className="text-[13px] leading-relaxed text-muted">{starterKit.printer.tagline}</p>
                  <a
                    href={starterKit.printer.href}
                    rel="noopener noreferrer"
                    className="self-start text-xs text-muted underline decoration-hairline underline-offset-4 hover:text-foreground"
                  >
                    {q.printerOffer.productLink} →
                  </a>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4 px-1">
                <div>
                  <p className="text-sm font-medium">{q.printerOffer.count}</p>
                  <p className="text-xs text-muted">{q.printerOffer.countHint}</p>
                </div>
                <Stepper value={answers.printerCount} min={1} label={q.printerOffer.count} onChange={(printerCount) => update({ printerCount })} />
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <Choice label={q.printerOffer.options.yes} selected={answers.buyPrinter === true} onClick={() => choose({ buyPrinter: true })} />
                <Choice label={q.printerOffer.options.no} selected={answers.buyPrinter === false} onClick={() => choose({ buyPrinter: false })} />
              </div>
            </>
          ),
        };
      }
      case "cable":
        return {
          title: q.cable.title,
          hint: q.cable.hint,
          canContinue: answers.ethernetCable !== null,
          body: (
            <>
              <Choice {...q.cable.options.add} visual={<PortVisual kind="ethernet" />} selected={answers.ethernetCable === true} onClick={() => choose({ ethernetCable: true })} />
              <Choice {...q.cable.options.own} selected={answers.ethernetCable === false} onClick={() => choose({ ethernetCable: false })} />
            </>
          ),
        };
      case "service":
        return {
          title: q.service.title,
          canContinue: answers.service !== null,
          body: (["restaurant", "fast_food", "both"] as const).map((value) => (
            <Choice
              key={value}
              {...q.service.options[value]}
              visual={<ServiceVisual service={value} />}
              selected={answers.service === value}
              onClick={() =>
                choose(
                  answers.service === value
                    ? {}
                    : { service: value, supports: defaultSupports(value) }
                )
              }
            />
          )),
        };
      case "tables": {
        const fastFood = answers.service === "fast_food";
        const min = fastFood ? 0 : 1;
        return {
          title: fastFood ? q.tables.titleFastFood : q.tables.title,
          hint: fastFood ? q.tables.hintFastFood : q.tables.hint,
          canContinue: step.done(answers),
          body: (
            <div className="flex items-center justify-center gap-5 py-4">
              <IconButton aria-label={q.tables.decrease} disabled={answers.tables <= min} onClick={() => update({ tables: answers.tables - 1 })}>
                −
              </IconButton>
              <input
                type="number"
                inputMode="numeric"
                min={min}
                value={answers.tables}
                onChange={(event) => update({ tables: Math.max(min, Math.floor(Number(event.target.value)) || 0) })}
                aria-label={fastFood ? q.tables.titleFastFood : q.tables.title}
                className="ember-text w-32 bg-transparent text-center font-display text-7xl font-medium tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <IconButton aria-label={q.tables.increase} onClick={() => update({ tables: answers.tables + 1 })}>
                +
              </IconButton>
            </div>
          ),
        };
      }
      case "supports":
        return {
          title: q.supports.title,
          hint: q.supports.hint,
          canContinue: true,
          body: (
            <>
              <SupportsScene counts={counts} focus={focus} labels={supportLabels} onFocus={setFocus} />
              <div className="grid gap-4 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-center">
                <SupportCloseUp id={focus} label={supportLabels[focus]} />
                <div className="flex flex-col gap-2">
                  {(["cachet", "poster", "sticker"] as const).map((id) => (
                    <div
                      key={id}
                      onClick={() => setFocus(id)}
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-3 transition-all duration-300 ${
                        focus === id ? "border-ember-2/50 bg-background/50" : "border-hairline hover:border-ember-2/30"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{id === "cachet" ? starterKit.cachet.name : starterKit[id].name}</p>
                        <p className="text-xs text-muted">
                          {id === "cachet" ? q.supports.cachetAuto(cachets) : starterKit[id].tagline}
                        </p>
                      </div>
                      {id !== "cachet" && (
                        <Stepper
                          value={answers.supports[id]}
                          min={0}
                          label={starterKit[id].name}
                          onChange={(value) => {
                            setFocus(id);
                            update({ supports: { ...answers.supports, [id]: value } });
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ),
        };
      default:
        return { title: "", body: null, canContinue: false };
    }
  };

  const current = done ? null : question();
  const isLast = index === steps.length - 1;

  return (
    <div className="grid gap-6 pb-28 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:pb-0">
      <section ref={card} className="relative flex min-h-[30rem] scroll-mt-4 flex-col gap-6 overflow-hidden rounded-3xl border border-hairline bg-surface p-6 sm:p-8">
        <div className="flex gap-1.5" aria-hidden>
          {steps.map((s, i) => (
            <span
              key={s.id}
              className={`h-1 flex-1 rounded-full transition-colors duration-500 ${i < index || done ? "ember-gradient" : i === index ? "bg-ember-2/40" : "bg-foreground/10"}`}
            />
          ))}
        </div>

        {current ? (
          <div key={step?.id} className={`flex flex-1 flex-col gap-6 ${styles[direction]}`}>
            <div className="flex flex-col gap-2">
              <p className="text-xs text-faint">{composerPage.progress(index + 1, steps.length)}</p>
              <h2 className="font-display text-2xl font-medium tracking-tight text-balance sm:text-3xl">{current.title}</h2>
              {current.hint && <p className="text-sm leading-relaxed text-muted">{current.hint}</p>}
            </div>
            <div className={`flex flex-col gap-2.5 ${styles.stagger}`}>{current.body}</div>
            <div className="mt-auto flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => go(-1)}
                disabled={index === 0}
                className="rounded-full px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:text-foreground disabled:invisible"
              >
                ← {composerPage.back}
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                disabled={!current.canContinue}
                className="ember-gradient rounded-full px-6 py-2.5 text-sm font-semibold text-background transition-opacity disabled:opacity-30"
              >
                {isLast ? composerPage.finish : composerPage.next}
              </button>
            </div>
          </div>
        ) : (
          <div key="done" className={`flex flex-1 flex-col items-start gap-5 ${styles.forward}`}>
            <span className="pop ember-gradient flex size-12 items-center justify-center rounded-full text-xl font-bold text-background">✓</span>
            <h2 className="font-display text-3xl font-medium tracking-tight">{recap.doneTitle}</h2>
            <p className="max-w-md text-sm leading-relaxed text-muted">{recap.doneLead}</p>
            <Link
              href={composition.signupHref}
              className="ember-gradient rounded-full px-6 py-3 text-sm font-semibold text-background"
            >
              {recap.cta}
            </Link>
            <div className="mt-auto flex gap-4 text-sm text-muted">
              <button type="button" onClick={() => go(-1)} className="hover:text-foreground">
                ← {composerPage.back}
              </button>
              <button type="button" onClick={restart} className="hover:text-foreground">
                {recap.restart}
              </button>
            </div>
          </div>
        )}
      </section>

      <aside className="relative overflow-hidden rounded-3xl border border-ember-2/30 bg-surface p-6 shadow-lg shadow-ember-2/5 sm:p-8 lg:sticky lg:top-24">
        <div className="ember-glow pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative flex flex-col gap-5">
          <p className="font-display text-lg italic text-muted">{recap.label}</p>

          <dl className="flex flex-col gap-3">
            {composition.lines.map((line) => (
              <div key={line.id} className="rise flex items-baseline gap-2 text-sm">
                <dt className="text-muted">
                  {line.label}
                  {line.detail && <span className="block text-xs text-faint">{line.detail}</span>}
                </dt>
                <span className="min-w-4 flex-1 translate-y-[-3px] border-b border-dotted border-foreground/20" aria-hidden />
                <dd className={`whitespace-nowrap ${line.amount === null ? "text-xs italic text-faint" : "font-semibold"}`}>
                  {line.amount === null ? recap.pending : formatPrice(line.amount)}
                </dd>
              </div>
            ))}
          </dl>

          <div className="flex items-end justify-between gap-3 border-t border-dashed border-hairline pt-5">
            <p className="pb-1 text-xs font-semibold uppercase tracking-wider text-muted">{recap.today}</p>
            <div className="text-right">
              <p key={composition.total} className="pop ember-text font-display text-4xl font-medium">
                {formatPrice(composition.total)}
              </p>
              {composition.hasPendingPrices && <p className="text-[11px] text-faint">{recap.pendingTotal}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-hairline bg-background/40 p-4 text-xs">
            <p className="font-semibold uppercase tracking-wider text-faint">{recap.then}</p>
            <p className="flex justify-between gap-3">
              <span className="text-muted">{recap.subscription}</span>
              <span className="font-semibold">{recap.subscriptionValue}</span>
            </p>
            {commission && (
              <p className="flex justify-between gap-3">
                <span className="text-muted">{recap.commission}</span>
                <span className="text-right font-semibold">
                  {commission.percent} % {commission.basis}
                </span>
              </p>
            )}
          </div>

          {composition.notes.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-faint">{recap.understood}</p>
              <ul className="flex flex-col gap-2 text-[13px] leading-relaxed">
                {composition.notes.map((note) => (
                  <li key={note.text} className="rise flex gap-2.5 text-muted">
                    <span
                      className={`mt-[7px] size-1.5 shrink-0 rounded-full ${note.tone === "ok" ? "bg-ember-1" : "border border-ember-3"}`}
                      aria-hidden
                    />
                    {note.text}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {done && (
            <Link
              href={composition.signupHref}
              className="ember-gradient rounded-full px-5 py-3 text-center text-sm font-semibold text-background max-lg:hidden"
            >
              {recap.cta}
            </Link>
          )}
        </div>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-background/90 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-5 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{recap.today}</p>
            <p key={composition.total} className="pop ember-text font-display text-2xl font-medium">
              {formatPrice(composition.total)}
              {composition.hasPendingPrices && <span className="text-sm text-faint"> +</span>}
            </p>
          </div>
          {done && (
            <Link href={composition.signupHref} className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background">
              {recap.cta}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
