"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { BellIcon, ClockIcon, CommandesIcon, type IconProps } from "@/components/gestion/icons";
import {
  Bars,
  Checkbox,
  Chip,
  ConfirmSheet,
  EmptyState,
  ErrorNotice,
  Field,
  GlassButton,
  GlassFrame,
  Input,
  Mesh,
  Notice,
  Plate,
  RankedList,
  ReserveGerant,
  SectionHeading,
  Segmented,
  Select,
  Sheet,
  Shimmer,
  StatTile,
  Switch,
  Textarea,
} from "@/components/gestion/ui";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const eurosCents = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

const DAYS = [
  { label: "sam 25", value: 2310, orders: 83 },
  { label: "dim 26", value: 1420, orders: 51 },
  { label: "lun 27", value: 980, orders: 35 },
  { label: "mar 28", value: 1160, orders: 42 },
  { label: "mer 29", value: 1340, orders: 48 },
  { label: "jeu 30", value: 1690, orders: 61 },
  { label: "ven 31", value: 2580, orders: 92 },
];
const HOURS = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 48, 61, 22, 5, 3, 4, 19, 57, 74, 66, 31, 16];
const HOUR_LABELS: Record<number, string> = { 0: "0 h", 6: "6 h", 12: "12 h", 18: "18 h", 23: "23 h" };

const TOP_TODAY = [
  { label: "Burrata di Parma", value: "×14", amount: 14 },
  { label: "Pizza Diavola", value: "×11", amount: 11 },
  { label: "Tiramisù", value: "×9", amount: 9 },
  { label: "Spritz Aperol", value: "×8", amount: 8 },
  { label: "Linguine vongole", value: "×7", amount: 7 },
];
const TOP_WEEK = [
  { label: "Pizza Diavola", value: "×96", amount: 96, meta: euros.format(1440) },
  { label: "Burrata di Parma", value: "×88", amount: 88, meta: euros.format(1232) },
  { label: "Spritz Aperol", value: "×81", amount: 81, meta: euros.format(648) },
  { label: "Tiramisù", value: "×64", amount: 64, meta: euros.format(512) },
  { label: "Linguine vongole", value: "×52", amount: 52, meta: euros.format(936) },
];
const ORIGINS = [
  { label: "Suggestion sous le plat", value: `54 lignes · ${euros.format(702)}`, amount: 702 },
  { label: "Fin de commande", value: `43 lignes · ${euros.format(534)}`, amount: 534 },
];
const SUGGESTED = [
  { label: "Tiramisù", value: `×31 · ${euros.format(248)}`, amount: 31 },
  { label: "Spritz Aperol", value: `×29 · ${euros.format(232)}`, amount: 29 },
  { label: "Burrata di Parma", value: `×22 · ${euros.format(308)}`, amount: 22 },
];

const PERIODS = [
  { value: "7", label: "7 jours" },
  { value: "30", label: "30 jours" },
] as const;
type Period = (typeof PERIODS)[number]["value"];
type Open = "sheet" | "wide" | "confirm" | null;

/* Les trois familles d'erreur, telles qu'elles arrivent : fetch, PostgREST, Postgres. */
const ERRORS = {
  reseau: new TypeError("Failed to fetch"),
  droit: { code: "42501", message: "permission denied for table items" },
  donnee: { code: "23505", message: "duplicate key value violates unique constraint", details: "Key (name)=(Tiramisù) already exists." },
  metier: { message: "HubRise a refusé la commande : le plat « Tiramisù » n'existe plus dans sa carte." },
};

function Svg({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}
const CoinsIcon = (p: IconProps) => (
  <Svg {...p}>
    <ellipse cx="12" cy="7" rx="7" ry="3" />
    <path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
  </Svg>
);
const PulseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 12h4l3-7 4 14 3-7h4" />
  </Svg>
);
const BasketIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 10h16l-1.5 9h-13zM8 10l4-6 4 6" />
  </Svg>
);
const TipIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3l2 4 4.5.6-3.3 3.1.9 4.5L12 13l-4.1 2.2.9-4.5L5.5 7.6 10 7zM12 15v6" />
  </Svg>
);
const PlusIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
const EmptyIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M8 12h8" />
  </Svg>
);
const HiddenIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A10 10 0 0121 12a10.5 10.5 0 01-2.3 3.2M6.6 6.6A10.5 10.5 0 003 12a10 10 0 0014.4 5.4" />
  </Svg>
);

function Block({ i, className = "", children }: { i: number; className?: string; children: ReactNode }) {
  return (
    <section className={`g-rise ${className}`} style={{ "--g-i": i } as CSSProperties}>
      {children}
    </section>
  );
}

function Card({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <Plate className="px-5 pb-4 pt-4.5">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-g-h2">{title}</h2>
        {sub && <small className="whitespace-nowrap text-g-meta text-muted">{sub}</small>}
      </div>
      {children}
    </Plate>
  );
}

export function KitPreview() {
  const [period, setPeriod] = useState<Period>("7");
  const [open, setOpen] = useState<Open>(null);
  const [price, setPrice] = useState("");
  const [visible, setVisible] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [fabLabel, setFabLabel] = useState(true);
  const close = () => setOpen(null);
  return (
    <>
      <Mesh />
      <main className="relative z-1 mx-auto grid w-full max-w-7xl gap-5 px-4 pb-14 pt-6 sm:px-6">
        <Block i={0}>
          <SectionHeading
            level={1}
            title="Aperçu"
            sub="vendredi 31 octobre"
            right={
              <div className="flex items-center gap-2.5">
                <ThemeToggle />
                <GlassButton variant="icon" aria-label="Notifications, 1 non lue" badge={1} href="#">
                  <BellIcon />
                </GlassButton>
                <GlassButton href="#">Voir le menu ↗</GlassButton>
              </div>
            }
          />
        </Block>

        <Block i={1} className="grid gap-g-gap sm:grid-cols-2">
          <StatTile
            hero
            entity="orders"
            icon={<CommandesIcon />}
            label="Commandes en cours"
            value="7"
            baseline="3 à encaisser · 4 à servir"
            href="#"
            title="Commandes ouvertes en ce moment"
          />
          <StatTile
            hero
            entity="money"
            icon={<CoinsIcon />}
            label="CA du jour"
            value={euros.format(2580)}
            delta={{ text: "+12 %", tone: "better" }}
            baseline="vs vendredi dernier"
            href="#"
            title="Chiffre d'affaires encaissé aujourd'hui, TTC"
          />
        </Block>

        <Block i={2}>
          <Notice
            icon={<ClockIcon />}
            title="Fermeture en cours"
            text="Cuisine fermée jusqu'à 19:00 — les boissons restent en vente"
            action={<GlassButton>Rouvrir</GlassButton>}
          />
        </Block>

        <Block i={3} className="grid gap-g-gap lg:grid-cols-[7fr_5fr]">
          <Card title="Top ventes du jour" sub="quantités">
            <RankedList items={TOP_TODAY} entity="orders" />
          </Card>
          <Card title="À remettre en vente">
            <ul className="m-0 grid list-none gap-1 p-0">
              {[
                ["Tartare de thon", "Stock épuisé", <EmptyIcon key="e" />],
                ["Panna cotta", "Retiré de la vente", <HiddenIcon key="h" />],
              ].map(([name, state, icon]) => (
                <li
                  key={name as string}
                  className="flex min-h-13 items-center justify-between gap-3 border-t border-hairline first:border-t-0"
                >
                  <span className="truncate">{name}</span>
                  <Chip tone="problem" icon={icon}>
                    {state}
                  </Chip>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-end">
              <GlassButton>Gérer</GlassButton>
            </div>
          </Card>
        </Block>

        <Block i={4} className="grid gap-g-gap">
          <SectionHeading
            title="Analytique"
            sub="Vos ventes sur la période, mises à jour en direct"
            right={<Segmented label="Période" options={PERIODS} value={period} onChange={setPeriod} />}
          />
          {period === "30" ? (
            <EmptyState
              text="Pas encore 30 jours de données : premières ventes le samedi 25 octobre, la vue 30 jours s'ouvre le 24 novembre."
              action={<GlassButton onClick={() => setPeriod("7")}>Voir 7 jours</GlassButton>}
            />
          ) : (
            <>
              <div className="grid gap-g-gap sm:grid-cols-2 xl:grid-cols-4">
                <StatTile entity="money" icon={<CoinsIcon />} label="CA encaissé" value={euros.format(11480)} delta={{ text: "+6 %", tone: "better" }} baseline="vs période préc." title="CA encaissé sur 7 jours, TTC · écart vs les 7 jours précédents" />
                <StatTile entity="orders" icon={<PulseIcon />} label="Commandes payées" value="412" delta={{ text: "+3 %", tone: "better" }} baseline="vs période préc." title="Commandes payées sur 7 jours · écart vs les 7 jours précédents" />
                <StatTile entity="money" icon={<BasketIcon />} label="Panier moyen" value={eurosCents.format(27.86)} delta={{ text: "+2,9 %", tone: "better" }} baseline="vs période préc." title="CA encaissé ÷ commandes payées · écart vs les 7 jours précédents" />
                <StatTile entity="money" icon={<TipIcon />} label="Pourboires" value={euros.format(318)} delta={{ text: "+9 %", tone: "better" }} baseline="vs période préc." title="Pourboires encaissés sur 7 jours · écart vs les 7 jours précédents" />
              </div>

              <Card title="CA par jour" sub="CA · commandes">
                <Bars
                  entity="money"
                  data={DAYS.map((day) => ({ label: day.label, value: day.value, sub: String(day.orders) }))}
                  ticks={[0, 1000, 2000, 3000]}
                  format={euros.format}
                  label="CA par jour sur 7 jours, du samedi 25 au vendredi 31 : 2 310, 1 420, 980, 1 160, 1 340, 1 690 et 2 580 euros ; maximum vendredi 31"
                />
              </Card>

              <div className="grid gap-g-gap lg:grid-cols-2">
                <Card title="Top ventes" sub="7 jours · quantités">
                  <RankedList items={TOP_WEEK} entity="orders" size="bar" />
                </Card>
                <Card title="Heures de pointe" sub="commandes par heure · 7 jours">
                  <Bars
                    dense
                    entity="orders"
                    data={HOURS.map((value, hour) => ({ label: HOUR_LABELS[hour] ?? "", value }))}
                    ticks={[0, 50, 100]}
                    format={(value) => `${value} commandes`}
                    label="Commandes par heure sur 7 jours : rien avant 11 h, pointe à 20 h avec 74 commandes ; total 412"
                  />
                </Card>
              </div>

              <SectionHeading
                title="Le combo parfait"
                sub="Ce que les suggestions du menu ont fait commander, annulations exclues"
              />
              <div className="grid gap-g-gap sm:grid-cols-3">
                <StatTile plain entity="money" label="CA des suggestions" value={euros.format(1236)} baseline="sur 7 jours" />
                <StatTile plain entity="orders" label="Lignes suggérées" value="97" baseline="sur 7 jours" />
                <StatTile plain entity="money" label="Part du CA" value="10,8 %" baseline="sur 7 jours" />
              </div>
              <div className="grid gap-g-gap lg:grid-cols-2">
                <Card title="Par origine" sub="lignes · CA">
                  <RankedList items={ORIGINS} entity="money" size="bar" />
                </Card>
                <Card title="Plats suggérés les plus vendus" sub="quantités · CA">
                  <RankedList items={SUGGESTED} entity="orders" size="bar" />
                </Card>
              </div>
            </>
          )}
        </Block>

        <Block i={5} className="grid gap-g-gap">
          <SectionHeading title="États" sub="chargement, données en attente, vide, erreur" />
          <div className="grid gap-g-gap sm:grid-cols-2 xl:grid-cols-4">
            <GlassFrame entity="money" eyebrow="CA encaissé" icon={<CoinsIcon />}>
              <Shimmer className="h-21" />
            </GlassFrame>
            <GlassFrame entity="orders" eyebrow="Commandes payées" icon={<PulseIcon />}>
              <Shimmer className="h-21" />
            </GlassFrame>
            <div className="relative sm:col-span-2">
              <div className="g-stale">
                <StatTile entity="money" icon={<CoinsIcon />} label="CA encaissé" value={euros.format(11480)} delta={{ text: "+6 %", tone: "better" }} baseline="vs période préc." />
              </div>
              <div className="absolute right-3 top-3">
                <Chip>Mise à jour…</Chip>
              </div>
            </div>
          </div>
          <EmptyState
            text="Aucune vente aujourd'hui pour l'instant."
            action={<GlassButton variant="primary">Voir le menu</GlassButton>}
          />
          <Notice
            icon={<ClockIcon />}
            title="Chargement impossible"
            text="Les derniers chiffres connus restent affichés."
            action={<GlassButton>Réessayer</GlassButton>}
          />
          <Notice
            tone="info"
            icon={<BellIcon />}
            title="Nouvelle commande"
            text="Table 12 — 3 articles"
            action={<GlassButton variant="primary">Voir</GlassButton>}
          />
        </Block>

        <Block i={6} className="grid gap-g-gap">
          <SectionHeading
            title="Commandes et pastilles"
            sub="pleine, filet, icône · neutre, problème · flottant en bas à droite (clic : étiré ↔ rond)"
          />
          <Plate className="flex flex-wrap items-center gap-3 p-5">
            <GlassButton variant="primary">Encaisser</GlassButton>
            <GlassButton>Gérer</GlassButton>
            <GlassButton disabled>Indisponible</GlassButton>
            <GlassButton variant="icon" aria-label="Notifications, 3 non lues" badge={3}>
              <BellIcon />
            </GlassButton>
            <GlassButton variant="icon" aria-label="Horaires">
              <ClockIcon />
            </GlassButton>
            <Chip>Mise à jour…</Chip>
            <Chip tone="problem" icon={<EmptyIcon />}>
              Stock épuisé
            </Chip>
            <Segmented
              glass={false}
              label="Vue"
              options={[
                { value: "a", label: "Salle" },
                { value: "b", label: "Emporter" },
                { value: "c", label: "Tout" },
              ]}
              value="a"
              onChange={() => {}}
            />
            <GlassButton variant="danger">Supprimer l’article</GlassButton>
          </Plate>
        </Block>

        <Block i={7} className="grid gap-g-gap">
          <SectionHeading title="Formulaires" sub="champ, saisie, liste, interrupteur, case, feuille · un seul Enregistrer par section" />
          <Card title="Fiche article" sub="enregistrée d’un bloc">
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                setOpen("confirm");
              }}
            >
              <Field label="Nom" required hint="Tel qu’il s’affiche sur la carte.">
                <Input name="name" placeholder="Burrata di Parma" autoComplete="off" />
              </Field>
              <Field label="Prix" required error={price ? undefined : "Indiquez un prix pour enregistrer."}>
                <Input name="price" numeric unit="€" placeholder="0,00" value={price} onChange={(event) => setPrice(event.target.value)} />
              </Field>
              <Field label="Catégorie" hint="Une catégorie de votre carte.">
                <Select name="category" defaultValue="antipasti">
                  <option value="antipasti">Antipasti</option>
                  <option value="pizze">Pizze</option>
                  <option value="dolci">Dolci</option>
                </Select>
              </Field>
              <Field label="Description" hint="Deux lignes, lues sous le nom." className="sm:col-span-2">
                <Textarea name="description" placeholder="Burrata crémeuse, jambon de Parme 24 mois, roquette." />
              </Field>
              <div className="grid gap-1 sm:col-span-2">
                <Switch label="Visible sur la carte" hint="Masqué, il reste dans les formules." checked={visible} onChange={setVisible} />
                <Checkbox label="Contient des allergènes" hint="La fiche les listera au client." checked={agreed} onChange={setAgreed} />
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2 sm:col-span-2">
                {!price && <p className="mr-auto text-g-meta text-muted">Indiquez un prix pour enregistrer.</p>}
                <GlassButton onClick={() => setOpen("sheet")}>Ouvrir une feuille</GlassButton>
                <GlassButton onClick={() => setOpen("wide")}>Feuille large</GlassButton>
                <GlassButton type="submit" variant="primary" disabled={!price}>
                  Enregistrer
                </GlassButton>
              </div>
            </form>
          </Card>
          <div className="flex items-center gap-3">
            <Switch aria-label="Ouvert" checked={visible} onChange={setVisible} />
            <Switch aria-label="Fermé" checked={false} onChange={() => {}} disabled />
            <Checkbox label="Case seule" checked onChange={() => {}} />
          </div>
          {open === "sheet" && (
            <Sheet
              title="Modifier le prix"
              description="Le nouveau prix s’applique aux prochaines commandes."
              onClose={close}
              footer={
                <>
                  <GlassButton onClick={close}>Annuler</GlassButton>
                  <GlassButton variant="primary" onClick={close}>
                    Enregistrer
                  </GlassButton>
                </>
              }
            >
              <Field label="Prix" required>
                <Input numeric unit="€" defaultValue="12,50" data-autofocus />
              </Field>
            </Sheet>
          )}
          {open === "wide" && (
            <Sheet title="Nouvelle formule" size="wide" onClose={close} footer={<GlassButton onClick={close}>Fermer</GlassButton>}>
              <div className="grid gap-g-gap lg:grid-cols-[3fr_2fr]">
                <div className="grid gap-4">
                  <Field label="Nom de la formule" required>
                    <Input defaultValue="Formule midi" data-autofocus />
                  </Field>
                  <Field label="Prix" required>
                    <Input numeric unit="€" defaultValue="18,00" />
                  </Field>
                </div>
                <Shimmer className="min-h-40" />
              </div>
            </Sheet>
          )}
          {open === "confirm" && (
            <ConfirmSheet
              title="Supprimer « Burrata di Parma » ?"
              text="L’article disparaît de la carte et des formules qui le proposent. Les commandes passées le gardent."
              confirmLabel="Supprimer l’article"
              destructive
              onConfirm={close}
              onClose={close}
            />
          )}
        </Block>

        <Block i={8} className="grid gap-g-gap">
          <SectionHeading title="Erreurs" sub="réseau, droit, donnée, message métier · ce qui a cassé, quoi faire" />
          <ErrorNotice error={ERRORS.reseau} onRetry={() => {}} />
          <ErrorNotice error={ERRORS.droit} />
          <ErrorNotice error={ERRORS.donnee} />
          <ErrorNotice error={ERRORS.metier} />
          <ReserveGerant ask="modifier la carte" name="Marie" />
        </Block>
        <button
          type="button"
          className={`g-fab g-press${fabLabel ? " g-fab-label" : ""}`}
          aria-label={fabLabel ? undefined : "Nouvelle commande"}
          onClick={() => setFabLabel((v) => !v)}
        >
          <PlusIcon />
          {fabLabel && "Nouvelle commande"}
        </button>
      </main>
    </>
  );
}
