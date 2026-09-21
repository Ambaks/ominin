"use client";

import { useRouter } from "next/navigation";
import { quotePage } from "@/lib/landing-data";
import { quoteQuery, type StarterQuote } from "@/lib/quote";
import { QuoteBuilder } from "./quote-builder";

/** Devis public : rien n'est réglé ici, le devis suit le funnel d'inscription. */
export function QuoteStart({ initial }: { initial: StarterQuote }) {
  const router = useRouter();
  return (
    <QuoteBuilder
      initial={initial}
      submitLabel={quotePage.submit.quote}
      onSubmit={(quote) => router.push(`/inscription?${quoteQuery(quote)}`)}
    />
  );
}
