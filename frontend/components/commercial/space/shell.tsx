"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, type CSSProperties } from "react";
import { ChartIcon, MapPinIcon, PresentationIcon } from "@/components/admin/icons";
import { LogoutIcon, PaymentsIcon, TeamIcon } from "@/components/gestion/icons";
import { Mesh, Notice } from "@/components/gestion/ui";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ToastProvider } from "@/components/ui/toast";
import type { CommercialAccount } from "@/lib/commercial/api";
import { frenchDate } from "@/lib/legal/format";
import { commercialPrefix } from "@/lib/site";
import { signOut } from "../shell";
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
  { path: "/tableau", label: "Tableau", icon: ChartIcon },
  { path: "/carte", label: "Carte", icon: MapPinIcon },
  { path: "/ressources", label: "Ressources", icon: PresentationIcon },
  { path: "/argent", label: "Argent", icon: PaymentsIcon, afterEnd: true },
];

const COMPTE: Tab = { path: "/compte", label: "Mon compte", icon: TeamIcon, afterEnd: true };

function Brand({ small = false }: { small?: boolean }) {
  return (
    <Link href={spaceHref("/tableau")} className={`g-brand ${small ? "g-brand-sm" : ""}`} title="Tableau">
      <span className="ember-text font-display font-semibold">Ominin</span>
      <small className={small ? "max-sm:hidden" : ""}>Commercial</small>
    </Link>
  );
}

/*
 * Coque de l'espace : rail de verre dès 1024 px, barre haute, bandeaux du
 * contrat, et la barre d'onglets flottante au téléphone — l'outil se tient
 * d'une main, dehors. Après la fin du contrat, seuls l'argent et le compte
 * restent (article 8).
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
  const name = [account.first_name, account.last_name].filter(Boolean).join(" ") || account.email;
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
  const activeIndex = [...tabs, COMPTE].findIndex(isActive);
  // La pilule active glisse d'une entrée du rail à l'autre : sa position se
  // calcule en jetons (hauteur d'entrée, gouttière, rangée « Compte »).
  const pillStyle =
    activeIndex >= 0
      ? ({
          "--g-nav-y": `calc(${activeIndex} * (var(--g-nav-h) + var(--g-nav-gap))${
            activeIndex >= tabs.length ? " + var(--g-nav-group-h) + var(--g-nav-gap)" : ""
          })`,
        } as CSSProperties)
      : undefined;

  const railLink = (tab: Tab, index: number) => (
    <Link
      key={tab.path}
      href={spaceHref(tab.path)}
      aria-current={isActive(tab) ? "page" : undefined}
      className="g-nav-item g-rise"
      style={{ "--g-i": index } as CSSProperties}
    >
      <tab.icon />
      {tab.label}
    </Link>
  );

  return (
    <AccountContext.Provider value={account}>
      <ToastProvider placement="top">
        <Mesh />
        <div className="g-shell g-titres">
          <aside className="g-rail g-glass">
            <Brand />
            <nav aria-label="Sections" className="g-nav">
              {pillStyle && <span className="g-nav-pill" style={pillStyle} aria-hidden />}
              {tabs.map(railLink)}
              <div className="g-nav-group">
                <span className="g-eyebrow">Compte</span>
              </div>
              {railLink(COMPTE, tabs.length + 1)}
            </nav>
            <div className="mt-auto grid gap-2 pt-3">
              <button type="button" onClick={() => void signOut()} className="g-nav-item">
                <LogoutIcon />
                Se déconnecter
              </button>
            </div>
          </aside>

          <div className="g-col">
            <header className="g-topbar g-glass">
              <div className="g-who">
                <Link href={spaceHref("/compte")} aria-label="Mon compte" className="g-venue-logo ember-gradient text-background">
                  {initials}
                </Link>
                <b className="truncate font-display text-g-name">{name}</b>
              </div>
              <ThemeToggle />
              <span className="lg:hidden max-sm:hidden">
                <Brand small />
              </span>
            </header>

            <main className="w-full min-w-0 max-w-xl flex-1 px-[var(--g-topbar-mx-sm)] pb-[calc(var(--g-tab-h)+2*var(--g-tabbar-pad-y)+var(--g-tabbar-bottom)+var(--g-gap))] pt-5 max-lg:mx-auto lg:px-[var(--g-topbar-mx)] lg:pb-16">
              <div className="flex flex-col gap-g-gap empty:hidden">
                {account.ended ? (
                  <Notice
                    tone="info"
                    title="Contrat terminé"
                    text="Vos relevés, vos paiements et votre contrat restent ici ; les restaurants et leurs interlocuteurs ne vous sont plus accessibles."
                  />
                ) : (
                  <>
                    {!account.signed_in_force && (
                      <Notice
                        tone="info"
                        title="Nouvelle version du contrat"
                        text="Une nouvelle version est à signer."
                        action={
                          <Link href={`${spaceHref("/compte")}#signer`} className="g-btn g-btn-primary g-press">
                            Lire et signer
                          </Link>
                        }
                      />
                    )}
                    {account.notice_given_at && account.contract_end && (
                      <Notice
                        tone="info"
                        title="Résiliation enregistrée"
                        text={`Votre contrat prend fin le ${frenchDate(account.contract_end)}. Vous travaillez vos restaurants jusque-là ; un restaurant qui devient client après cette date ne vous ouvre plus de commission.`}
                      />
                    )}
                  </>
                )}
              </div>
              <div className="mt-5 first:mt-0">{children}</div>
            </main>
          </div>

          <nav
            aria-label="Sections"
            className="g-tabbar g-glass"
            style={{ "--g-tabs": tabs.length } as CSSProperties}
          >
            {tabs.map((tab) => (
              <Link
                key={tab.path}
                href={spaceHref(tab.path)}
                aria-current={isActive(tab) ? "page" : undefined}
                className="g-tab"
              >
                <tab.icon />
                <span>{tab.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </ToastProvider>
    </AccountContext.Provider>
  );
}
