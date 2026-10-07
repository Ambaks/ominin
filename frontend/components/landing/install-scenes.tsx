import { installSection } from "@/lib/landing-data";
import { formatPrice } from "@/lib/menu-data";
import { OnPartnerChange, PartnerText } from "./integration-showcase";

const { order, integrations } = installSection;
const partnerScreens = integrations.partners.map(
  (partner) => integrations.screens[partner.kind]
);
const screenLists = partnerScreens.map((screen) => screen.list);
const screenStatuses = partnerScreens.map(
  (screen) => screen.status ?? order.paidLabel
);

/*
 * Le boîtier Omilink relié à une imprimante tickets : le câble pulse, le
 * ticket de la commande sort par à-coups (.ticket-feed). Le papier garde ses
 * couleurs de papier dans les deux thèmes.
 */
export function OmilinkScene() {
  return (
    <div
      className="relative flex h-64 items-end justify-center overflow-hidden rounded-2xl border border-hairline bg-foreground/[0.05] pb-7"
      aria-hidden
    >
      <div className="qr-motif absolute inset-0 [mask-image:radial-gradient(ellipse_70%_80%_at_50%_100%,black,transparent)]" />
      <div className="ember-glow absolute inset-0 rotate-180" />
      <div className="absolute inset-x-8 bottom-7 h-px bg-linear-to-r from-transparent via-foreground/15 to-transparent" />

      <div className="relative flex origin-bottom items-end max-sm:scale-90">
        <div className="relative z-10 h-[4.5rem] w-28 rounded-xl border border-foreground/15 bg-surface-raised shadow-xl shadow-black/30">
          <div className="absolute inset-x-3 top-0 h-px bg-linear-to-r from-transparent via-foreground/25 to-transparent" />
          <span className="led-breathe absolute left-3 top-3 size-1.5 rounded-full bg-ember-1 shadow-[0_0_8px_var(--ember-1)]" />
          <div className="absolute right-3 top-3 flex flex-col gap-[3px]">
            <span className="h-px w-5 bg-foreground/15" />
            <span className="h-px w-5 bg-foreground/15" />
            <span className="h-px w-5 bg-foreground/15" />
          </div>
          <p className="absolute bottom-2.5 left-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-muted">
            Omilink
          </p>
        </div>

        <svg
          viewBox="0 0 64 40"
          className="-mx-1.5 h-10 w-16 shrink-0 text-ember-2"
          fill="none"
        >
          <path
            d="M0 14C18 38 46 38 64 14"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="cable-flow"
          />
        </svg>

        <div className="relative z-10 flex w-32 flex-col items-center">
          <div className="h-28 w-24 overflow-hidden">
            <div className="ticket-feed ticket-paper flex h-full flex-col gap-1 bg-white px-2 pb-2 pt-3 font-mono text-[7px] leading-tight text-neutral-800">
              <p className="text-center text-[11px] font-bold tracking-wide">
                {order.table.toUpperCase()}
              </p>
              <p className="text-center text-neutral-500">
                {order.time} · {order.origin}
              </p>
              <span className="border-t border-dashed border-neutral-300" />
              {order.lines.map((line) => (
                <p key={line.name} className="truncate">
                  <span className="font-bold">{line.quantity}×</span>{" "}
                  {line.name}
                </p>
              ))}
              <span className="mt-auto border-t border-dashed border-neutral-300" />
              <p className="text-center font-bold uppercase tracking-wider">
                {order.paidLabel}
              </p>
            </div>
          </div>
          <div className="relative h-[4.25rem] w-32 rounded-xl rounded-t-md border border-foreground/15 bg-surface-raised shadow-xl shadow-black/30">
            <div className="absolute inset-x-4 top-1.5 h-1 rounded-full bg-background" />
            <div className="absolute bottom-3 left-3 h-1.5 w-8 rounded-full bg-foreground/10" />
            <span className="absolute bottom-3 right-3 size-1.5 rounded-full bg-ember-1/80" />
          </div>
        </div>
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
 * Une caisse et son terminal : la commande Ominin en tête de file, déjà
 * payée, s'allume à chaque partenaire (.till-ping) ; son détail, à droite,
 * ne bouge pas — seul son statut change avec le partenaire. L'écran
 * porte le nom du partenaire en cours ; pour un prestataire de paiement,
 * c'est la liste des encaissements qu'il montre. L'interface est une
 * évocation, en blanc et noir — celle d'aucune marque en particulier.
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
                <PartnerText
                  values={integrations.names}
                  className="text-[8px] font-bold tracking-tight"
                />
                <span className="text-[7px] tabular-nums text-neutral-400">
                  {order.time}
                </span>
              </div>
              <div className="flex min-h-0 flex-1">
                <div className="w-[42%] border-r border-neutral-200 bg-neutral-50 p-2">
                  <p className="text-[7px] font-semibold uppercase tracking-wider text-neutral-400">
                    <PartnerText values={screenLists} />
                  </p>
                  <div className="mt-1.5 overflow-hidden">
                    <div className="flex flex-col gap-1">
                      <OnPartnerChange>
                        <div className="till-ping flex h-6 items-center justify-between rounded-md bg-neutral-900 px-1.5 text-[8px] font-semibold text-white">
                          {order.table}
                          <span className="rounded-sm bg-white/20 px-1 text-[6px] font-medium">
                            {order.origin}
                          </span>
                        </div>
                      </OnPartnerChange>
                      {order.queue.map((table) => (
                        <div
                          key={table}
                          className="flex h-6 items-center rounded-md border border-neutral-200 bg-white px-1.5 text-[8px] text-neutral-500"
                        >
                          {table}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex min-w-0 flex-1 flex-col p-2.5">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[11px] font-bold">{order.table}</p>
                    <PartnerText
                      values={screenStatuses}
                      className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-center text-[6.5px] font-semibold text-emerald-700"
                    />
                  </div>
                  <ul className="mt-2 flex flex-col gap-1 text-[7.5px] text-neutral-600">
                    {order.lines.map((line) => (
                      <li key={line.name} className="truncate">
                        <span className="font-semibold text-neutral-900">
                          {line.quantity}×
                        </span>{" "}
                        {line.name}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto flex justify-between border-t border-neutral-200 pt-1.5 text-[11px] font-bold">
                    <span>Total</span>
                    <span>{formatPrice(order.total)}</span>
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
