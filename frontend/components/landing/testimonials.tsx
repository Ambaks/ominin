import Image from "next/image";
import { clientsSection } from "@/lib/landing-data";
import { KitHeading } from "@/components/landing-kit/heading";

export function Testimonials() {
  return (
    <section
      id={clientsSection.id}
      className="scroll-mt-20"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-10 lg:py-24">
        <KitHeading
          eyebrow={clientsSection.eyebrow}
          title={clientsSection.title}
        />

        <div className="mt-12 grid gap-5 lg:mt-16 lg:grid-cols-3">
          {clientsSection.clients.map((client) => (
            <div
              key={client.name}
              className="flex flex-col gap-5 rounded-2xl border border-hairline bg-surface p-6 lg:rounded-3xl lg:p-8"
            >
              <span className="ember-text kit-display text-4xl leading-none">
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
                  <p className="kit-display text-sm font-medium">
                    {client.name}
                  </p>
                  <p className="text-xs text-muted">
                    {client.type} · {client.city}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-muted">
                    {clientsSection.sinceLabel} {client.since}
                  </p>
                </div>
              </footer>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
