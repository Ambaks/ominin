import { dowIndex, isWeekend, onlineRevShare, onlineShare, type Copy, type Fmt } from "./copy";
import type { Night, Report } from "./data";

/*
 * Graphiques de la page de résultats : SVG dessiné à la largeur réelle de son
 * conteneur (texte net, pas de mise à l'échelle), redessiné quand ce conteneur
 * change de largeur et au changement de langue. Couleurs et typo viennent des
 * jetons de report.css ; l'animation d'entrée est pilotée par le composant.
 */

type ChartContext = { r: Report; c: Copy; f: Fmt; tip: HTMLElement };
type Frame = { svg: SVGSVGElement; w: number; h: number; x0: number; x1: number; y0: number; y1: number };
type Margin = { t: number; r: number; b: number; l: number };

const NS = "http://www.w3.org/2000/svg";

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, parent?: Element) {
  const node = document.createElementNS(NS, tag);
  for (const k in attrs) node.setAttribute(k, String(attrs[k]));
  parent?.appendChild(node);
  return node;
}

function text(parent: Element, x: number, y: number, str: string, cls: string, anchor = "start") {
  const t = el("text", { x, y, class: cls, "text-anchor": anchor, "dominant-baseline": "middle" }, parent);
  t.textContent = str;
  return t;
}

function frame(host: HTMLElement, h: number, m: Margin, label: string): Frame {
  host.replaceChildren();
  const w = host.clientWidth;
  const svg = el("svg", { viewBox: `0 0 ${w} ${h}`, width: w, height: h, role: "img", "aria-label": label }, host);
  return { svg, w, h, x0: m.l, x1: w - m.r, y0: h - m.b, y1: m.t };
}

function yGrid(f: Frame, ticks: number[], y: (v: number) => number, label: (v: number) => string) {
  const g = el("g", {}, f.svg);
  for (const t of ticks) {
    el("line", { x1: f.x0, x2: f.x1, y1: y(t), y2: y(t), class: t === 0 ? "base" : "gl" }, g);
    text(g, f.x0 - 8, y(t), label(t), "tick", "end");
  }
}

/** Colonne à bout arrondi (4 px), base carrée. */
function colPath(x: number, y: number, w: number, h: number, r = 4) {
  if (h <= 0) return "";
  r = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/** Barre horizontale à bout arrondi à droite. */
function barPath(x: number, y: number, w: number, h: number, r = 4) {
  if (w <= 0) return "";
  r = Math.min(r, h / 2, w);
  return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`;
}

const rectPath = (x: number, y: number, w: number, h: number) => `M${x},${y}h${w}v${h}h${-w}Z`;

/* ---------- infobulle ---------- */

const row = (color: string, label: string, value: string | number) =>
  `<div class="tr"><span class="sw" style="background:${color}"></span><span>${label}</span><b>${value}</b></div>`;
const head = (t: string) => `<div class="th">${t}</div>`;

/*
 * Souris : l'infobulle suit le pointeur et part avec lui. Tactile : elle se
 * pose au-dessus du doigt et reste après le lever ; le composant la ferme au
 * prochain toucher hors graphique ou au défilement.
 */
function hover(ctx: ChartContext, target: Element, html: (e: PointerEvent) => string, onLeave?: () => void) {
  const show = (ev: Event) => {
    const e = ev as PointerEvent;
    const tip = ctx.tip;
    tip.innerHTML = html(e);
    tip.hidden = false;
    const box = tip.getBoundingClientRect();
    const touch = e.pointerType !== "mouse";
    let x = e.clientX + 14;
    let y = touch ? e.clientY - box.height - 24 : e.clientY + 14;
    if (x + box.width > innerWidth - 8) x = e.clientX - box.width - 14;
    if (y + box.height > innerHeight - 8 || y < 8) y = touch ? e.clientY + 24 : e.clientY - box.height - 14;
    tip.style.transform = `translate(${Math.max(8, x)}px, ${Math.max(8, y)}px)`;
  };
  target.setAttribute("data-tip", "");
  target.addEventListener("pointermove", show);
  target.addEventListener("pointerdown", show);
  target.addEventListener("pointerleave", (ev) => {
    if ((ev as PointerEvent).pointerType !== "mouse") return;
    ctx.tip.hidden = true;
    onLeave?.();
  });
}

/* ---------- axe des soirs ---------- */

function nightScale(f: Frame, n: number) {
  const band = (f.x1 - f.x0) / n;
  return { band, x: (i: number) => f.x0 + band * (i + 0.5) };
}

function weekendBands(f: Frame, nights: Night[], X: ReturnType<typeof nightScale>) {
  nights.forEach((n, i) => {
    if (isWeekend(n)) el("rect", { x: X.x(i) - X.band / 2, y: f.y1, width: X.band, height: f.y0 - f.y1, class: "wknd" }, f.svg);
  });
}

function nightAxis(ctx: ChartContext, f: Frame, nights: Night[], X: ReturnType<typeof nightScale>) {
  const g = el("g", {}, f.svg);
  const roomy = X.band >= 30;
  nights.forEach((n, i) => {
    if (!roomy && i % 2 && i !== nights.length - 1) return;
    const d = +n.day.slice(8);
    text(g, X.x(i), f.y0 + 14, d === 1 ? ctx.c.oct1 : String(d), "tick", "middle");
    if (roomy) text(g, X.x(i), f.y0 + 28, ctx.c.days.short[dowIndex(n)], "tick sub", "middle");
  });
}

function nightHits(ctx: ChartContext, f: Frame, nights: Night[], X: ReturnType<typeof nightScale>, html: (n: Night) => string, cross: boolean) {
  const g = el("g", {}, f.svg);
  const line = cross ? el("line", { class: "cross", y1: f.y1, y2: f.y0, visibility: "hidden" }, g) : null;
  nights.forEach((n, i) => {
    const hit = el("rect", { x: X.x(i) - X.band / 2, y: f.y1, width: X.band, height: f.y0 - f.y1, class: "hit" }, g);
    hover(ctx, hit, () => {
      line?.setAttribute("x1", String(X.x(i)));
      line?.setAttribute("x2", String(X.x(i)));
      line?.setAttribute("visibility", "visible");
      return html(n);
    }, () => line?.setAttribute("visibility", "hidden"));
  });
}

/* ---------- graphiques ---------- */

function share(host: HTMLElement, ctx: ChartContext) {
  const { r, c, f: fmt } = ctx;
  const N = r.nights;
  const m = r.milestones;
  const f = frame(host, 270, { t: 34, r: 40, b: 40, l: 40 }, c.adoption.shareTitle);
  const X = nightScale(f, N.length);
  const y = (v: number) => f.y0 - (v / 60) * (f.y0 - f.y1);
  weekendBands(f, N, X);
  yGrid(f, [0, 20, 40, 60], y, (v) => fmt.pct(v));
  nightAxis(ctx, f, N, X);
  [m.card_live, m.launch, m.default_online, m.fix].forEach((day, k) => {
    const i = N.findIndex((n) => n.day === day);
    el("line", { x1: X.x(i), x2: X.x(i), y1: f.y1 - 8, y2: f.y0, class: "evt" }, f.svg);
    el("circle", { cx: X.x(i), cy: f.y1 - 16, r: 8, class: "evt-c" }, f.svg);
    text(f.svg, X.x(i), f.y1 - 15.5, String(k + 1), "evt-t", "middle");
  });
  const pts = N.map((n, i) => [X.x(i), y(onlineShare(n))]);
  const line = pts.map((p) => p.join(",")).join("L");
  el("path", { d: `M${pts[0][0]},${f.y0}L${line}L${pts[pts.length - 1][0]},${f.y0}Z`, class: "area mk-fade", style: "fill:var(--r-online)" }, f.svg);
  el("path", { d: `M${line}`, class: "line mk-draw", pathLength: 1, style: "stroke:var(--r-online)" }, f.svg);
  pts.forEach((p, i) => el("circle", { cx: p[0], cy: p[1], r: 4, class: "dot mk-pop", style: `fill:var(--r-online);--i:${i}` }, f.svg));
  const last = pts.length - 1;
  text(f.svg, pts[last][0] + 9, pts[last][1], fmt.pct(onlineShare(N[last])), "lab");
  const switched = N.findIndex((n) => n.day === m.default_online);
  text(f.svg, pts[switched][0] + 8, pts[switched][1] - 12, fmt.pct(onlineShare(N[switched])), "lab");
  nightHits(ctx, f, N, X, (n) =>
    head(c.nightName(n)) +
    row("var(--r-online)", c.charts.paidOnline, fmt.pct(onlineShare(n), 1)) +
    row("transparent", c.charts.onlineOrders, c.charts.ofTotal(n.online, n.orders)) +
    row("transparent", c.charts.onlineRevenue, fmt.pct(onlineRevShare(n), 1)), true);
}

function stack(host: HTMLElement, ctx: ChartContext) {
  const { r, c, f: fmt } = ctx;
  const N = r.nights;
  const f = frame(host, 270, { t: 22, r: 12, b: 40, l: 40 }, c.adoption.stackTitle);
  const X = nightScale(f, N.length);
  const y = (v: number) => f.y0 - (v / 400) * (f.y0 - f.y1);
  weekendBands(f, N, X);
  yGrid(f, [0, 100, 200, 300, 400], y, fmt.int);
  nightAxis(ctx, f, N, X);
  const w = Math.min(24, X.band * 0.62);
  N.forEach((n, i) => {
    const segs: [number, string][] = [[n.online, "var(--r-online)"], [n.card + n.mixed, "var(--r-card)"], [n.cash, "var(--r-cash)"]];
    const topIdx = segs.map(([v]) => v > 0).lastIndexOf(true);
    let acc = 0;
    segs.forEach(([v, color], k) => {
      if (!v) return;
      const yTop = y(acc + v);
      const h = y(acc) - yTop - (acc > 0 ? 2 : 0);
      el("path", { d: colPath(X.x(i) - w / 2, yTop, w, h, k === topIdx ? 4 : 0), class: "mk-col", style: `fill:${color};--i:${i}` }, f.svg);
      acc += v;
    });
  });
  const iMax = N.reduce((b, n, i) => (n.orders > N[b].orders ? i : b), 0);
  text(f.svg, X.x(iMax), y(N[iMax].orders) - 10, fmt.int(N[iMax].orders), "lab", "middle");
  nightHits(ctx, f, N, X, (n) =>
    head(c.nightName(n)) +
    row("var(--r-online)", c.legend.online, n.online) +
    row("var(--r-card)", c.legend.card, n.card + n.mixed) +
    row("var(--r-cash)", c.legend.cash, n.cash) +
    row("transparent", c.charts.revenue, fmt.eur(n.rev)), false);
}

/** Segments d'une barre 100 % : couleur du segment et couleur de son libellé intérieur. */
const PAYMENT_SEGMENTS = [
  ["en_ligne", "var(--r-online)", "var(--r-on-online)"],
  ["carte", "var(--r-card)", "var(--r-on-card)"],
  ["especes", "var(--r-cash)", "var(--r-on-cash)"],
] as const;

function mix(host: HTMLElement, ctx: ChartContext) {
  const { r, c, f: fmt } = ctx;
  const rows = [r.mix.before, r.mix.after, r.mix.last_weekend];
  const names = { en_ligne: c.legend.online, carte: c.legend.card, especes: c.legend.cash };
  const rh = 58;
  const f = frame(host, rows.length * rh, { t: 0, r: 0, b: 0, l: 0 }, c.adoption.mixTitle);
  rows.forEach((m, ri) => {
    const label = c.adoption.mixRows[ri];
    const y0 = ri * rh;
    text(f.svg, 0, y0 + 10, label, "lab-2");
    const present = PAYMENT_SEGMENTS.filter(([k]) => m[k] > 0);
    let x = 0;
    present.forEach(([k, color, on], j) => {
      const v = m[k];
      const last = j === present.length - 1;
      const wSeg = (v / 100) * f.w - (last ? 0 : 2);
      const p = el("path", { d: last ? barPath(x, y0 + 24, wSeg, 24) : rectPath(x, y0 + 24, wSeg, 24), class: "mk-bar", style: `fill:${color};--i:${ri * 3 + j}` }, f.svg);
      if (wSeg > 44) text(f.svg, x + 10, y0 + 36.5, fmt.pct(v), "in", "start").style.fill = on;
      hover(ctx, p, () => head(label) + row(color, names[k], fmt.pct(v, 1)));
      x += wSeg + 2;
    });
  });
}

function ecdf(host: HTMLElement, ctx: ChartContext) {
  const { r, c, f: fmt } = ctx;
  const M = r.ecdf.minutes;
  const maxM = M[M.length - 1];
  const f = frame(host, 290, { t: 16, r: 18, b: 40, l: 44 }, c.speed.ecdfTitle);
  const x = (m: number) => f.x0 + (m / maxM) * (f.x1 - f.x0);
  const y = (v: number) => f.y0 - (v / 100) * (f.y0 - f.y1);
  yGrid(f, [0, 25, 50, 75, 100], y, (v) => fmt.pct(v));
  [0, 5, 10, 15, 20].forEach((m) => text(f.svg, x(m), f.y0 + 14, c.charts.minTick(m), "tick", "middle"));
  text(f.svg, (f.x0 + f.x1) / 2, f.y0 + 32, c.charts.minutesAxis, "ttl", "middle");
  const oneMin = M.indexOf(1);
  el("line", { x1: x(1), x2: x(1), y1: f.y1, y2: f.y0, class: "evt" }, f.svg);
  const series = [
    [r.ecdf.counter, "var(--r-card)", c.charts.after1Counter],
    [r.ecdf.online, "var(--r-online)", c.charts.after1Online],
  ] as const;
  series.forEach(([vals, color]) => {
    el("path", { d: "M" + M.map((m, i) => `${x(m)},${y(vals[i])}`).join("L"), class: "line mk-draw", pathLength: 1, style: `stroke:${color}` }, f.svg);
  });
  series.forEach(([vals, color, label], j) => {
    const v = vals[oneMin];
    el("circle", { cx: x(1), cy: y(v), r: 5, class: "dot mk-pop", style: `fill:${color};--i:${j + 4}` }, f.svg);
    text(f.svg, x(1) + 10, y(v) + 14, `${fmt.pct(v)} ${label}`, "lab");
  });
  const cross = el("line", { class: "cross", y1: f.y1, y2: f.y0, visibility: "hidden" }, f.svg);
  const hit = el("rect", { x: f.x0, y: f.y1, width: f.x1 - f.x0, height: f.y0 - f.y1, class: "hit" }, f.svg);
  hover(ctx, hit, (e) => {
    const box = f.svg.getBoundingClientRect();
    const m = ((((e.clientX - box.left) / box.width) * f.w - f.x0) / (f.x1 - f.x0)) * maxM;
    const i = Math.round(Math.min(maxM, Math.max(0, m)) / (M[1] - M[0]));
    cross.setAttribute("x1", String(x(M[i])));
    cross.setAttribute("x2", String(x(M[i])));
    cross.setAttribute("visibility", "visible");
    return head(c.charts.afterX(fmt.dur(M[i] * 60))) + row("var(--r-online)", c.legend.paidOnline, fmt.pct(r.ecdf.online[i], 1)) + row("var(--r-card)", c.legend.paidCounter, fmt.pct(r.ecdf.counter[i], 1));
  }, () => cross.setAttribute("visibility", "hidden"));
}

function load(host: HTMLElement, ctx: ChartContext) {
  const { r, c, f: fmt } = ctx;
  const L = r.load;
  const f = frame(host, 270, { t: 22, r: 12, b: 44, l: 44 }, c.speed.loadTitle);
  const y = (v: number) => f.y0 - (v / 1500) * (f.y0 - f.y1);
  yGrid(f, [0, 300, 600, 900, 1200, 1500], y, (v) => c.charts.minTick(v / 60));
  const band = (f.x1 - f.x0) / L.length;
  const w = Math.min(24, band * 0.5);
  L.forEach((b, i) => {
    const cx = f.x0 + band * (i + 0.5);
    el("path", { d: colPath(cx - w / 2, y(b.med), w, f.y0 - y(b.med)), class: "mk-col", style: `fill:var(--r-card);--i:${i}` }, f.svg);
    el("line", { x1: cx - w / 2 - 5, x2: cx + w / 2 + 5, y1: y(b.p90), y2: y(b.p90), class: "p90 mk-pop", style: `--i:${i}` }, f.svg);
    text(f.svg, cx, f.y0 + 14, b.label, "tick", "middle");
    if (i === 0 || i === L.length - 1) text(f.svg, cx, y(b.med) - 10, fmt.min(b.med), "lab", "middle");
    const hit = el("rect", { x: cx - band / 2, y: f.y1, width: band, height: f.y0 - f.y1, class: "hit" }, f.svg);
    hover(ctx, hit, () => head(c.charts.loadHead(b.label)) + row("var(--r-card)", c.charts.medianWait, fmt.dur(b.med)) + row("var(--r-ink-2)", c.charts.under9, fmt.dur(b.p90)) + row("transparent", c.charts.counterOrders, fmt.int(b.n)));
  });
  text(f.svg, (f.x0 + f.x1) / 2, f.y0 + 32, c.charts.loadAxis, "ttl", "middle");
}

function nightWait(host: HTMLElement, ctx: ChartContext) {
  const { r, c, f: fmt } = ctx;
  const N = r.nights;
  const f = frame(host, 270, { t: 22, r: 12, b: 40, l: 44 }, c.speed.nightTitle);
  const X = nightScale(f, N.length);
  const y = (v: number) => f.y0 - (v / 720) * (f.y0 - f.y1);
  weekendBands(f, N, X);
  yGrid(f, [0, 240, 480, 720], y, (v) => c.charts.minTick(v / 60));
  nightAxis(ctx, f, N, X);
  const w = Math.min(24, X.band * 0.62);
  N.forEach((n, i) => {
    el("path", { d: colPath(X.x(i) - w / 2, y(n.counter_med), w, f.y0 - y(n.counter_med)), class: "mk-col", style: `fill:var(--r-card);--i:${i}` }, f.svg);
  });
  const iMax = N.reduce((b, n, i) => (n.counter_med > N[b].counter_med ? i : b), 0);
  text(f.svg, X.x(iMax) - w / 2 - 4, y(N[iMax].counter_med) + 6, fmt.min(N[iMax].counter_med), "lab", "end");
  nightHits(ctx, f, N, X, (n) =>
    head(c.nightName(n)) +
    row("var(--r-card)", c.charts.medianCounter, fmt.dur(n.counter_med)) +
    row("transparent", c.charts.under9, fmt.dur(n.counter_p90)) +
    row("transparent", c.charts.paidOrders, n.orders), false);
}

function success(host: HTMLElement, ctx: ChartContext) {
  const { r, c, f: fmt } = ctx;
  const { launch, after_fix } = r.milestones;
  const S = r.nights.filter((n) => n.day >= launch);
  const f = frame(host, 270, { t: 30, r: 12, b: 40, l: 40 }, c.reliability.successTitle);
  const y = (v: number) => f.y0 - (v / 100) * (f.y0 - f.y1);
  yGrid(f, [0, 25, 50, 75, 100], y, (v) => fmt.pct(v));
  const X = nightScale(f, S.length);
  const w = Math.min(24, X.band * 0.55);
  const firstAfter = S.findIndex((n) => n.day >= after_fix);
  const color = (n: Night) => (n.day >= after_fix ? "var(--r-online)" : "var(--r-quiet)");
  nightAxis(ctx, f, S, X);
  S.forEach((n, i) => {
    const v = (n.online / n.intent) * 100;
    el("path", { d: colPath(X.x(i) - w / 2, y(v), w, f.y0 - y(v)), class: "mk-col", style: `fill:${color(n)};--i:${i}` }, f.svg);
  });
  const o = r.online_funnel;
  ([[0, firstAfter - 1, o.pre_rate], [firstAfter, S.length - 1, o.post_rate]] as const).forEach(([a, b, v]) => {
    el("line", { x1: X.x(a) - X.band * 0.4, x2: X.x(b) + X.band * 0.4, y1: y(v), y2: y(v), class: "ref mk-fade" }, f.svg);
  });
  nightHits(ctx, f, S, X, (n) =>
    head(c.nightName(n)) +
    row(color(n), c.charts.successRate, fmt.pct((n.online / n.intent) * 100, 1)) +
    row("transparent", c.charts.attempts, n.intent) +
    row("transparent", c.charts.paidOnline, n.online) +
    row("transparent", c.charts.abandoned, n.abandoned), false);
}

function outcome(host: HTMLElement, ctx: ChartContext) {
  const { r, c, f: fmt } = ctx;
  const o = r.online_funnel;
  const parts = [
    [c.reliability.outcomes[0], o.paid, "var(--r-online)", "var(--r-on-online)"],
    [c.reliability.outcomes[1], o.fallback, "var(--r-card)", "var(--r-on-card)"],
    [c.reliability.outcomes[2], o.abandoned + o.cancelled, "var(--r-quiet)", "var(--r-ink)"],
  ] as const;
  const f = frame(host, 40, { t: 0, r: 0, b: 0, l: 0 }, c.reliability.outcomeTitle(r, fmt));
  let x = 0;
  parts.forEach(([name, v, color, on], j) => {
    const last = j === parts.length - 1;
    const wSeg = (v / o.intent) * f.w - (last ? 0 : 2);
    const p = el("path", { d: last ? barPath(x, 4, wSeg, 32) : rectPath(x, 4, wSeg, 32), class: "mk-bar", style: `fill:${color};--i:${j}` }, f.svg);
    if (wSeg > 50) text(f.svg, x + 10, 20.5, fmt.pct((v / o.intent) * 100), "in", "start").style.fill = on;
    hover(ctx, p, () => head(name) + row(color, c.charts.attempts, fmt.int(v)) + row("transparent", c.charts.share, fmt.pct((v / o.intent) * 100, 1)));
    x += wSeg + 2;
  });
}

function heat(host: HTMLElement, ctx: ChartContext) {
  const { r, c, f: fmt } = ctx;
  const H = r.heat;
  const lw = 40;
  const top = 22;
  const rh = 32;
  const f = frame(host, top + rh * 7 + 44, { t: 0, r: 0, b: 0, l: 0 }, c.rhythm.heatTitle);
  const cw = (f.w - lw) / H.hours.length;
  const max = Math.max(...H.rows.flat());
  const mixPct = (v: number) => Math.round(6 + 94 * (v / max));
  const tint = (v: number) => `color-mix(in oklab, var(--r-online) ${mixPct(v)}%, var(--r-surface))`;
  // Colonnes étroites (téléphone) : une heure sur deux, sinon les libellés se chevauchent.
  const step = cw < 36 ? 2 : 1;
  H.hours.forEach((h, j) => j % step === 0 && text(f.svg, lw + cw * (j + 0.5), 10, c.charts.hours(h), "tick", "middle"));
  H.rows.forEach((cells, i) => {
    text(f.svg, 0, top + rh * i + rh / 2, c.days.short[i], "tick");
    cells.forEach((v, j) => {
      const cell = el("rect", { x: lw + cw * j + 1, y: top + rh * i + 1, width: cw - 2, height: rh - 2, rx: 4, class: "mk-cell", style: `fill:${tint(v)};--i:${i * H.hours.length + j}` }, f.svg);
      // Thème sombre : blanc pur sous 80 % d'ambre, noir pur au-delà ; les deux restent ≥ 4,6:1 de part et d'autre.
      if (v >= 15) text(f.svg, lw + cw * (j + 0.5), top + rh * i + rh / 2 + 0.5, fmt.int(v), mixPct(v) >= 80 ? "in heat-lab hot" : "in heat-lab", "middle");
      hover(ctx, cell, () => head(`${c.days.long[i]} · ${c.charts.hours(H.hours[j])}–${c.charts.hours((H.hours[j] + 1) % 24)}`) + row(tint(v), c.charts.avgOrders, fmt.num(v, 1)) + row("transparent", c.charts.nightsSeen, H.nights_dow[i]));
    });
  });
  const ly = top + rh * 7 + 16;
  const lx1 = Math.min(f.w, lw + 220);
  const grad = el("linearGradient", { id: "report-heat", x1: 0, x2: 1, y1: 0, y2: 0 }, el("defs", {}, f.svg));
  el("stop", { offset: 0, style: `stop-color:${tint(0)}` }, grad);
  el("stop", { offset: 1, style: "stop-color:var(--r-online)" }, grad);
  el("rect", { x: lw, y: ly, width: lx1 - lw, height: 8, rx: 4, fill: "url(#report-heat)" }, f.svg);
  text(f.svg, lw, ly + 20, "0", "tick");
  text(f.svg, lx1, ly + 20, c.charts.perHour(Math.round(max)), "tick", "end");
}

type BarRow = { label: string; v: number; vl: string; tip: string };

function hbars(host: HTMLElement, ctx: ChartContext, rows: BarRow[], opts: { labelW: number; valW: number; aria: string }) {
  const rh = 34;
  const f = frame(host, rows.length * rh, { t: 0, r: 0, b: 0, l: 0 }, opts.aria);
  const max = Math.max(...rows.map((b) => b.v));
  // Étroit : le libellé passe au-dessus de la barre au lieu de lui voler sa largeur.
  const stacked = f.w < 400;
  rows.forEach((b, i) => {
    const y0 = i * rh;
    const bx = stacked ? 0 : opts.labelW;
    const by = stacked ? y0 + 18 : y0 + (rh - 12) / 2;
    const bw = Math.max(2, (b.v / max) * (f.w - bx - opts.valW));
    text(f.svg, 0, stacked ? y0 + 8 : y0 + rh / 2, b.label, "lab-2");
    const p = el("path", { d: barPath(bx, by, bw, 12), class: "mk-bar", style: `fill:var(--r-mark);--i:${i}` }, f.svg);
    text(f.svg, bx + bw + 8, by + 6.5, b.vl, "lab");
    hover(ctx, p, () => head(b.label) + b.tip);
  });
}

function dow(host: HTMLElement, ctx: ChartContext) {
  const { r, c, f: fmt } = ctx;
  hbars(host, ctx, r.heat.rev_dow.map((v, i) => ({
    label: c.days.long[i],
    v,
    vl: fmt.eur(v),
    tip: row("var(--r-mark)", c.charts.avgRevenue, fmt.eur(v)) + row("transparent", c.charts.nightsSeen, r.heat.nights_dow[i]),
  })), { labelW: 92, valW: 90, aria: c.rhythm.dowTitle });
}

function categories(host: HTMLElement, ctx: ChartContext) {
  const { r, c, f: fmt } = ctx;
  const tot = r.categories.reduce((s, x) => s + x.rev, 0);
  hbars(host, ctx, r.categories.slice(0, 10).map((x) => ({
    label: c.charts.categories[x.category] ?? x.category,
    v: x.rev,
    vl: `${fmt.eur(x.rev)} · ${fmt.pct((x.rev / tot) * 100)}`,
    tip: row("var(--r-mark)", c.charts.revenue, fmt.eur(x.rev)) + row("transparent", c.charts.units, fmt.int(x.units)),
  })), { labelW: 168, valW: 124, aria: c.menu.catsTitle });
}

function topItems(host: HTMLElement, ctx: ChartContext) {
  const { r, c, f: fmt } = ctx;
  hbars(host, ctx, r.top.map((t) => ({
    label: t.name,
    v: t.rev,
    vl: `${fmt.eur(t.rev)} · ${c.menu.sold(fmt.int(t.units))}`,
    tip: row("var(--r-mark)", c.charts.revenue, fmt.eur(t.rev)) + row("transparent", c.charts.units, fmt.int(t.units)),
  })), { labelW: 170, valW: 140, aria: c.menu.topTitle });
}

function funnel(host: HTMLElement, ctx: ChartContext) {
  const { r, c, f: fmt } = ctx;
  const total = r.funnel.sessions;
  hbars(host, ctx, r.funnel.steps.map((s, i) => ({
    label: c.charts.funnel[i],
    v: s.reached,
    vl: fmt.pct((s.reached / total) * 100),
    tip: row("var(--r-mark)", c.charts.sessions, fmt.int(s.reached)) + row("transparent", c.charts.ofSessions, fmt.pct((s.reached / total) * 100, 1)),
  })), { labelW: 190, valW: 56, aria: c.guests.funnelTitle });
}

function tables(host: HTMLElement, ctx: ChartContext) {
  const { r, c, f: fmt } = ctx;
  const T = r.tables.dist;
  const f = frame(host, 250, { t: 22, r: 12, b: 40, l: 40 }, c.guests.tablesTitle);
  const y = (v: number) => f.y0 - (v / 250) * (f.y0 - f.y1);
  yGrid(f, [0, 50, 100, 150, 200, 250], y, fmt.int);
  const band = (f.x1 - f.x0) / T.length;
  const w = Math.min(24, band * 0.55);
  T.forEach((t, i) => {
    const cx = f.x0 + band * (i + 0.5);
    const more = i === T.length - 1;
    el("path", { d: colPath(cx - w / 2, y(t.count), w, f.y0 - y(t.count)), class: "mk-col", style: `fill:var(--r-mark);--i:${i}` }, f.svg);
    text(f.svg, cx, f.y0 + 14, more ? `${t.n}+` : String(t.n), "tick", "middle");
    const hit = el("rect", { x: cx - band / 2, y: f.y1, width: band, height: f.y0 - f.y1, class: "hit" }, f.svg);
    hover(ctx, hit, () => head(c.charts.tablesHead(t.n, more)) + row("var(--r-mark)", c.charts.tableNights, fmt.int(t.count)) + row("transparent", c.charts.share, fmt.pct((t.count / r.tables.nights) * 100, 1)));
  });
  text(f.svg, f.x0 + band / 2 + w / 2 + 6, y(T[0].count) + 6, fmt.int(T[0].count), "lab");
  text(f.svg, (f.x0 + f.x1) / 2, f.y0 + 32, c.charts.tablesAxis, "ttl", "middle");
}

export const CHARTS = { share, stack, mix, ecdf, load, nightWait, success, outcome, heat, dow, categories, topItems, funnel, tables };
export type ChartName = keyof typeof CHARTS;

/** Courbe compacte de la tuile « payées en ligne » : part en ligne par soir depuis le lancement. */
export function sparkline(values: number[], w = 150, h = 34) {
  const svg = el("svg", { viewBox: `0 0 ${w} ${h}`, width: w, height: h, "aria-hidden": "true" });
  const max = Math.max(...values);
  const pts = values.map((v, i) => [3 + (i / (values.length - 1)) * (w - 6), h - 4 - (v / max) * (h - 8)]);
  const line = pts.map((p) => p.join(",")).join("L");
  el("path", { d: `M${pts[0][0]},${h}L${line}L${pts[pts.length - 1][0]},${h}Z`, class: "area", style: "fill:var(--r-online)" }, svg);
  el("path", { d: `M${line}`, class: "line", style: "stroke:var(--r-online)" }, svg);
  const [ex, ey] = pts[pts.length - 1];
  el("circle", { cx: ex, cy: ey, r: 3.5, class: "dot", style: "fill:var(--r-online)" }, svg);
  return svg;
}
