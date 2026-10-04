"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { CHARTS, sparkline, type ChartName } from "@/lib/report/charts";
import { COPY, LANGS, isWeekend, makeFmt, onlineRevShare, onlineShare, type Fmt, type Lang } from "@/lib/report/copy";
import { report as r } from "@/lib/report/data";

/*
 * Page publique de résultats (données anonymisées d'un établissement client),
 * en anglais et en français. La langue vient, dans l'ordre, de ?lang=, du
 * dernier choix du visiteur, puis de la langue du navigateur ; le rendu
 * serveur est en anglais. Les graphiques sont dessinés côté client par
 * lib/report/charts.ts dans des conteneurs que React ne touche jamais.
 */

const LANG_KEY = "ominin-report-lang";
// La course du haut de page rejoue les médianes réelles en accéléré.
const RACE_SPEEDUP = 30;
const COUNT_UP_MS = 1100;

type CountFormat = "eur0" | "eur2" | "pct0" | "pct1" | "hours";
const COUNT_FORMATS: Record<CountFormat, (f: Fmt, v: number) => string> = {
  eur0: (f, v) => f.eur(v),
  eur2: (f, v) => f.eur(v, 2),
  pct0: (f, v) => f.pct(v),
  pct1: (f, v) => f.pct(v, 1),
  hours: (f, v) => f.hours(v),
};

// Chiffres dérivés des données figées : calculés une fois pour toutes.
const SINCE_LAUNCH = r.nights.filter((n) => n.day >= r.milestones.launch).map(onlineShare);
const WEEKEND_SHARE = (r.nights.filter(isWeekend).reduce((s, n) => s + n.rev, 0) / r.totals.rev) * 100;
const MIXED_BILLS = r.nights.reduce((s, n) => s + n.mixed, 0);
const ORDER_RATE = (r.funnel.steps.find((s) => s.stage === "commande")!.reached / r.funnel.sessions) * 100;
const TOTAL_ATTEMPTS = r.nights.reduce((s, n) => s + n.intent, 0);
const TOTAL_ABANDONED = r.nights.reduce((s, n) => s + n.abandoned, 0);
const TOTAL_CANCELLED = r.nights.reduce((s, n) => s + n.cancelled, 0);

let currentLang: Lang | null = null;
const langListeners = new Set<() => void>();

function readLang(): Lang {
  const fromUrl = new URLSearchParams(window.location.search).get("lang");
  if (LANGS.includes(fromUrl as Lang)) return fromUrl as Lang;
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (LANGS.includes(saved as Lang)) return saved as Lang;
  } catch {}
  return navigator.language.toLowerCase().startsWith("fr") ? "fr" : "en";
}

const langStore = {
  subscribe: (cb: () => void) => {
    langListeners.add(cb);
    return () => langListeners.delete(cb);
  },
  get: (): Lang => (currentLang ??= readLang()),
  server: (): Lang => "en",
  set: (lang: Lang) => {
    currentLang = lang;
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {}
    // Un lien ?lang= copié ou rechargé doit garder la langue choisie.
    const url = new URL(window.location.href);
    if (url.searchParams.has("lang")) {
      url.searchParams.set("lang", lang);
      window.history.replaceState(null, "", url);
    }
    langListeners.forEach((cb) => cb());
  },
};

/** **gras** et __accent__ dans les textes de lib/report/copy.ts. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*|__[^_]+__)/g).map((part, i) =>
        part.startsWith("**") ? (
          <b key={i}>{part.slice(2, -2)}</b>
        ) : part.startsWith("__") ? (
          <em key={i}>{part.slice(2, -2)}</em>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

function Stat({ label, value, sub, hot, count, children }: {
  label: string;
  value: string;
  sub?: string;
  hot?: boolean;
  count?: [number, CountFormat];
  children?: React.ReactNode;
}) {
  return (
    <div className="stat">
      <span className="lbl">{label}</span>
      <span className={hot ? "val hot" : "val"} data-count={count?.[0]} data-f={count?.[1]}>
        {value}
      </span>
      {sub && <span className="sub">{sub}</span>}
      {children}
    </div>
  );
}

function Chart({ name }: { name: ChartName }) {
  return <div className="viz" data-chart={name} />;
}

function Legend({ items }: { items: readonly (readonly [string, string])[] }) {
  return (
    <div className="legend">
      {items.map(([color, label]) => (
        <span key={label} style={{ "--c": color } as React.CSSProperties}><i />{label}</span>
      ))}
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.replaceChildren(sparkline(values));
  }, [values]);
  return <div ref={ref} aria-hidden="true" />;
}

const inView = (el: Element) => {
  const box = el.getBoundingClientRect();
  return box.top < window.innerHeight && box.bottom > 0;
};

export function FieldReport() {
  const lang = useSyncExternalStore(langStore.subscribe, langStore.get, langStore.server);
  const c = COPY[lang];
  const f = useMemo(() => makeFmt(lang), [lang]);
  const root = useRef<HTMLDivElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const fmtRef = useRef(f);
  const replay = useRef<() => void>(() => {});

  useEffect(() => {
    fmtRef.current = f;
  }, [f]);

  // Graphiques : chacun redessiné quand son conteneur change de largeur, tous au changement de langue.
  useEffect(() => {
    const node = root.current;
    const tipNode = tip.current;
    if (!node || !tipNode) return;
    const ctx = { r, c, f, tip: tipNode };
    const widths = new WeakMap<Element, number>();
    const draw = (host: HTMLElement) => {
      const w = host.clientWidth;
      if (!w || widths.get(host) === w) return;
      widths.set(host, w);
      tipNode.hidden = true;
      CHARTS[host.dataset.chart as ChartName](host, ctx);
    };
    const hosts = [...node.querySelectorAll<HTMLElement>("[data-chart]")];
    hosts.forEach(draw);
    const observer = new ResizeObserver((entries) => entries.forEach((e) => draw(e.target as HTMLElement)));
    hosts.forEach((host) => observer.observe(host));
    return () => observer.disconnect();
  }, [c, f]);

  // Infobulle tactile : elle reste après le lever du doigt, se ferme au défilement ou à un toucher hors d'une marque.
  useEffect(() => {
    const node = root.current;
    const tipNode = tip.current;
    if (!node || !tipNode) return;
    const hide = (e: Event) => {
      if (e.type !== "scroll" && (e.target as Element).closest?.("[data-tip]")) return;
      tipNode.hidden = true;
      node.querySelectorAll(".cross").forEach((line) => line.setAttribute("visibility", "hidden"));
    };
    window.addEventListener("scroll", hide, { passive: true });
    document.addEventListener("pointerdown", hide);
    return () => {
      window.removeEventListener("scroll", hide);
      document.removeEventListener("pointerdown", hide);
    };
  }, []);

  /*
   * Animations d'entrée, course et compteurs, une fois par visite. Ce qui est
   * déjà à l'écran au chargement reste tel quel (pas de retour à zéro) ; le
   * reste est « armé » à son état de départ et joué en entrant dans l'écran.
   * La course du haut de page fait exception : c'est l'ouverture de la page.
   */
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const lanes = [...node.querySelectorAll<HTMLElement>(".lane")].map((lane) => ({
      track: lane.querySelector<HTMLElement>(".track")!,
      clock: lane.querySelector<HTMLElement>(".clock")!,
      seconds: Number(lane.dataset.seconds),
    }));
    let run = 0;
    const race = () => {
      if (reduced) return;
      const id = ++run;
      const t0 = performance.now();
      const longest = Math.max(...lanes.map((l) => l.seconds));
      const paint = (sim: number) => {
        for (const l of lanes) {
          l.track.style.setProperty("--p", Math.min(1, sim / l.seconds).toFixed(4));
          l.clock.firstChild!.nodeValue = fmtRef.current.dur(Math.min(sim, l.seconds));
        }
      };
      const step = (now: number) => {
        if (id !== run) return;
        const sim = ((now - t0) / 1000) * RACE_SPEEDUP;
        paint(sim);
        if (sim < longest) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      // Onglet en arrière-plan : les frames s'arrêtent, l'état final doit tomber quand même.
      setTimeout(() => id === run && paint(longest), (longest / RACE_SPEEDUP) * 1000);
    };
    replay.current = race;

    const countUp = (el: HTMLElement) => {
      el.classList.remove("armed");
      const target = Number(el.dataset.count);
      const format = COUNT_FORMATS[el.dataset.f as CountFormat];
      const text = el.firstChild!;
      const t0 = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / COUNT_UP_MS);
        text.nodeValue = format(fmtRef.current, target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      setTimeout(() => {
        text.nodeValue = format(fmtRef.current, target);
      }, COUNT_UP_MS);
    };

    const play = (el: HTMLElement) => {
      el.classList.replace("armed", "play");
      requestAnimationFrame(() => {
        Promise.allSettled(el.getAnimations({ subtree: true }).map((a) => a.finished)).then(() => el.classList.add("played"));
      });
    };

    if (reduced || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        const t = e.target as HTMLElement;
        if (t.classList.contains("race")) race();
        else if (t.dataset.count) countUp(t);
        else play(t);
      }
    }, { threshold: 0.2 });
    node.querySelectorAll<HTMLElement>(".race").forEach((t) => io.observe(t));
    // Un compteur armé est masqué par une classe : React réécrit son texte au changement de langue.
    node.querySelectorAll<HTMLElement>(".viz, [data-count]").forEach((t) => {
      if (inView(t)) return;
      t.classList.add("armed");
      io.observe(t);
    });
    return () => {
      io.disconnect();
      run++;
    };
  }, []);

  const s = r.speed;
  const o = r.online_funnel;
  const navItems = Object.entries(c.nav) as [keyof typeof c.nav, string][];
  const paymentLegend = [["var(--r-online)", c.legend.online], ["var(--r-card)", c.legend.card], ["var(--r-cash)", c.legend.cash]] as const;

  return (
    <div className="report" ref={root} lang={lang}>
      <div className="page">
        <header className="mast">
          <span className="brand"><Link href="/">Ominin</Link> <span>·</span> {c.mast.brand}</span>
          <span className="mast-note">{c.mast.note}</span>
          <div className="lang" role="group" aria-label={c.meta.switchLabel}>
            {LANGS.map((l) => (
              <button key={l} type="button" aria-pressed={lang === l} onClick={() => langStore.set(l)} lang={l}>
                {l === "en" ? "English" : "Français"}
              </button>
            ))}
          </div>
        </header>
        <nav className="toc" aria-label={c.meta.sections}>
          <ol>
            {navItems.map(([id, label]) => (
              <li key={id}><a href={`#${id}`}>{label}</a></li>
            ))}
          </ol>
        </nav>

        <section className="hero">
          <p className="eyebrow">{c.hero.eyebrow(r)}</p>
          <h1><Rich text={c.hero.title(r, f)} /></h1>
          <p className="lede"><Rich text={c.hero.lede(r, f)} /></p>
          <div className="race" role="group" aria-label={c.hero.raceLabel(r, f)}>
            <div className="lane" style={{ "--c": "var(--r-online)" } as React.CSSProperties} data-seconds={s.online.p50}>
              <div className="lane-head"><span className="who"><i className="key" />{c.hero.laneOnline}</span><span className="clock">{f.dur(s.online.p50)}</span></div>
              <div className="track"><span className="run" /><span className="flag" /><span className="dot" /></div>
            </div>
            <div className="lane" style={{ "--c": "var(--r-card)" } as React.CSSProperties} data-seconds={s.counter.p50}>
              <div className="lane-head"><span className="who"><i className="key" />{c.hero.laneCounter}</span><span className="clock">{f.dur(s.counter.p50)}</span></div>
              <div className="track"><span className="run" /><span className="flag" /><span className="dot" /></div>
            </div>
            <div className="race-foot">
              <span>{c.hero.raceFoot(r, f, RACE_SPEEDUP)}</span>
              <button className="btn" type="button" onClick={() => replay.current()}>{c.meta.replay}</button>
            </div>
          </div>
          <div className="stats">
            <Stat label={c.kpi.revenue} value={f.eur(r.totals.rev)} sub={c.kpi.revenueSub(r, f)} count={[r.totals.rev, "eur0"]} />
            <Stat label={c.kpi.online} value={f.pct(r.totals.lw_online_share)} sub={c.kpi.onlineSub(r, f)} hot count={[r.totals.lw_online_share, "pct0"]}>
              <Sparkline values={SINCE_LAUNCH} />
            </Stat>
            <Stat label={c.kpi.success} value={f.pct(o.post_rate)} sub={c.kpi.successSub(r, f)} count={[o.post_rate, "pct0"]} />
            <Stat label={c.kpi.basket} value={f.eur(r.totals.basket, 2)} sub={c.kpi.basketSub(r, f)} count={[r.totals.basket, "eur2"]} />
            <Stat label={c.kpi.scans} value={f.pct(ORDER_RATE)} sub={c.kpi.scansSub(r, f)} count={[ORDER_RATE, "pct0"]} />
          </div>
        </section>

        <section className="ch" id="adoption">
          <div className="ch-head">
            <p className="eyebrow">{c.adoption.eyebrow}</p>
            <h2><Rich text={c.adoption.title} /></h2>
            <p className="lede"><Rich text={c.adoption.lede(r, f)} /></p>
          </div>
          <div className="panel">
            <div className="panel-head"><h3>{c.adoption.shareTitle}</h3><p className="small">{c.adoption.shareSub}</p></div>
            <Chart name="share" />
            <ol className="events">
              {c.adoption.events(r, f).map((e, i) => (
                <li key={i}><span className="n">{i + 1}</span><span><Rich text={e} /></span></li>
              ))}
            </ol>
          </div>
          <div className="grid-2">
            <div className="panel">
              <div className="panel-head"><h3>{c.adoption.stackTitle}</h3><p className="small">{c.adoption.stackSub(MIXED_BILLS)}</p></div>
              <Legend items={paymentLegend} />
              <Chart name="stack" />
            </div>
            <div className="panel">
              <div className="panel-head"><h3>{c.adoption.mixTitle}</h3><p className="small">{c.adoption.mixSub}</p></div>
              <Legend items={paymentLegend} />
              <Chart name="mix" />
              <p className="note"><Rich text={c.adoption.mixNote(r, f)} /></p>
            </div>
          </div>
          <div className="callout">
            <h3>{c.adoption.basketTitle}</h3>
            <p>{c.adoption.basketNote(r, f)}</p>
          </div>
        </section>

        <section className="ch" id="speed">
          <div className="ch-head">
            <p className="eyebrow">{c.speed.eyebrow}</p>
            <h2><Rich text={c.speed.title} /></h2>
            <p className="lede">{c.speed.lede}</p>
          </div>
          <div className="stats">
            <Stat label={c.speed.medOnline} value={f.dur(s.online.p50)} sub={c.speed.nineIn10(f.dur(s.online.p90))} hot />
            <Stat label={c.speed.medCounter} value={f.dur(s.counter.p50)} sub={c.speed.nineIn10(f.dur(s.counter.p90))} />
            <Stat label={c.speed.over15} value={f.pct(s.over15, 1)} sub={c.speed.over30(f.pct(s.over30, 1))} count={[s.over15, "pct1"]} />
            <Stat label={c.speed.saved} value={f.hours(s.saved_hours)} sub={c.speed.savedSub(s.n_online)} count={[s.saved_hours, "hours"]} />
          </div>
          <div className="panel">
            <div className="panel-head"><h3>{c.speed.ecdfTitle}</h3><p className="small">{c.speed.ecdfSub}</p></div>
            <Legend items={[["var(--r-online)", c.legend.paidOnline], ["var(--r-card)", c.legend.paidCounter]]} />
            <Chart name="ecdf" />
          </div>
          <div className="grid-2">
            <div className="panel">
              <div className="panel-head"><h3>{c.speed.loadTitle}</h3><p className="small">{c.speed.loadSub}</p></div>
              <div className="legend">
                <span style={{ "--c": "var(--r-card)" } as React.CSSProperties}><i />{c.speed.loadMedian}</span>
                <span style={{ "--c": "var(--r-ink-2)" } as React.CSSProperties}><i className="tick" />{c.speed.loadP90}</span>
              </div>
              <Chart name="load" />
            </div>
            <div className="panel">
              <div className="panel-head"><h3>{c.speed.nightTitle}</h3><p className="small">{c.speed.nightSub}</p></div>
              <Chart name="nightWait" />
              <p className="note"><Rich text={c.speed.nightNote(r, f)} /></p>
            </div>
          </div>
          <p className="note"><Rich text={c.speed.printNote(r, f)} /></p>
        </section>

        <section className="ch" id="reliability">
          <div className="ch-head">
            <p className="eyebrow">{c.reliability.eyebrow}</p>
            <h2><Rich text={c.reliability.title(r, f)} /></h2>
            <p className="lede">{c.reliability.lede(r, f)}</p>
          </div>
          <div className="grid-2">
            <div className="panel">
              <div className="panel-head"><h3>{c.reliability.successTitle}</h3><p className="small">{c.reliability.successSub}</p></div>
              <Legend items={[["var(--r-quiet)", c.reliability.before(f.pct(o.pre_rate))], ["var(--r-online)", c.reliability.after(f.pct(o.post_rate))]]} />
              <Chart name="success" />
            </div>
            <div className="panel">
              <div className="panel-head"><h3>{c.reliability.outcomeTitle(r, f)}</h3><p className="small">{c.reliability.outcomeSub}</p></div>
              <Chart name="outcome" />
              <Legend items={[
                ["var(--r-online)", `${c.reliability.outcomes[0]} · ${f.int(o.paid)}`],
                ["var(--r-card)", `${c.reliability.outcomes[1]} · ${f.int(o.fallback)}`],
                ["var(--r-quiet)", `${c.reliability.outcomes[2]} · ${f.int(o.abandoned + o.cancelled)}`],
              ]} />
              <p className="note"><Rich text={c.reliability.ghostNote(r, f)} /></p>
            </div>
          </div>
        </section>

        <section className="ch" id="rhythm">
          <div className="ch-head">
            <p className="eyebrow">{c.rhythm.eyebrow}</p>
            <h2><Rich text={c.rhythm.title} /></h2>
            <p className="lede"><Rich text={c.rhythm.lede(r, f, WEEKEND_SHARE)} /></p>
          </div>
          <div className="grid-2">
            <div className="panel">
              <div className="panel-head"><h3>{c.rhythm.heatTitle}</h3><p className="small">{c.rhythm.heatSub}</p></div>
              <Chart name="heat" />
            </div>
            <div className="panel">
              <div className="panel-head"><h3>{c.rhythm.dowTitle}</h3><p className="small">{c.rhythm.dowSub}</p></div>
              <Chart name="dow" />
            </div>
          </div>
        </section>

        <section className="ch" id="menu">
          <div className="ch-head">
            <p className="eyebrow">{c.menu.eyebrow}</p>
            <h2><Rich text={c.menu.title(r, f)} /></h2>
            <p className="lede"><Rich text={c.menu.lede(r, f)} /></p>
          </div>
          <div className="grid-2">
            <div className="panel">
              <div className="panel-head"><h3>{c.menu.catsTitle}</h3><p className="small">{c.menu.catsSub}</p></div>
              <Chart name="categories" />
            </div>
            <div className="panel">
              <div className="panel-head"><h3>{c.menu.topTitle}</h3><p className="small">{c.menu.topSub}</p></div>
              <Chart name="topItems" />
            </div>
          </div>
        </section>

        <section className="ch" id="guests">
          <div className="ch-head">
            <p className="eyebrow">{c.guests.eyebrow}</p>
            <h2><Rich text={c.guests.title} /></h2>
            <p className="lede"><Rich text={c.guests.lede(r, f)} /></p>
          </div>
          <div className="grid-2">
            <div className="panel">
              <div className="panel-head"><h3>{c.guests.tablesTitle}</h3><p className="small">{c.guests.tablesSub(r, f)}</p></div>
              <Chart name="tables" />
            </div>
            <div className="panel">
              <div className="panel-head"><h3>{c.guests.funnelTitle}</h3><p className="small">{c.guests.funnelSub(r, f)}</p></div>
              <Chart name="funnel" />
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><h3>{c.guests.loyaltyTitle}</h3></div>
            <div className="stats">
              <Stat label={c.guests.members} value={f.int(r.loyalty.members)} sub={c.guests.membersSub(r)} />
              <Stat label={c.guests.withCard} value={f.pct(r.loyalty.share, 1)} sub={c.guests.withCardSub} />
              <Stat label={c.guests.returning} value={f.int(r.loyalty.returning)} sub={c.guests.returningSub} />
              <Stat label={c.guests.rewards} value={f.int(r.loyalty.redemptions)} sub={c.guests.rewardsSub(f.int(r.loyalty.points_redeemed))} />
            </div>
          </div>
        </section>

        <section className="ch" id="nights">
          <div className="ch-head">
            <p className="eyebrow">{c.nights.eyebrow}</p>
            <h2>{c.nights.title}</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr>{c.nights.cols.map((col) => <th key={col} scope="col">{col}</th>)}</tr></thead>
              <tbody>
                {r.nights.map((n) => (
                  <tr key={n.day} className={isWeekend(n) ? "wk" : undefined}>
                    <th scope="row">{c.nightName(n)}</th>
                    <td>{f.int(n.orders)}</td>
                    <td>{f.eur(n.rev)}</td>
                    <td>{f.pct(onlineShare(n), 1)}</td>
                    <td>{f.pct(onlineRevShare(n), 1)}</td>
                    <td>{f.dur(n.counter_med)}</td>
                    <td>{n.intent}</td>
                    <td>{n.abandoned}</td>
                    <td>{n.cancelled}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">{c.nights.total}</th>
                  <td>{f.int(r.totals.paid)}</td>
                  <td>{f.eur(r.totals.rev)}</td>
                  <td>{f.pct((r.totals.online_paid / r.totals.paid) * 100, 1)}</td>
                  <td>{f.pct((r.totals.online_rev / r.totals.rev) * 100, 1)}</td>
                  <td>{f.dur(s.counter.p50)}</td>
                  <td>{TOTAL_ATTEMPTS}</td>
                  <td>{TOTAL_ABANDONED}</td>
                  <td>{TOTAL_CANCELLED}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <ul className="method">
            {c.nights.method(r, f).map((m, i) => <li key={i}><Rich text={m} /></li>)}
          </ul>
        </section>
      </div>
      <div className="tip" ref={tip} role="tooltip" hidden />
    </div>
  );
}
