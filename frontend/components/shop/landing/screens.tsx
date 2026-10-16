"use client";

import Image from "next/image";
import { useState } from "react";
import { BrowserFrame } from "@/components/landing/browser-frame";
import { KitHeading } from "@/components/landing-kit/heading";
import { Reveal } from "@/components/landing-kit/reveal";
import { screensSection } from "@/lib/shop-landing-data";

/*
 * Les vrais écrans, par onglet : la capture ordinateur dans une fenêtre de
 * navigateur, la capture téléphone posée par-dessus dans l'angle. Changer
 * d'onglet rejoue l'entrée (clé sur l'onglet).
 */
export function ShopScreens() {
  const { tabs } = screensSection;
  const [activeId, setActiveId] = useState(tabs[0].id);
  const tab = tabs.find((t) => t.id === activeId) ?? tabs[0];

  return (
    <section id={screensSection.id} className="scroll-mt-20 overflow-hidden border-y border-hairline bg-surface/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-10 lg:py-28">
        <KitHeading eyebrow={screensSection.eyebrow} title={screensSection.title} subtitle={screensSection.subtitle} />

        <Reveal className="mt-10">
          <div role="tablist" aria-label={screensSection.eyebrow} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`ecran-${t.id}`}
                aria-selected={t.id === tab.id}
                aria-controls="ecran-panneau"
                onClick={() => setActiveId(t.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  t.id === tab.id ? "ember-gradient text-background" : "border border-hairline text-muted hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="mt-5 max-w-2xl text-pretty text-sm leading-relaxed text-muted lg:text-base">{tab.caption}</p>
        </Reveal>

        <div id="ecran-panneau" role="tabpanel" aria-labelledby={`ecran-${tab.id}`} className="relative mt-8 pb-10 sm:pb-16 lg:pr-24">
          <div key={tab.id} className="animate-[kit-rise_0.6s_cubic-bezier(0.2,0.7,0.2,1)_both] motion-reduce:animate-none">
            <BrowserFrame url={tab.url}>
              <Image src={tab.desktop.src} alt={tab.desktop.alt} width={1600} height={1000} sizes="(max-width: 1024px) 100vw, 1000px" className="block h-auto w-full" />
            </BrowserFrame>
          </div>
          {"mobile" in tab && tab.mobile && (
            <div
              key={`${tab.id}-m`}
              className="absolute -bottom-2 right-2 w-[38%] max-w-[15rem] sm:w-[30%] animate-[kit-rise_0.7s_0.15s_cubic-bezier(0.2,0.7,0.2,1)_both] motion-reduce:animate-none sm:right-6 lg:-right-2"
            >
              <div className="rounded-[1.6rem] bg-[#1c1712] p-1.5 shadow-2xl shadow-black/50 ring-1 ring-white/10 sm:rounded-[2.2rem] sm:p-2">
                <Image src={tab.mobile.src} alt={tab.mobile.alt} width={780} height={1688} sizes="240px" className="block h-auto w-full rounded-[1.2rem] sm:rounded-[1.7rem]" />
              </div>
            </div>
          )}
        </div>
        {"note" in tab && <p className="mt-6 text-xs text-faint">{tab.note}</p>}
      </div>
    </section>
  );
}
