import type { Metadata } from "next";
import { AgentsControl } from "@/components/agents/control";
import { AgentsFaq } from "@/components/agents/faq";
import { AgentsFinalCta } from "@/components/agents/final-cta";
import { AgentsFooter } from "@/components/agents/footer";
import { AgentsHero } from "@/components/agents/hero";
import { AgentsHowItWorks } from "@/components/agents/how-it-works";
import { AgentsNav } from "@/components/agents/nav";
import { agentsBrand, seo } from "@/lib/agents-landing-data";
import { agentsSiteUrl } from "@/lib/site";

// Canonical absolu : la réécriture du proxy rend cette page accessible à la
// fois sur agents.ominin.com et ominin.com/agents — une seule URL fait foi.
export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  alternates: { canonical: agentsSiteUrl },
  openGraph: {
    title: seo.title,
    description: seo.description,
    type: "website",
    siteName: agentsBrand,
    locale: "fr_FR",
    url: agentsSiteUrl,
    images: [{ url: "/logo.png", width: 512, height: 512, alt: agentsBrand }],
  },
  twitter: {
    card: "summary_large_image",
    title: seo.title,
    description: seo.description,
    images: ["/logo.png"],
  },
};

export default function AgentsHome() {
  return (
    <>
      <AgentsNav />
      <main>
        <AgentsHero />
        <AgentsHowItWorks />
        <AgentsControl />
        <AgentsFinalCta />
        <AgentsFaq />
      </main>
      <AgentsFooter />
    </>
  );
}
