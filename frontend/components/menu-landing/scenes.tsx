import { OnPartnerChange, PartnerText } from "@/components/landing/integration-showcase";
import { connectSection } from "@/lib/menu-landing-data";
import { formatPrice } from "@/lib/menu/format";

/*
 * Les scènes de « Paiement et caisse », reprises de l'ancienne section
 * Installation (classes .ticket-feed, .cable-flow, .till-ping de globals.css,
 * cadence --install-cycle de .install-scene) et rapportées à ce qu'on y dit :
 * la table 6 paie sur son téléphone et le ticket sort en cuisine (Stripe),
 * puis la commande, déjà réglée, s'allume dans la caisse du restaurant,
 * quelle qu'elle soit (HubRise). Décoratives : le texte de la carte dit tout.
 */

const { order } = connectSection;
const total = formatPrice(order.total);

function Ticket() {
  return (
    <div className="relative z-10 flex w-32 flex-col items-center">
      <div className="h-28 w-24 overflow-hidden">
        <div className="ticket-feed ticket-paper flex h-full flex-col gap-1 bg-white px-2 pb-2 pt-3 font-mono text-[7px] leading-tight text-neutral-800">
          <p className="text-center text-[11px] font-bold tracking-wide">{order.table.toUpperCase()}</p>
          <p className="text-center text-neutral-500">
            {order.time} · {order.origin}
          </p>
          <span className="border-t border-dashed border-neutral-300" />
          {order.lines.map((line) => (
            <p key={line.name} className="truncate">
              <span className="font-bold">{line.quantity}×</span> {line.name}
            </p>
          ))}
          <span className="mt-auto border-t border-dashed border-neutral-300" />
          <p className="text-center font-bold uppercase tracking-wider">{order.paid}</p>
        </div>
      </div>
      <div className="relative h-[4.25rem] w-32 rounded-xl rounded-t-md border border-foreground/15 bg-surface-raised shadow-xl shadow-black/30">
        <div className="absolute inset-x-4 top-1.5 h-1 rounded-full bg-background" />
        <div className="absolute bottom-3 left-3 h-1.5 w-8 rounded-full bg-foreground/10" />
        <span className="led-breathe absolute bottom-3 right-3 size-1.5 rounded-full bg-ember-1 shadow-[0_0_8px_var(--ember-1)]" />
      </div>
    </div>
  );
}

/** Le téléphone de la table paie (le bouton passe à « Payée »), le câble porte la commande, le ticket sort. */
export function PaymentScene() {
  return (
    <div
      className="install-scene relative flex h-64 items-end justify-center overflow-hidden rounded-2xl border border-hairline bg-foreground/[0.05] pb-7"
      aria-hidden
    >
      <div className="qr-motif absolute inset-0 [mask-image:radial-gradient(ellipse_70%_80%_at_50%_100%,black,transparent)]" />
      <div className="ember-glow absolute inset-0 rotate-180" />
      <div className="absolute inset-x-8 bottom-7 h-px bg-linear-to-r from-transparent via-foreground/15 to-transparent" />

      <div className="relative flex origin-bottom items-end max-sm:scale-90">
        <div className="relative z-10 w-[6.75rem] rounded-[18px] bg-neutral-900 p-1 shadow-xl shadow-black/30">
          <div className="flex h-[12.5rem] flex-col rounded-[14px] bg-white px-2 pb-2 pt-3 text-neutral-900">
            <p className="text-[10px] font-bold">{order.sheet}</p>
            <p className="text-[7px] text-neutral-500">{order.table}</p>
            <ul className="mt-2 flex flex-col gap-1 text-[7px] text-neutral-600">
              {order.lines.map((line) => (
                <li key={line.name} className="truncate">
                  <span className="font-semibold text-neutral-900">{line.quantity}×</span> {line.name}
                </li>
              ))}
            </ul>
            <div className="mt-auto flex justify-between border-t border-neutral-200 pt-1.5 text-[10px] font-bold">
              <span>Total</span>
              <span>{total}</span>
            </div>
            <div className="menu-pay-press mt-1.5 grid h-6 text-[8px] font-semibold text-white">
              <span className="col-start-1 row-start-1 flex items-center justify-center rounded-full bg-neutral-900">
                {order.pay} · {total}
              </span>
              <span className="menu-pay-done col-start-1 row-start-1 flex items-center justify-center gap-1 rounded-full bg-emerald-600">
                ✓ {order.done}
              </span>
            </div>
          </div>
        </div>

        <svg viewBox="0 0 64 40" className="-mx-1.5 h-10 w-16 shrink-0 text-ember-2" fill="none">
          <path d="M0 14C18 38 46 38 64 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="cable-flow" />
        </svg>

        <Ticket />
      </div>
    </div>
  );
}

/** Ondes du sans-contact : le terminal ne porte la marque de personne. */
function ContactlessMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M8.5 7.5a6.5 6.5 0 0 1 0 9M12 5a10 10 0 0 1 0 14M15.5 2.5a13.5 13.5 0 0 1 0 19M5 10a3 3 0 0 1 0 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

/*
 * Une caisse et son terminal, en noir et blanc, celle d'aucune marque :
 * l'écran prend le nom de la caisse qui défile, et la commande Ominin, en
 * tête de file et déjà réglée, s'y allume à chaque caisse (.till-ping).
 */
export function TillScene() {
  return (
    <div
      className="relative flex h-64 items-end justify-center overflow-hidden rounded-2xl border border-background/10 bg-background/[0.07] pb-7"
      aria-hidden
    >
      <div className="absolute inset-x-8 bottom-7 h-px bg-linear-to-r from-transparent via-background/20 to-transparent" />

      <div className="relative flex origin-bottom items-end max-sm:scale-90">
        <div className="flex flex-col items-center">
          <div className="w-56 rounded-[14px] bg-neutral-900 p-1.5 shadow-2xl shadow-black/40 sm:w-64">
            <div className="flex h-40 flex-col overflow-hidden rounded-[9px] bg-white text-neutral-900">
              <div className="flex h-5 shrink-0 items-center justify-between border-b border-neutral-200 px-2">
                <PartnerText values={connectSection.hubrise.cycle.names} className="text-[8px] font-bold tracking-tight" />
                <span className="text-[7px] tabular-nums text-neutral-400">{order.time}</span>
              </div>
              <div className="flex min-h-0 flex-1">
                <div className="w-[42%] border-r border-neutral-200 bg-neutral-50 p-2">
                  <p className="text-[7px] font-semibold uppercase tracking-wider text-neutral-400">{order.list}</p>
                  <div className="mt-1.5 flex flex-col gap-1">
                    <OnPartnerChange>
                      <div className="till-ping flex h-6 items-center justify-between rounded-md bg-neutral-900 px-1.5 text-[8px] font-semibold text-white">
                        {order.table}
                        <span className="rounded-sm bg-white/20 px-1 text-[6px] font-medium">{order.origin}</span>
                      </div>
                    </OnPartnerChange>
                    {order.queue.map((table) => (
                      <div key={table} className="flex h-6 items-center rounded-md border border-neutral-200 bg-white px-1.5 text-[8px] text-neutral-500">
                        {table}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex min-w-0 flex-1 flex-col p-2.5">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[11px] font-bold">{order.table}</p>
                    <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-center text-[6.5px] font-semibold text-emerald-700">
                      {order.paid}
                    </span>
                  </div>
                  <ul className="mt-2 flex flex-col gap-1 text-[7.5px] text-neutral-600">
                    {order.lines.map((line) => (
                      <li key={line.name} className="truncate">
                        <span className="font-semibold text-neutral-900">{line.quantity}×</span> {line.name}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto flex justify-between border-t border-neutral-200 pt-1.5 text-[11px] font-bold">
                    <span>Total</span>
                    <span>{total}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="h-4 w-14 bg-linear-to-b from-neutral-400 to-neutral-200" />
          <div className="h-2 w-36 rounded-full bg-neutral-100 shadow-lg shadow-black/30" />
        </div>

        <div className="ml-2 w-[3.25rem] shrink-0 rounded-xl bg-neutral-100 p-1 shadow-xl shadow-black/40">
          <div className="flex h-[4.5rem] items-center justify-center rounded-lg bg-neutral-900 text-white">
            <ContactlessMark className="size-4" />
          </div>
          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}

const { scene } = connectSection.terminal;

/*
 * Le terminal : la carte se pose sur l'écran, qui passe d'un coup à
 * « Approuvé », et le paiement entre en tête du flux de paiements d'Ominin,
 * à la place de la ligne « en attente », au milieu de ceux du QR ; la barre
 * du jour monte avec lui (.menu-card-tap, .menu-term-idle, .menu-term-ok,
 * .menu-term-wait, .menu-term-row, .menu-bar-grow de menu-landing.css,
 * cadence --install-cycle). Plus grande que les deux
 * autres scènes : elle a toute une demi-largeur.
 */
export function TerminalScene() {
  const last = scene.bars.length - 1;
  return (
    <div
      className="install-scene relative flex h-56 items-end justify-center overflow-hidden rounded-2xl border border-hairline bg-foreground/[0.05] pb-6 sm:h-80 sm:pb-8"
      aria-hidden
    >
      <div className="qr-motif absolute inset-0 [mask-image:radial-gradient(ellipse_70%_80%_at_50%_100%,black,transparent)]" />
      <div className="ember-glow absolute inset-0 rotate-180" />
      <div className="absolute inset-x-8 bottom-8 h-px bg-linear-to-r from-transparent via-foreground/15 to-transparent" />

      <div className="relative flex origin-bottom items-end max-sm:scale-[0.74]">
        <div className="relative z-10">
          <span className="menu-card-tap absolute -top-6 left-1/2 z-20 h-11 w-[4.25rem] -translate-x-1/2 rounded-lg ember-gradient shadow-lg shadow-black/30">
            <span className="absolute left-2.5 top-3 h-2.5 w-3 rounded-[3px] bg-white/70" />
          </span>
          <div className="w-32 rounded-[22px] bg-neutral-100 p-2 shadow-xl shadow-black/30">
            <div className="grid h-44 overflow-hidden rounded-2xl bg-neutral-900 text-white">
              <div className="menu-term-idle col-start-1 row-start-1 flex flex-col items-center justify-center gap-1.5 p-3 text-center">
                <span className="text-[11px] text-neutral-400">{order.table}</span>
                <span className="text-xl font-bold tabular-nums">{total}</span>
                <ContactlessMark className="led-breathe mt-1 size-7 text-neutral-300" />
                <span className="text-[10px] leading-tight text-neutral-400">{scene.prompt}</span>
              </div>
              <div className="menu-term-ok col-start-1 row-start-1 flex flex-col items-center justify-center gap-1.5 bg-emerald-600 text-center">
                <span className="flex size-10 items-center justify-center rounded-full bg-white/20 text-lg">✓</span>
                <span className="text-sm font-semibold">{scene.approved}</span>
                <span className="text-xs tabular-nums opacity-80">{total}</span>
              </div>
            </div>
            <div className="h-6" />
          </div>
        </div>

        <svg viewBox="0 0 64 40" className="-mx-2 h-12 w-16 shrink-0 text-ember-2" fill="none">
          <path d="M0 14C18 38 46 38 64 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="cable-flow" />
        </svg>

        <div className="relative z-10 w-52 rounded-2xl bg-white p-3 text-neutral-900 shadow-xl shadow-black/30">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-1.5">
            <span className="text-xs font-bold">{scene.feed}</span>
            <span className="text-[10px] tabular-nums text-neutral-400">{order.time}</span>
          </div>
          <ul className="mt-2 flex flex-col">
            {scene.rows.map((row) => (
              <li key={row.ref} className={row.fresh ? "grid" : "pt-1.5"}>
                {row.fresh && (
                  <div className="menu-term-wait col-start-1 row-start-1 flex h-(--menu-feed-row) items-center rounded-lg border border-dashed border-neutral-400 px-2 text-[11px] text-neutral-500">
                    {row.label} · {scene.waiting}
                  </div>
                )}
                <div
                  className={`flex h-(--menu-feed-row) items-center justify-between rounded-lg px-2 text-[11px] ${
                    row.fresh ? "menu-term-row col-start-1 row-start-1 bg-neutral-900 text-white" : "border border-neutral-200 text-neutral-600"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className={`rounded px-1.5 py-px text-[9px] font-semibold ${row.fresh ? "bg-white/20" : "bg-neutral-100"}`}>{row.label}</span>
                    {row.ref}
                  </span>
                  <span className="font-semibold tabular-nums">{formatPrice(row.amount)}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-2.5 flex h-12 items-end gap-1.5 border-t border-neutral-200 pt-2">
            {scene.bars.map((height, i) => (
              <span
                key={i}
                className={`flex-1 rounded-t ${i === last ? "menu-bar-grow bg-emerald-500" : "bg-neutral-200"}`}
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
          <p className="mt-1 text-[10px] text-neutral-500">{scene.chart}</p>
        </div>
      </div>
    </div>
  );
}
