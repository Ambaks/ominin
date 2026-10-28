"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { MapPinIcon, PresentationIcon } from "@/components/admin/icons";
import { PaymentsIcon } from "@/components/gestion/icons";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ToastProvider } from "@/components/ui/toast";
import type { CommercialAccount } from "@/lib/commercial/api";
import { frenchDate } from "@/lib/legal/format";
import { commercialPrefix } from "@/lib/site";
import { clearDeviceData } from "./device";
import { COMMERCIAL_PUSH } from "./notifications";

const AccountContext = createContext<CommercialAccount | null>(null);

export function useAccount(): CommercialAccount {
  const account = useContext(AccountContext);
  if (!account) throw new Error("useAccount hors de l'espace commercial.");
  return account;
}

/** Chemin public d'un écran de l'espace (sous-domaine ou /commercial). */
export const spaceHref = (path: string) => `${commercialPrefix}/espace${path}`;

interface Tab {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Ouvert après la fin du contrat (art. 8 : argent, relevés, contrat). */
  afterEnd?: boolean;
}

const TABS: Tab[] = [
  { path: "/carte", label: "Carte", icon: MapPinIcon },
  { path: "/ressources", label: "Ressources", icon: PresentationIcon },
  { path: "/argent", label: "Argent", icon: PaymentsIcon, afterEnd: true },
];

function Banner({ children, href }: { children: React.ReactNode; href?: string }) {
  const body = (
    <p className="rounded-2xl border border-ember-2/30 bg-ember-2/10 px-4 py-3 text-sm leading-relaxed">
      {children}
    </p>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

/*
 * Coque de l'espace : en-tête (marque, compte), bandeaux du contrat, et la
 * barre du bas — l'outil se tient d'une main, dehors. Après la fin du
 * contrat, seuls l'argent et le compte restent (article 8).
 */
export function SpaceShell({
  account,
  children,
}: {
  account: CommercialAccount;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const tabs = TABS.filter((tab) => !account.ended || tab.afterEnd);
  const initials =
    [account.first_name, account.last_name]
      .map((part) => part?.[0])
      .filter(Boolean)
      .join("")
      .toUpperCase() || account.email[0].toUpperCase();

  useEffect(() => {
    // Article 6.5 : fin du contrat, les données des prospects quittent l'appareil.
    if (account.ended) clearDeviceData();
    // Le worker garde le deck pour le montrer hors ligne, et porte les notifications.
    else if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register(COMMERCIAL_PUSH.worker!, { scope: COMMERCIAL_PUSH.scope });
    }
  }, [account.ended]);

  const isActive = (tab: Tab) => {
    const href = spaceHref(tab.path);
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <AccountContext.Provider value={account}>
      <ToastProvider>
        <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pb-28">
          <header className="sticky top-0 z-30 -mx-4 flex items-center justify-between gap-3 border-b border-hairline bg-background/90 px-4 py-3 backdrop-blur-md">
            <Wordmark suffix="Commercial" />
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link href={spaceHref("/compte")} aria-label="Mon compte" className="-m-1 grid size-11 place-items-center">
                <span className="ember-gradient grid size-9 place-items-center rounded-full text-xs font-bold text-background">
                  {initials}
                </span>
              </Link>
            </div>
          </header>

          <div className="mt-4 flex flex-col gap-2 empty:hidden">
            {account.ended ? (
              <Banner>
                Votre contrat est terminé. Vos relevés, vos paiements et votre
                contrat restent ici ; les restaurants et leurs interlocuteurs ne
                vous sont plus accessibles.
              </Banner>
            ) : (
              <>
                {!account.signed_in_force && (
                  <Banner href={`${spaceHref("/compte")}#signer`}>
                    Une nouvelle version du contrat est à signer : sans elle,
                    vous travaillez vos restaurants mais n’en déclarez pas de
                    nouveaux. <span className="font-semibold underline">Lire et signer</span>
                  </Banner>
                )}
                {account.notice_given_at && account.contract_end && (
                  <Banner>
                    Résiliation enregistrée : votre contrat prend fin le{" "}
                    {frenchDate(account.contract_end)}. Vos réservations restent
                    valables jusque-là ; un restaurant qui s’inscrit après cette date ne vous ouvre plus de commission.
                  </Banner>
                )}
              </>
            )}
          </div>

          <main className="mt-5 flex-1">{children}</main>
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-background/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-xl items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
            {tabs.map((tab) => {
              const active = isActive(tab);
              return (
                <Link
                  key={tab.path}
                  href={spaceHref(tab.path)}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium ${
                    active ? "text-ember-1" : "text-faint"
                  }`}
                >
                  <tab.icon className="size-5" />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </ToastProvider>
    </AccountContext.Provider>
  );
}
