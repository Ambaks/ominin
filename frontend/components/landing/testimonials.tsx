import Image from "next/image";
import { clientsSection } from "@/lib/landing-data";
import { QrShowcase } from "./qr-showcase";
import { SectionHeading } from "./section-heading";

export function Testimonials() {
  return (
    <section
      id={clientsSection.id}
      className="paper relative scroll-mt-20 border-t border-hairline"
    >
      {/* La carte papier que le produit remplace — ironie visuelle assumée */}
      <div className="paper-grain absolute inset-0" aria-hidden />
      <div className="relative mx-auto w-full max-w-2xl px-5 py-16 lg:max-w-5xl lg:px-10 lg:py-24">
        <SectionHeading
          eyebrow={clientsSection.eyebrow}
          title={clientsSection.title}
        />

        <div className="mt-12 grid gap-5 lg:mt-16 lg:grid-cols-3">
          {clientsSection.clients.map((client) => (
            <div
              key={client.name}
              className="flex flex-col gap-5 rounded-2xl border border-hairline bg-surface p-6 lg:rounded-3xl lg:p-8"
            >
              <span className="ember-text font-display text-4xl leading-none">
                &ldquo;
              </span>
              <blockquote className="-mt-4 flex-1 text-sm leading-relaxed text-foreground">
                {client.quote}
              </blockquote>
              <footer className="flex items-center gap-3 border-t border-hairline pt-4">
                <Image
                  src={client.image}
                  alt={client.name}
                  width={40}
                  height={40}
                  className="size-10 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-medium">
                    {client.name}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {client.type} · {client.city}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
                    {clientsSection.sinceLabel} {client.since}
                  </p>
                </div>
              </footer>
            </div>
          ))}
        </div>

        <QrShowcase />
      </div>
    </section>
  );
}
