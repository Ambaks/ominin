import { QrLive } from "@/components/landing/qr-live";
import { qrShowcase } from "@/lib/landing-data";
import type { Service, SupportId } from "@/lib/composer";

/*
 * Illustrations du composeur : de quoi reconnaître sa salle et son matériel
 * d'un coup d'œil. Évocations dessinées aux couleurs du thème ; le papier et
 * les QR gardent leurs couleurs de papier dans les deux thèmes.
 */

/*
 * Évocation d'un QR pour les supports dessinés à l'échelle : trois repères et
 * une trame fixe. Le gros plan, lui, porte un vrai QR (QrLive).
 */
const QR_SIZE = 21;
const qrModules = Array.from({ length: QR_SIZE * QR_SIZE }, (_, i) => {
  const x = i % QR_SIZE;
  const y = Math.floor(i / QR_SIZE);
  const finder = (fx: number, fy: number) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7;
  if (finder(0, 0) || finder(14, 0) || finder(0, 14)) return null;
  return (x * 7 + y * 13 + x * y) % 3 === 0 ? [x, y] : null;
}).filter((module): module is [number, number] => module !== null);

function MiniQr({ className }: { className: string }) {
  return (
    <svg viewBox={`0 0 ${QR_SIZE} ${QR_SIZE}`} className={className} shapeRendering="crispEdges" aria-hidden>
      {[
        [0, 0],
        [14, 0],
        [0, 14],
      ].map(([fx, fy]) => (
        <g key={`${fx}-${fy}`} fill="#1c1712">
          <path d={`M${fx} ${fy}h7v7h-7zM${fx + 1} ${fy + 1}v5h5v-5z`} fillRule="evenodd" />
          <rect x={fx + 2} y={fy + 2} width="3" height="3" />
        </g>
      ))}
      {qrModules.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#1c1712" />
      ))}
    </svg>
  );
}

/** Un ticket de cuisine qui sort de l'imprimante. */
export function TicketVisual() {
  return (
    <div className="flex h-16 w-14 flex-col gap-1 rounded-sm bg-white px-1.5 pt-2 shadow-md shadow-black/20" aria-hidden>
      <span className="mx-auto h-1 w-7 rounded-full bg-neutral-800" />
      <span className="h-px border-t border-dashed border-neutral-300" />
      <span className="h-0.5 w-9 rounded-full bg-neutral-400" />
      <span className="h-0.5 w-7 rounded-full bg-neutral-400" />
      <span className="h-0.5 w-8 rounded-full bg-neutral-400" />
    </div>
  );
}

/** Une tablette en cuisine, la commande affichée. */
export function ScreenVisual() {
  return (
    <div className="flex h-14 w-20 items-center justify-center rounded-lg border-2 border-foreground/25 bg-surface-raised p-1" aria-hidden>
      <div className="grid h-full w-full grid-cols-2 gap-1">
        <span className="rounded-sm bg-ember-2/60" />
        <span className="rounded-sm bg-foreground/15" />
        <span className="rounded-sm bg-foreground/15" />
        <span className="rounded-sm bg-foreground/10" />
      </div>
    </div>
  );
}

/** La prise à l'arrière de l'imprimante, telle qu'on la voit. */
export function PortVisual({ kind }: { kind: "ethernet" | "wifi" | "usb" | "unsure" }) {
  return (
    <svg viewBox="0 0 64 44" className="h-11 w-16 text-foreground" fill="none" aria-hidden>
      <rect x="1" y="1" width="62" height="42" rx="6" className="fill-foreground/[0.06]" stroke="currentColor" strokeOpacity=".2" />
      {kind === "ethernet" && (
        <g stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
          <path d="M20 12h24v16h-6v4H26v-4h-6z" className="fill-background" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <path key={i} d={`M${24.5 + i * 3} 13.5v4`} strokeWidth="1" />
          ))}
        </g>
      )}
      {kind === "usb" && (
        <g stroke="currentColor" strokeWidth="1.6">
          <rect x="18" y="16" width="28" height="12" rx="1.5" className="fill-background" />
          <rect x="22" y="19" width="20" height="4" className="fill-foreground/40" strokeWidth="0" />
        </g>
      )}
      {kind === "wifi" && (
        <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-ember-2">
          <path d="M18 19a20 20 0 0 1 28 0" />
          <path d="M23 24.5a12 12 0 0 1 18 0" />
          <path d="M28 30a5 5 0 0 1 8 0" />
          <circle cx="32" cy="34" r="1.6" fill="currentColor" stroke="none" />
        </g>
      )}
      {kind === "unsure" && (
        <text x="32" y="30" textAnchor="middle" className="fill-muted font-display text-[20px]">?</text>
      )}
    </svg>
  );
}

/** Imprimante tickets réseau, un ticket qui sort. */
export function PrinterVisual() {
  return (
    <div className="relative flex w-36 flex-col items-center" aria-hidden>
      <div className="h-16 w-24 overflow-hidden">
        <div className="ticket-feed ticket-paper flex h-full flex-col gap-1 bg-white px-2 pt-2 font-mono text-[7px] leading-tight text-neutral-800">
          <p className="text-center text-[10px] font-bold">TABLE 7</p>
          <span className="border-t border-dashed border-neutral-300" />
          <p><b>2×</b> Tagliatelle</p>
          <p><b>1×</b> Burrata</p>
        </div>
      </div>
      <div className="relative h-20 w-36 rounded-2xl rounded-t-md border border-foreground/15 bg-surface-raised shadow-xl shadow-black/30">
        <div className="absolute inset-x-5 top-1.5 h-1 rounded-full bg-background" />
        <div className="absolute bottom-3.5 left-4 h-1.5 w-10 rounded-full bg-foreground/10" />
        <span className="led-breathe absolute bottom-3.5 right-4 size-1.5 rounded-full bg-ember-1 shadow-[0_0_8px_var(--ember-1)]" />
      </div>
    </div>
  );
}

/** Table vue de dessus et son Cachet, ou comptoir et son numéro. */
export function ServiceVisual({ service }: { service: Service }) {
  const table = (
    <div className="relative size-14 rounded-full border border-foreground/20 bg-foreground/[0.06]">
      <span className="absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-[3px] bg-white p-[2px] shadow">
        <MiniQr className="size-full" />
      </span>
    </div>
  );
  const counter = (
    <div className="flex flex-col items-center gap-1">
      <span className="rounded-md bg-white px-2 py-1 font-mono text-[10px] font-bold text-neutral-800 shadow">N° 42</span>
      <span className="h-3 w-16 rounded-sm border border-foreground/20 bg-foreground/[0.08]" />
    </div>
  );
  return (
    <div className={`flex h-16 items-center gap-3 ${service === "both" ? "scale-[0.62]" : ""}`} aria-hidden>
      {service !== "fast_food" && table}
      {service !== "restaurant" && counter}
    </div>
  );
}

/*
 * La salle, à l'échelle (1 cm ≈ 2 px à l'origine) : vitrine, comptoir et
 * son mur, table. Chaque support choisi s'y affiche à sa taille réelle relative ;
 * ceux qui ne le sont pas restent en pointillés.
 */
const SCALE = {
  sticker: "size-[44px] rounded-full",
  poster: "h-[84px] w-[60px] rounded-[3px]",
  cachet: "size-[16px] rounded-[2px]",
} satisfies Record<SupportId, string>;

function Support({
  id,
  active,
  focused,
  label,
  onFocus,
}: {
  id: SupportId;
  active: boolean;
  focused: boolean;
  label: string;
  onFocus: (id: SupportId) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onFocus(id)}
      aria-label={label}
      className={`relative flex items-center justify-center transition-all duration-500 ${SCALE[id]} ${
        active
          ? "bg-white shadow-lg shadow-black/30"
          : "border border-dashed border-foreground/25 bg-transparent"
      } ${focused ? "ring-2 ring-ember-1 ring-offset-2 ring-offset-surface" : ""}`}
    >
      {active &&
        (id === "poster" ? (
          <span className="flex size-full flex-col items-center gap-[8%] p-[12%]">
            <span className="h-[6%] w-[80%] rounded-full bg-neutral-800" />
            <span className="h-[3%] w-[55%] rounded-full bg-neutral-300" />
            <MiniQr className="mt-auto w-[78%]" />
          </span>
        ) : (
          <MiniQr className="size-[64%]" />
        ))}
      {focused && (
        <span className="pop absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold text-background">
          {label}
        </span>
      )}
    </button>
  );
}

export function SupportsScene({
  counts,
  focus,
  labels,
  onFocus,
}: {
  counts: Record<SupportId, number>;
  focus: SupportId;
  labels: Record<SupportId, string>;
  onFocus: (id: SupportId) => void;
}) {
  const props = (id: SupportId) => ({
    id,
    active: counts[id] > 0,
    focused: focus === id,
    label: labels[id],
    onFocus,
  });
  return (
    <div className="relative h-56 overflow-hidden rounded-2xl border border-hairline bg-foreground/[0.04]">
      <div className="qr-motif absolute inset-0 opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 h-6 border-t border-foreground/15 bg-foreground/[0.06]" aria-hidden />

      <div className="absolute bottom-6 left-[4%] flex h-40 w-[22%] items-center justify-center rounded-t-lg border border-b-0 border-foreground/15 bg-[linear-gradient(135deg,transparent_45%,rgba(255,255,255,.06)_50%,transparent_55%)]">
        <Support {...props("sticker")} />
        <span className="absolute -bottom-5 text-[9px] uppercase tracking-widest text-faint">Vitrine</span>
      </div>

      <div className="absolute bottom-6 left-[36%] flex w-[34%] flex-col items-center">
        <div className="mb-3">
          <Support {...props("poster")} />
        </div>
        <div className="h-[72px] w-full rounded-t-md border border-b-0 border-foreground/20 bg-surface-raised" aria-hidden />
        <span className="absolute -bottom-5 text-[9px] uppercase tracking-widest text-faint">Comptoir</span>
      </div>

      <div className="absolute bottom-6 right-[4%] flex w-[16%] flex-col items-center">
        <div className="flex h-2 w-full items-start justify-center rounded-sm bg-foreground/25">
          <span className="-mt-[14px]">
            <Support {...props("cachet")} />
          </span>
        </div>
        <div className="flex w-[70%] justify-between" aria-hidden>
          <span className="h-[48px] w-1 bg-foreground/20" />
          <span className="h-[48px] w-1 bg-foreground/20" />
        </div>
        <span className="absolute -bottom-5 text-[9px] uppercase tracking-widest text-faint">Table</span>
      </div>
    </div>
  );
}

/** Le support en gros plan, avec un vrai QR qui ouvre la carte de démo. */
export function SupportCloseUp({ id, label }: { id: SupportId; label: string }) {
  const qr = (size: string) => (
    <div className="rounded-md bg-white p-1.5">
      <QrLive path={qrShowcase.qrPath} alt="" className={`${size} rounded`} />
    </div>
  );
  return (
    <div key={id} className="rise flex h-48 items-center justify-center" aria-hidden>
      {id === "cachet" && (
        <div className="w-32 rotate-3 rounded-2xl border border-hairline bg-surface-raised p-3 text-center shadow-xl shadow-black/30">
          <p className="ember-text text-[9px] font-bold uppercase tracking-[0.22em]">{label}</p>
          <div className="mx-auto mt-2 w-fit">{qr("size-16")}</div>
          <p className="mt-2 font-display text-sm font-semibold">Table 12</p>
        </div>
      )}
      {id === "poster" && (
        <div className="flex h-44 w-32 flex-col items-center gap-2 rounded-md bg-white p-3 text-neutral-900 shadow-xl shadow-black/30">
          <p className="font-display text-[15px] font-semibold leading-tight">Commandez d’ici</p>
          <p className="text-[9px] uppercase tracking-widest text-neutral-500">Scannez, payez, on vous appelle</p>
          <div className="mt-auto">{qr("size-16")}</div>
          <p className="text-[8px] text-neutral-400">Votre logo</p>
        </div>
      )}
      {id === "sticker" && (
        <div className="flex size-40 flex-col items-center justify-center gap-1.5 rounded-full border border-white/40 bg-white/90 text-neutral-900 shadow-xl shadow-black/30">
          <p className="text-[9px] font-bold uppercase tracking-widest">Commandez</p>
          {qr("size-14")}
          <p className="text-[8px] text-neutral-500">avant d’entrer</p>
        </div>
      )}
    </div>
  );
}
