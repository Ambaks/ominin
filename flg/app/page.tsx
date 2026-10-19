import { BeforeAfter } from "@/components/before-after";
import { Button } from "@/components/button";
import { Gommage } from "@/components/gommage";
import { Marquee } from "@/components/marquee";
import { CurtainImage, MotionProvider, ParallaxImage, Reveal, RiseText } from "@/components/motion";
import { QuoteForm } from "@/components/quote-form";
import { Logo, SiteNav } from "@/components/site-nav";
import { VideoLoop } from "@/components/video-loop";
import {
  applications,
  audiences,
  cases,
  comparison,
  contact,
  featured,
  navCta,
  navLinks,
  proofs,
  smallCases,
  steps,
  surfaces,
  zone,
} from "@/lib/content";

import plafondApres from "@/assets/chantiers/plafond-apres.jpg";
import plafondSalon from "@/assets/chantiers/plafond-salon.jpg";
import protectionFilm from "@/assets/chantiers/protection-film.jpg";
import protectionBaie from "@/assets/chantiers/protection-baie.jpg";
import auventEchafaudage from "@/assets/chantiers/auvent-echafaudage.jpg";

const protection = [
  { src: protectionFilm, alt: "Murs et portes protégés par film avant projection" },
  { src: protectionBaie, alt: "Aérogommage d'une baie, sol bâché" },
  { src: auventEchafaudage, alt: "Échafaudage et protection sous un auvent" },
];

function SectionHead({ n, title, intro }: { n: string; title?: string; intro?: string }) {
  return (
    <div className="mb-16 grid gap-6 border-t border-line pt-8 md:mb-24 md:grid-cols-12">
      <p className="label tabular text-accent-text md:col-span-2">{n}</p>
      {title && <RiseText text={title} className="display display-l md:col-span-6" />}
      {intro && <p className="text-muted md:col-span-4 md:pt-3">{intro}</p>}
    </div>
  );
}

const half = "(min-width: 768px) 45vw, 100vw";

function CtaBand({ title }: { title: string }) {
  return (
    <Reveal className="mt-24 flex flex-col items-start justify-between gap-8 border-y border-line py-10 md:mt-32 md:flex-row md:items-center">
      <p className="display display-s max-w-2xl">{title}</p>
      <Button href="#devis">Demander un devis</Button>
    </Reveal>
  );
}

export default function Home() {
  return (
    <MotionProvider>
      <SiteNav links={navLinks} cta={navCta} />

      <main>
        <section className="pt-18">
          <div className="shell grid min-h-[calc(100svh-4.5rem)] items-center gap-12 py-10 lg:grid-cols-12 lg:gap-8 lg:py-12">
            <div className="relative z-10 lg:col-span-7">
              <p className="label mb-8 text-muted">
                Aérogommage <span className="text-accent-text">·</span> {zone.join(" · ")}
              </p>
              <RiseText as="h1" onView={false} delay={0.15} text="La matière *révélée.*" className="display display-xl" />
              <Reveal delay={0.7}>
                <p className="lead mt-10 max-w-xl text-fg/80">
                  Décapage de grandes surfaces — charpentes, plafonds, façades, escaliers, poutres, sols — en bois,
                  métal, pierre et tomette. Nous travaillons pour les particuliers, mais aussi pour les architectes, des
                  entreprises de rénovation, des entreprises de BTP.
                </p>
                <div className="mt-12 flex flex-wrap items-center gap-4">
                  <Button href="#devis">Demander un devis</Button>
                  <Button href="#chantiers" variant="secondary">
                    Voir les chantiers
                  </Button>
                </div>
                <p className="label mt-8 text-muted">Devis gratuit</p>
              </Reveal>
            </div>
            <div className="lg:col-span-5">
              <Gommage
                src={plafondApres}
                alt="Plafond à solives après aérogommage : le bois d'origine retrouvé"
                sizes="(min-width: 1024px) 40vw, 100vw"
                preload
                hint={{ mouse: "Passez le curseur pour décaper", touch: "Glissez le doigt pour décaper" }}
                className="aspect-[4/5] w-full lg:aspect-auto lg:h-[76svh]"
              />
              <p className="label mt-4 text-muted">La peinture est décapée, le bois retrouve son aspect d&apos;origine.</p>
            </div>
          </div>
        </section>

        <div className="border-y border-line py-8">
          <Marquee items={surfaces} />
        </div>

        <section aria-label="Le procédé en bref" className="shell py-[var(--section)]">
          <div className="grid gap-px bg-line md:grid-cols-2">
            {proofs.map((p, i) => (
              <Reveal
                key={p.label}
                delay={i * 0.08}
                className="grid h-full grid-cols-[9rem_1fr] items-baseline gap-6 bg-bg py-6 md:flex md:flex-col md:gap-8 md:p-8 md:pb-10"
              >
                <p className="display display-m tabular whitespace-nowrap md:display-l">
                  {p.value}
                  {p.unit && <span className="label ml-3 block align-middle text-muted md:inline">{p.unit}</span>}
                </p>
                <div>
                  <h2 className="label text-accent-text">{p.label}</h2>
                  <p className="mt-3 text-muted">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="chantiers" className="scroll-mt-18 pb-[var(--section)]">
          <div className="shell">
            <SectionHead n="01" />

            <h3 className="display display-l">{featured.title}</h3>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              <div className="relative hidden aspect-[9/16] overflow-hidden md:block">
                <VideoLoop {...featured.filmBefore} className="absolute inset-0 size-full" />
                <span className="label absolute bottom-4 left-4 bg-basalte/70 px-2.5 py-1.5 text-chaux backdrop-blur-sm">
                  Avant · toute la galerie
                </span>
              </div>
              <div className="relative aspect-[9/16] overflow-hidden">
                <VideoLoop {...featured.film} className="absolute inset-0 size-full" />
                <span className="label absolute bottom-4 left-4 bg-basalte/70 px-2.5 py-1.5 text-chaux backdrop-blur-sm">
                  Après · toute la galerie
                </span>
              </div>
              <BeforeAfter
                before={featured.compare.before}
                after={featured.compare.after}
                alt={featured.compare.title}
                sizes="(min-width: 768px) 30vw, 100vw"
                className="aspect-[9/16]"
              />
            </div>
            <p className="mt-6 max-w-xl text-muted">{featured.note}</p>

            <div className="mt-24 grid gap-x-6 gap-y-20 md:mt-32 md:grid-cols-2">
              {cases.map((c) => (
                <Reveal key={c.title}>
                  <BeforeAfter before={c.before} after={c.after} alt={c.title} sizes={half} className="aspect-[4/5]" />
                  <h3 className="display display-s mt-6">{c.title}</h3>
                </Reveal>
              ))}
            </div>

            <div className="mt-24 grid gap-6 md:mt-32 md:grid-cols-12">
              {smallCases.map((c) => (
                <Reveal key={c.title} className="md:col-span-4">
                  <BeforeAfter
                    before={c.before}
                    after={c.after}
                    alt={c.title}
                    sizes="(min-width: 768px) 30vw, 100vw"
                    className="aspect-square"
                  />
                  <h3 className="mt-4 font-medium">{c.title}</h3>
                  <p className="mt-1 text-[0.95rem] text-muted">{c.body}</p>
                </Reveal>
              ))}
            </div>

            <CtaBand title="Un plafond, une charpente, un auvent à rendre à son bois d'origine ?" />
          </div>
        </section>

        <section id="savoir-faire" className="surface-chaux scroll-mt-18 py-[var(--section)]">
          <div className="shell">
            <SectionHead
              n="02"
              title="Une méthode, *cinq étapes.*"
            />
            <div className="grid gap-16 md:grid-cols-12">
              <div className="md:col-span-5">
                <div className="relative aspect-[9/16] max-h-[82svh] overflow-hidden md:sticky md:top-24">
                  <VideoLoop
                    src="/films/aerogommage-poutre.mp4"
                    poster="/films/aerogommage-poutre.jpg"
                    label="Aérogommage d'une poutre en bois, en combinaison ventilée"
                    className="absolute inset-0 size-full"
                  />
                </div>
              </div>
              <ol className="md:col-span-6 md:col-start-7">
                {steps.map((s, i) => (
                  <Reveal as="li" key={s.title} className="grid grid-cols-[4rem_1fr] gap-4 border-b border-line py-10 first:pt-0">
                    <span className="display display-m tabular text-accent-text">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <h3 className="display display-s">{s.title}</h3>
                      <p className="mt-3 text-muted">{s.body}</p>
                    </div>
                  </Reveal>
                ))}
                <li className="mt-16 grid grid-cols-3 gap-3">
                  {protection.map(({ src, alt }) => (
                    <CurtainImage
                      key={src.src}
                      src={src}
                      alt={alt}
                      sizes="(min-width: 768px) 15vw, 33vw"
                      className="aspect-[3/4]"
                    />
                  ))}
                  <p className="label col-span-3 mt-2 text-muted">Protection du chantier</p>
                </li>
              </ol>
            </div>
          </div>
        </section>

        <section id="applications" className="scroll-mt-18 py-[var(--section)]">
          <div className="shell">
            <SectionHead
              n="03"
              title="Tous les supports, *un seul geste.*"
              intro="L'abrasif et la pression changent avec le matériau. Le principe reste : retirer la couche, garder la matière."
            />
            <div className="grid gap-px bg-line md:grid-cols-3">
              {applications.map((a, i) => (
                <Reveal key={a.title} delay={i * 0.08} className="h-full bg-bg p-8 pb-10">
                  <h3 className="display display-s">{a.title}</h3>
                  <ul className="mt-8 flex flex-col">
                    {a.items.map((item) => (
                      <li key={item} className="border-t border-line py-3 text-muted">
                        {item}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              ))}
            </div>
            <Reveal className="mt-6 grid gap-6 border border-accent/50 p-8 md:grid-cols-12 md:p-12">
              <p className="display display-s text-accent-text md:col-span-4">Peintures au plomb</p>
              <p className="lead text-muted md:col-span-8">
                Elles ne se décapent pas par aérogommage. Dans le bâti ancien, un diagnostic plomb est à réaliser avant
                toute intervention : nous vous le demanderons lors de la visite.
              </p>
            </Reveal>
          </div>
        </section>

        <section className="pb-[var(--section)]">
          <div className="shell">
            <SectionHead n="04" title="Pour qui" />
            <div className="grid gap-16 md:grid-cols-12">
              <ParallaxImage
                src={plafondSalon}
                alt="Pièce aux plafonds à la française, solives décapées"
                sizes="(min-width: 768px) 40vw, 100vw"
                className="aspect-[4/5] md:col-span-5"
              />
              <ul className="border-t border-line md:col-span-6 md:col-start-7">
                {audiences.map((a) => (
                  <Reveal as="li" key={a.title} className="border-b border-line py-8">
                    <h3 className="display display-s">{a.title}</h3>
                    <p className="mt-3 max-w-lg text-muted">{a.body}</p>
                  </Reveal>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="surface-chaux py-[var(--section)]">
          <div className="shell">
            <SectionHead
              n="05"
              title="Pourquoi *l'aérogommage.*"
              intro="Trois façons de retirer une peinture. Une seule qui ménage à la fois le support et le chantier."
            />
            <Reveal className="md:hidden">
              <dl className="border-t border-fg">
                {comparison.rows.map(([label, ...cells]) => (
                  <div key={label} className="border-b border-line py-5">
                    <dt className="label mb-3 text-muted">{label}</dt>
                    {cells.map((c, i) => (
                      <dd key={i} className={`flex justify-between gap-4 py-1 ${i === 0 ? "font-medium" : "text-muted"}`}>
                        <span>{comparison.methods[i]}</span>
                        <span className="text-right">{c}</span>
                      </dd>
                    ))}
                  </div>
                ))}
              </dl>
            </Reveal>
            <Reveal className="hidden md:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-fg">
                    <th scope="col" className="w-1/4 py-4" />
                    {comparison.methods.map((m, i) => (
                      <th key={m} scope="col" className={`display display-s w-1/4 px-4 py-4 font-normal ${i === 0 ? "bg-bg-raised" : "text-muted"}`}>
                        {m}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparison.rows.map(([label, ...cells]) => (
                    <tr key={label} className="border-b border-line">
                      <th scope="row" className="label py-5 pr-4 text-muted">
                        {label}
                      </th>
                      {cells.map((c, i) => (
                        <td key={i} className={`px-4 py-5 ${i === 0 ? "bg-bg-raised font-medium" : "text-muted"}`}>
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Reveal>
          </div>
        </section>

        <section id="devis" className="surface-chaux scroll-mt-18 py-[var(--section)]">
          <div className="shell grid gap-16 md:grid-cols-12">
            <div className="md:col-span-5">
              <p className="label tabular mb-6 text-accent-text">06 · Contact</p>
              <RiseText text="Parlons de *votre chantier.*" className="display display-l" />
              <p className="lead mt-8 max-w-md text-muted">
                Décrivez en quelques mots ce que vous attendez de nous, ou appelez au{" "}
                <a href={contact.phoneHref} className="whitespace-nowrap text-fg underline decoration-accent underline-offset-4">
                  {contact.phone}
                </a>
                .
              </p>
              <p className="mt-6">
                <a href={`mailto:${contact.email}`} className="text-fg underline decoration-accent underline-offset-4">
                  {contact.email}
                </a>
              </p>
            </div>
            <div className="relative md:col-span-6 md:col-start-7">
              <QuoteForm />
            </div>
          </div>
        </section>
      </main>

      <footer className="overflow-hidden border-t border-line">
        <div className="shell flex flex-col gap-16 py-16">
          <div className="flex flex-wrap items-baseline justify-between gap-8">
            <Logo />
            <nav aria-label="Pied de page">
              <ul className="flex flex-wrap gap-x-8 gap-y-3">
                <li>
                  <a href="/cgv" className="text-muted transition-colors hover:text-fg">
                    Conditions générales de vente
                  </a>
                </li>
                <li>
                  <a href="#devis" className="text-muted transition-colors hover:text-fg">
                    Contact
                  </a>
                </li>
              </ul>
            </nav>
          </div>
          <p aria-hidden className="display select-none text-[clamp(7rem,30vw,26rem)] leading-[0.75] text-fg/[0.06]">
            FLG
          </p>
          <p className="label text-muted">© {new Date().getFullYear()} FLG Aérogommage</p>
        </div>
      </footer>
    </MotionProvider>
  );
}
