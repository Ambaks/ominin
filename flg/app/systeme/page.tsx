import type { Metadata } from "next";
import { BeforeAfter } from "@/components/before-after";
import { Button, TextLink } from "@/components/button";
import { Faq } from "@/components/faq";
import { Choices, Field } from "@/components/form";
import { Gommage } from "@/components/gommage";
import { Marquee } from "@/components/marquee";
import { CurtainImage, MotionProvider, ParallaxImage, Reveal, RiseText } from "@/components/motion";
import { SiteNav } from "@/components/site-nav";
import { VideoLoop } from "@/components/video-loop";
import { faq, navCta, navLinks, surfaces, zone } from "@/lib/content";
import { projectTypes, surfaceRanges } from "@/lib/devis";

import plafondApres from "@/assets/chantiers/plafond-apres.jpg";
import plafondSalon from "@/assets/chantiers/plafond-salon.jpg";
import escalierAvant from "@/assets/chantiers/escalier-avant.jpg";
import escalierApres from "@/assets/chantiers/escalier-apres.jpg";
import charpenteAvant from "@/assets/chantiers/charpente-avant.jpg";
import charpenteApres from "@/assets/chantiers/charpente-apres.jpg";
import auventGalerie from "@/assets/chantiers/auvent-galerie.jpg";

export const metadata: Metadata = {
  title: "Système de design — FLG Aérogommage",
  robots: { index: false, follow: false },
};

const swatches = [
  { name: "Basalte", hex: "#0F0E0C", role: "Fond principal, l'atelier", light: false },
  { name: "Basalte 2", hex: "#181613", role: "Surfaces posées", light: false },
  { name: "Basalte 3", hex: "#23201B", role: "Survols, séparations", light: false },
  { name: "Chaux", hex: "#F1ECE3", role: "Texte sur sombre, sections claires", light: true },
  { name: "Chaux 2", hex: "#E6DFD2", role: "Fonds clairs secondaires", light: true },
  { name: "Grain", hex: "#A39886", role: "Texte secondaire sur basalte · 6,8:1", light: true },
  { name: "Pierre", hex: "#6E6559", role: "Texte secondaire sur chaux · 4,9:1", light: false },
  { name: "Laiton", hex: "#C8A46A", role: "Accent unique : actions, repères · 8,3:1", light: true },
  { name: "Laiton foncé", hex: "#7D5F2E", role: "Accent en texte sur chaux · 5:1", light: false },
] as const;

const scale = [
  { cls: "display-xl", name: "Display XL", spec: "56 → 156 px · interligne 0,9", sample: "Décaper sans abîmer." },
  { cls: "display-l", name: "Display L", spec: "44 → 104 px · 0,95", sample: "Grands chantiers, gestes précis." },
  { cls: "display-m", name: "Display M", spec: "34 → 64 px · 1", sample: "Plafond à solives, peinture retirée." },
  { cls: "display-s", name: "Display S", spec: "26 → 36 px · 1,1", sample: "Questions fréquentes" },
] as const;

const principles = [
  {
    n: "01",
    title: "Monumental",
    body: "Les chantiers sont grands, le site aussi : une typographie ample, des images plein cadre, peu d'éléments par écran.",
  },
  {
    n: "02",
    title: "Précis",
    body: "La langue du métier — pression, support, surface. Étiquettes techniques, grille stricte, filets fins, aucun arrondi.",
  },
  {
    n: "03",
    title: "Matériel",
    body: "Uniquement de vraies photos de chantier, un grain minéral discret, des couleurs prises au chantier : basalte, chaux, laiton.",
  },
  {
    n: "04",
    title: "Révélé",
    body: "Le mouvement imite le geste : on découvre, on décape, on dévoile. Jamais d'animation pour décorer.",
  },
] as const;

const specs = [
  ["Procédé", "Projection d'abrasif fin, à sec"],
  ["Pression", "1,5 – 6 bar"],
  ["Eau, chimie", "Aucune"],
  ["Supports", "Bois · Pierre · Brique · Béton · Métal · Verre"],
  ["Zone", "Occitanie"],
] as const;

const curves = [
  { name: "Sortie", token: "--ease-out", value: "cubic-bezier(.16, 1, .3, 1)", path: "M0 120 C32 0 60 0 200 0", use: "Tout ce qui apparaît : titres, blocs, images. 900 ms." },
  { name: "Rideau", token: "--ease-curtain", value: "cubic-bezier(.76, 0, .24, 1)", path: "M0 120 C152 120 48 0 200 0", use: "Ce qui se découvre : rideaux d'image, avant / après, menu. 1 200 ms." },
] as const;

const voice = {
  do: [
    "Décapage d'un plafond à solives : peinture retirée, bois d'origine conservé.",
    "Sols et menuiseries bâchés avant toute projection.",
    "Devis gratuit après visite du chantier.",
  ],
  dont: [
    "Nous sommes passionnés par l'excellence et la satisfaction client !",
    "Le meilleur aérogommage de France.",
    "Une solution innovante et révolutionnaire.",
  ],
} as const;

const architecture = [
  ["Accueil", "Décapage interactif, promesse, accès direct au devis."],
  ["Preuves", "Basse pression, à sec, sans chimie, zone d'intervention."],
  ["Chantiers", "Études de cas avant / après : auvent, plafonds, charpente, escalier, portail, atelier."],
  ["Savoir-faire", "Film de chantier et les étapes : visite, protection, décapage, finition, réception."],
  ["Applications", "Bois, pierre et brique, métal, verre — et les ouvrages de chacun."],
  ["Pour qui", "Architectes, entreprises du bâtiment, collectivités, copropriétés, industrie, particuliers."],
  ["Pourquoi", "L'aérogommage face au sablage et au décapage chimique."],
  ["Zone", "Carte de l'Occitanie, villes desservies."],
  ["Questions", "Les objections avant devis : plomb, délais, propreté, finitions."],
  ["Devis", "Formulaire qualifiant : type d'ouvrage, surface, matériau, ville, délai, photos."],
] as const;

function SectionHead({ n, title, intro }: { n: string; title: string; intro?: string }) {
  return (
    <div className="mb-16 grid gap-6 border-t border-line pt-8 md:grid-cols-12">
      <p className="label tabular text-accent-text md:col-span-2">{n}</p>
      <RiseText text={title} className="display display-l md:col-span-6" />
      {intro && <p className="text-muted md:col-span-4 md:pt-3">{intro}</p>}
    </div>
  );
}

export default function DesignSystem() {
  return (
    <MotionProvider>
      <SiteNav links={navLinks} cta={navCta} />

      <main>
        {/* Proposition de héros — et démonstration de la signature. */}
        <section className="relative pt-18">
          <div className="shell grid min-h-[calc(100svh-4.5rem)] items-center gap-12 py-12 lg:grid-cols-12 lg:gap-8">
            <div className="relative z-10 lg:col-span-7">
              <p className="label mb-8 text-muted">
                Aérogommage <span className="text-accent-text">·</span> {zone.join(" · ")}
              </p>
              <RiseText as="h1" onView={false} delay={0.15} text="La matière, *révélée.*" className="display display-xl" />
              <Reveal delay={0.7}>
                <p className="lead mt-10 max-w-xl text-fg/80">
                  Charpentes, plafonds, façades, escaliers, ouvrages métalliques : nous retirons peintures, lasures et
                  salissures sans abîmer le support. À sec, à basse pression, sans produit chimique.
                </p>
                <div className="mt-12 flex flex-wrap items-center gap-4">
                  <Button href="#devis">Demander un devis</Button>
                  <Button href="#chantiers" variant="secondary">
                    Voir les chantiers
                  </Button>
                </div>
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
              <p className="label mt-4 flex justify-between gap-4 text-muted">
                <span>Plafond à solives</span>
                <span>Peinture retirée, bois d&apos;origine</span>
              </p>
            </div>
          </div>
        </section>

        <div className="border-y border-line py-8">
          <Marquee items={surfaces} />
        </div>

        <section className="shell py-[var(--section)]">
          <div className="grid gap-10 md:grid-cols-12">
            <p className="label text-accent-text md:col-span-2">Système de design · v1</p>
            <div className="md:col-span-9">
              <p className="display display-m">
                Un site qui vend de grands chantiers doit d&apos;abord <em>montrer</em> la matière, puis rassurer sur la
                méthode.
              </p>
              <p className="lead mt-8 max-w-2xl text-muted">
                Cette page fixe les règles avant de construire le site : principes, couleurs, typographie, composants,
                mouvement et voix. Titrage : Archivo élargi. Accent : laiton.
              </p>
            </div>
          </div>
        </section>

        <section className="shell pb-[var(--section)]">
          <SectionHead n="01" title="Principes" />
          <div className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
            {principles.map((p, i) => (
              <Reveal key={p.n} delay={i * 0.08} className="flex flex-col gap-10 bg-bg p-8 pb-12">
                <span className="label tabular text-muted">{p.n}</span>
                <h3 className="display display-s">{p.title}</h3>
                <p className="text-muted">{p.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="shell pb-[var(--section)]">
          <SectionHead
            n="02"
            title="Couleurs"
            intro="Deux surfaces prises au chantier — l'abrasif et la chaux — et un seul accent, le laiton des outils. Contrastes de texte vérifiés AA."
          />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {swatches.map((s, i) => (
              <Reveal key={s.name} delay={(i % 5) * 0.06}>
                <div
                  className={`flex aspect-[3/4] flex-col justify-between p-5 ${s.light ? "text-basalte" : "text-chaux"} ${
                    s.name === "Basalte" ? "border border-line" : ""
                  }`}
                  style={{ background: s.hex }}
                >
                  <span className="label tabular">{s.hex}</span>
                  <div>
                    <p className="display display-s">{s.name}</p>
                    <p className="mt-2 text-[0.85rem] leading-snug opacity-75">{s.role}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="shell pb-[var(--section)]">
          <SectionHead
            n="03"
            title="Typographie"
            intro="Une seule famille, Archivo, sur toute la largeur de son axe : élargie et légère pour les titres, normale pour le texte, élargie en capitales pour les étiquettes techniques."
          />
          <div className="flex flex-col">
            {scale.map((t) => (
              <Reveal key={t.cls} className="grid gap-4 border-b border-line py-10 md:grid-cols-12">
                <div className="md:col-span-3">
                  <p className="label">{t.name}</p>
                  <p className="label tabular mt-2 text-muted">{t.spec}</p>
                </div>
                <p className={`display ${t.cls} md:col-span-9`}>{t.sample}</p>
              </Reveal>
            ))}
            <div className="grid gap-12 py-12 md:grid-cols-12">
              <div className="md:col-span-3">
                <p className="label">Texte</p>
                <p className="label mt-2 text-muted">Archivo · 17 px · 1,65</p>
              </div>
              <div className="flex flex-col gap-8 md:col-span-5">
                <p className="lead">
                  L&apos;aérogommage projette un abrasif très fin à basse pression. Il retire la couche sans attaquer le
                  support.
                </p>
                <p className="text-muted">
                  Le choix de l&apos;abrasif et de la pression s&apos;adapte à chaque matériau : on peut décaper un
                  vernis le long d&apos;une vitre sans la marquer, ou préparer une structure métallique pour qu&apos;une
                  nouvelle peinture accroche durablement. Une technique sèche, sans eau, qui convient aux bois
                  anciens comme aux ouvrages neufs.
                </p>
              </div>
              <div className="flex flex-col gap-6 md:col-span-4">
                <p className="label">Étiquette technique</p>
                <p className="label text-accent-text">Chantier · Charpente extérieure</p>
                <p className="display display-l tabular">
                  1,5<span className="text-muted">–</span>6 <span className="label align-middle text-muted">bar</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="surface-chaux py-[var(--section)]">
          <div className="shell">
            <SectionHead
              n="04"
              title="Composants"
              intro="Les mêmes pièces sur basalte et sur chaux : une section bascule de surface sans qu'on réécrive un composant."
            />

            <div className="grid gap-16 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <p className="label mb-6 text-muted">Actions</p>
                <div className="flex flex-wrap items-center gap-4">
                  <Button href="#devis">Demander un devis</Button>
                  <Button href="#chantiers" variant="secondary">
                    Voir les chantiers
                  </Button>
                  <TextLink href="#savoir-faire">La méthode</TextLink>
                </div>

                <p className="label mt-16 mb-6 text-muted">Fiche technique</p>
                <dl className="border-t border-line">
                  {specs.map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[8rem_1fr] gap-6 border-b border-line py-4">
                      <dt className="label pt-1 text-muted">{k}</dt>
                      <dd className="tabular">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="lg:col-span-6 lg:col-start-7">
                <p className="label mb-6 text-muted">Carte de chantier</p>
                <a href="#chantiers" className="group block">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <CurtainImage
                      src={charpenteApres}
                      alt="Charpente extérieure après aérogommage et lasure"
                      sizes="(min-width: 1024px) 45vw, 100vw"
                      className="size-full"
                      imageClassName="transition-transform duration-[1400ms] ease-out group-hover:scale-[1.04]"
                    />
                  </div>
                  <div className="mt-5 flex items-start justify-between gap-6">
                    <div>
                      <p className="label text-accent-text">Charpente · Extérieur</p>
                      <h3 className="display display-s mt-3">Charpente de terrasse couverte</h3>
                    </div>
                    <span className="label mt-1 shrink-0 text-muted transition-colors group-hover:text-fg">Voir →</span>
                  </div>
                </a>
              </div>
            </div>

            <div className="mt-[var(--section)] grid gap-16 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <p className="label mb-6 text-muted">Avant / après</p>
                <p className="display display-m">
                  Glissez pour <em>comparer.</em>
                </p>
                <p className="mt-6 max-w-md text-muted">
                  À l&apos;entrée dans l&apos;écran, le trait balaie l&apos;image comme une passe de décapage, puis
                  s&apos;arrête au milieu. Souris, doigt ou flèches du clavier.
                </p>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:col-span-7">
                <BeforeAfter
                  before={escalierAvant}
                  after={escalierApres}
                  alt="Escalier en chêne"
                  sizes="(min-width: 1024px) 28vw, (min-width: 640px) 50vw, 100vw"
                  className="aspect-[3/4]"
                />
                <BeforeAfter
                  before={charpenteAvant}
                  after={charpenteApres}
                  alt="Charpente extérieure"
                  sizes="(min-width: 1024px) 28vw, (min-width: 640px) 50vw, 100vw"
                  className="aspect-[3/4]"
                />
              </div>
            </div>

            <div className="mt-[var(--section)] grid gap-16 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <p className="label mb-6 text-muted">Formulaire de devis</p>
                <p className="display display-m">Des questions qui qualifient le chantier.</p>
                <p className="mt-6 max-w-md text-muted">
                  Type d&apos;ouvrage et surface d&apos;abord : les grands chantiers se repèrent avant même le premier
                  appel.
                </p>
              </div>
              <form className="flex flex-col gap-10 lg:col-span-7" action="#">
                <Choices legend="Type d'ouvrage" name="type" options={projectTypes} />
                <Choices legend="Surface estimée" name="surface" options={surfaceRanges} />
                <div className="grid gap-10 sm:grid-cols-2">
                  <Field label="Nom" name="nom" required autoComplete="name" />
                  <Field label="Ville du chantier" name="ville" required autoComplete="address-level2" />
                  <Field label="E-mail" name="email" type="email" required autoComplete="email" />
                  <Field label="Téléphone" name="telephone" type="tel" autoComplete="tel" />
                </div>
                <Field label="Le chantier en quelques mots" name="message" multiline />
              </form>
            </div>

            <div className="mt-[var(--section)] grid gap-16 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <p className="label mb-6 text-muted">Questions</p>
                <p className="display display-m">Répondre avant qu&apos;on demande.</p>
              </div>
              <div className="lg:col-span-8">
                <Faq items={faq} />
              </div>
            </div>
          </div>
        </section>

        <section className="py-[var(--section)]">
          <div className="shell">
            <SectionHead
              n="05"
              title="Mouvement"
              intro="Deux courbes, trois durées, un seul principe : le mouvement révèle. Tout se fige quand le visiteur demande moins d'animations."
            />
            <div className="grid gap-px bg-line md:grid-cols-2">
              {curves.map((c) => (
                <div key={c.token} className="flex flex-col gap-8 bg-bg p-8">
                  <svg viewBox="-4 -4 208 128" className="h-32 w-full max-w-xs overflow-visible" aria-hidden>
                    <path d="M0 120 H200 M0 0 V120" stroke="var(--line)" fill="none" />
                    <path d={c.path} stroke="var(--accent)" strokeWidth="2" fill="none" />
                  </svg>
                  <div>
                    <p className="display display-s">{c.name}</p>
                    <p className="label tabular mt-3 text-muted">
                      {c.token} · {c.value}
                    </p>
                    <p className="mt-4 text-muted">{c.use}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="shell mt-24 grid gap-6 md:grid-cols-12">
            <div className="md:col-span-7">
              <p className="label mb-4 text-muted">Rideau · l&apos;image se découvre de bas en haut</p>
              <CurtainImage
                src={auventGalerie}
                alt="Auvent en bois lamellé-collé d'un bâtiment neuf, poutres décapées"
                sizes="(min-width: 768px) 58vw, 100vw"
                className="aspect-[4/5] md:aspect-[16/11]"
              />
            </div>
            <div className="md:col-span-5">
              <p className="label mb-4 text-muted">Profondeur · l&apos;image glisse plus lentement que la page</p>
              <ParallaxImage
                src={plafondSalon}
                alt="Pièce aux plafonds à la française, solives décapées"
                sizes="(min-width: 768px) 40vw, 100vw"
                className="aspect-[4/5]"
              />
            </div>
          </div>

          <div className="shell mt-24 grid items-end gap-10 md:grid-cols-12">
            <div className="relative aspect-[9/16] max-h-[80svh] overflow-hidden md:col-span-4">
              <VideoLoop
                src="/films/aerogommage-poutre.mp4"
                poster="/films/aerogommage-poutre.jpg"
                label="Aérogommage d'une poutre en bois, en combinaison ventilée"
                className="absolute inset-0 size-full"
              />
            </div>
            <div className="md:col-span-7 md:col-start-6">
              <p className="label mb-6 text-muted">Film de chantier</p>
              <RiseText text="Le geste, *en vrai.*" className="display display-l" />
              <p className="lead mt-8 max-w-xl text-muted">
                Des boucles courtes, muettes, filmées sur les chantiers. Elles ne se chargent qu&apos;à l&apos;écran et
                restent sur leur image fixe si le visiteur limite les animations.
              </p>
            </div>
          </div>
        </section>

        <section className="surface-chaux py-[var(--section)]">
          <div className="shell">
            <SectionHead n="06" title="Voix" intro="Le ton d'un artisan sûr de son geste : factuel, précis, jamais de superlatif." />
            <div className="grid gap-px bg-line md:grid-cols-2">
              <div className="bg-bg p-8">
                <p className="label mb-8 text-accent-text">Oui</p>
                <ul className="flex flex-col gap-6">
                  {voice.do.map((v) => (
                    <li key={v} className="display display-s">
                      {v}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-bg p-8">
                <p className="label mb-8 text-muted">Non</p>
                <ul className="flex flex-col gap-6">
                  {voice.dont.map((v) => (
                    <li key={v} className="display display-s text-muted line-through decoration-1">
                      {v}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="shell py-[var(--section)]">
          <SectionHead
            n="07"
            title="Le site, section par section"
            intro="Une page longue pensée pour les grands chantiers : montrer, rassurer, qualifier, convertir."
          />
          <ol className="border-t border-line">
            {architecture.map(([name, body], i) => (
              <Reveal key={name} className="grid gap-2 border-b border-line py-6 md:grid-cols-12 md:items-baseline">
                <span className="label tabular text-muted md:col-span-1">{String(i + 1).padStart(2, "0")}</span>
                <span className="display display-s md:col-span-4">{name}</span>
                <span className="text-muted md:col-span-7">{body}</span>
              </Reveal>
            ))}
          </ol>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="shell flex flex-wrap items-baseline justify-between gap-6 py-10">
          <p className="display text-[2rem] leading-none">FLG</p>
          <p className="label text-muted">Système de design · v1 · à valider</p>
        </div>
      </footer>
    </MotionProvider>
  );
}
