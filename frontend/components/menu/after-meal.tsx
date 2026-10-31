"use client";

import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { startVelours } from "@/components/menu/panis-backdrop";
import { Sheet, useNoSheet } from "@/components/menu/sheet";
import { veloursPalettes } from "@/components/menu/velours-palettes";
import { httpHref } from "@/lib/admin/format";
import { AFTER_MEAL_DELAY_MS, AFTER_MEAL_EXPIRY_MS } from "@/lib/gestion/constants";
import {
  afterMealWait,
  nextStep,
  parseVisit,
  readVisitText,
  saveVisit,
  subscribeVisit,
  type AfterMealMoment,
  type AfterMealOffer,
  type AfterMealStep,
} from "@/lib/menu/after-meal";
import { plainLine, useCart } from "@/lib/menu/cart";
import { formatPrice, lineName } from "@/lib/menu/format";
import { isActiveTicket, useTickets } from "@/lib/menu/tickets";
import type { MenuItem } from "@/lib/menu-data";
import "./after-meal.css";

const FINIR = { kicker: "Per finire", title: "Tout s’est bien passé ?" };

const WORDS: Record<AfterMealMoment, { kicker: string; title: string; lead: string }> = {
  repas: { ...FINIR, lead: "Une petite place pour un dessert, ou un café pour finir ?" },
  dessert: { ...FINIR, lead: "Un petit café pour finir ?" },
  sucre: { ...FINIR, lead: "Une petite place pour un dessert ?" },
  tournee: {
    kicker: "Ancora?",
    title: "Un autre verre ?",
    lead: "Ou un petit quelque chose à grignoter ?",
  },
  verre: {
    kicker: "Ancora?",
    title: "Un autre verre ?",
    lead: "La même chose ?",
  },
  grignoter: {
    kicker: "Ancora?",
    title: "Un petit quelque chose à grignoter ?",
    lead: "Pour accompagner un verre.",
  },
  fin: {
    kicker: "Grazie",
    title: "Merci de votre visite !",
    lead: "Un petit mot sur Google ? Ça aide beaucoup la maison.",
  },
};

const DELAY_MINUTES = AFTER_MEAL_DELAY_MS / 60_000;

/** Les noms et accords de la carte gardent l'apostrophe droite : on l'affiche typographique. */
const typo = (text: string) => text.replaceAll("'", "’");

/** Le satin de la carte, repris dans la feuille : le même tissu, sous la même question. */
function Satin() {
  const { slug } = useCart();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const palette = veloursPalettes[slug];
    return ref.current && palette ? startVelours(ref.current, palette) : undefined;
  }, [slug]);
  return <div ref={ref} aria-hidden className="after-meal-satin" />;
}

const STAR = "M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.5L12 17.3l-5.9 3.2 1.3-6.5L2.5 9.4l6.6-.8z";

/** Ce qui se dessine en tête de feuille : une tasse et sa vapeur ; un verre après des boissons ; une étoile pour l'avis. */
function Mark({ moment }: { moment: AfterMealMoment }) {
  return (
    <span aria-hidden className="after-meal-mark">
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {moment === "fin" ? (
          <path className="after-meal-trace" pathLength={1} strokeWidth="0.8" transform="scale(2)" d={STAR} />
        ) : moment === "tournee" || moment === "verre" || moment === "grignoter" ? (
          <>
            <path className="after-meal-trace" pathLength={1} d="M14 7h20l-1 11a9 9 0 01-18 0L14 7z" />
            <path className="after-meal-trace" pathLength={1} d="M24 27v13" />
            <path className="after-meal-trace" pathLength={1} d="M16 41h16" />
          </>
        ) : (
          <>
            <path className="after-meal-steam" pathLength={1} d="M18 15c-2-2.4-2-4.6 0-7" />
            <path className="after-meal-steam" pathLength={1} d="M24.5 15c-2-2.4-2-4.6 0-7" />
            <path className="after-meal-steam" pathLength={1} d="M31 15c-2-2.4-2-4.6 0-7" />
            <path className="after-meal-trace" pathLength={1} d="M11 20h26v7a11 11 0 01-11 11h-4a11 11 0 01-11-11v-7z" />
            <path className="after-meal-trace" pathLength={1} d="M37 22.5h1.5a4.5 4.5 0 010 9H36" />
            <path className="after-meal-trace" pathLength={1} d="M8 42h31" />
          </>
        )}
      </svg>
    </span>
  );
}

/** L'avis Google : le même lien pour tous, sans rien en échange (règles de Google). */
function ReviewLink({ url, primary, onLeave }: { url: string; primary: boolean; onLeave: () => void }) {
  return (
    <a
      href={httpHref(url)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onLeave}
      className={primary ? "after-meal-cta sheet-cta after-meal-review" : "after-meal-review"}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d={STAR} />
      </svg>
      Laisser un avis Google
    </a>
  );
}

function AfterMealCard({
  item,
  coffee,
  index,
  fresh,
  onToggle,
}: {
  item: MenuItem;
  coffee: boolean;
  index: number;
  fresh: boolean;
  onToggle: () => void;
}) {
  const { lines } = useCart();
  const on = lines.some((line) => line.itemId === item.id);
  return (
    <li className="after-meal-slot" style={{ "--i": index } as React.CSSProperties}>
      <button
        type="button"
        aria-label={
          on ? `Retirer de la commande : ${lineName(item)}` : `Ajouter : ${lineName(item)}, ${formatPrice(item.price)}`
        }
        onClick={(event) => {
          // Une assiette à moitié cachée vient à l'écran : son voisin reste visible.
          event.currentTarget.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
          onToggle();
        }}
        data-on={on || undefined}
        data-fresh={(on && fresh) || undefined}
        className="after-meal-card"
      >
        <span className="after-meal-photo">
          {item.image && (
            // eslint-disable-next-line @next/next/no-img-element -- photo servie telle quelle, comme au panier
            <img src={item.image} alt="" />
          )}
          {coffee && (
            <span aria-hidden className="after-meal-vapour">
              <i />
              <i />
              <i />
            </span>
          )}
        </span>
        <span className="after-meal-card-body">
          <span className="after-meal-name">{typo(lineName(item))}</span>
          <span className="after-meal-price">{on ? "✓ Ajouté" : `+ ${formatPrice(item.price)}`}</span>
        </span>
      </button>
    </li>
  );
}

function AfterMealSheet({
  step,
  offer,
  onClosed,
}: {
  step: AfterMealStep;
  offer: AfterMealOffer;
  onClosed: (toCart: boolean) => void;
}) {
  const cart = useCart();
  const titleId = useId();
  const toCart = useRef(false);
  const [fresh, setFresh] = useState<string | null>(null);
  const words = WORDS[step.moment];
  const choose = (item: MenuItem) => {
    setFresh(item.id);
    cart.addLine(plainLine(item));
    cart.track("panier", { items: [item.id] });
  };
  const shown = new Set(step.items.map((item) => item.id));
  const inCart = (id: string) => cart.lines.some((line) => line.itemId === id);
  const chosen = step.items.filter((item) => inCart(item.id));
  const amount = chosen.length > 0 ? cart.total : 0;
  // L'accord du chef, s'il relie ce qui vient d'être choisi à ce qui reste à côté.
  const combo = chosen
    .flatMap((item) => cart.pairings?.[item.id] ?? [])
    .find((pairing) => shown.has(pairing.item.id) && !inCart(pairing.item.id));
  // Sa photo et son prix du moment : ceux de la feuille.
  const comboItem = step.items.find((item) => item.id === combo?.item.id);

  return (
    <Sheet
      onClosed={() => onClosed(toCart.current)}
      backdropCloses
      labelledBy={titleId}
      morphKey={`${chosen.length > 0}:${combo?.item.id ?? ""}`}
    >
      {(close) => (
        <div className="after-meal" data-count={step.items.length}>
          <Satin />
          <button type="button" onClick={close} aria-label="Fermer" className="after-meal-close">
            ×
          </button>
          <header className="after-meal-head">
            <Mark moment={step.moment} />
            <p className="after-meal-kicker">{words.kicker}</p>
            <h2 id={titleId} className="after-meal-title">
              {words.title}
            </h2>
            <span aria-hidden className="after-meal-rule" />
            <p className="after-meal-lead">{words.lead}</p>
          </header>
          {step.items.length > 0 && (
            <ul className="after-meal-cards">
              {step.items.map((item, index) => (
                <AfterMealCard
                  key={item.id}
                  item={item}
                  coffee={offer.coffees.some((coffee) => coffee.id === item.id)}
                  index={index}
                  fresh={fresh === item.id}
                  onToggle={() => {
                    const line = cart.lines.find((candidate) => candidate.itemId === item.id);
                    if (line) {
                      cart.setQuantity(line.key, 0);
                      return;
                    }
                    choose(item);
                  }}
                />
              ))}
            </ul>
          )}
          <div className="after-meal-foot">
            {combo && comboItem && (
              <div key={comboItem.id} className="after-meal-combo">
                {comboItem.image && (
                  // eslint-disable-next-line @next/next/no-img-element -- photo servie telle quelle, comme au panier
                  <img src={comboItem.image} alt="" />
                )}
                <p>
                  <span>Le combo parfait</span>
                  {typo(combo.why)}
                </p>
                <button
                  type="button"
                  aria-label={`Ajouter : ${lineName(comboItem)}, ${formatPrice(comboItem.price)}`}
                  onClick={() => choose(comboItem)}
                >
                  + {formatPrice(comboItem.price)}
                </button>
              </div>
            )}
            {amount > 0 && (
              <button
                type="button"
                className="after-meal-cta sheet-cta"
                onClick={() => {
                  toCart.current = true;
                  close();
                }}
              >
                Voir la commande · {formatPrice(amount)}
              </button>
            )}
            {offer.reviewUrl && step.items.length === 0 && (
              <ReviewLink url={offer.reviewUrl} primary onLeave={close} />
            )}
            <div className="after-meal-exits">
              <button type="button" onClick={close} className="after-meal-decline">
                {amount > 0 ? "Plus tard" : "Non merci, ça ira"}
              </button>
              {offer.reviewUrl && step.items.length > 0 && (
                <ReviewLink url={offer.reviewUrl} primary={false} onLeave={close} />
              )}
            </div>
          </div>
        </div>
      )}
    </Sheet>
  );
}

/**
 * Au retour du client, la question du serveur qui repasse à table : au premier
 * coup d'œil sur la page, une fois le délai passé, qu'il soit resté dessus ou
 * qu'il l'ait fermée. Elle attend qu'aucune feuille ne soit ouverte, qu'aucune
 * commande ne soit en cours et que le panier soit vide : un client qui
 * commande déjà n'a rien à entendre.
 */
export function AfterMeal({ offer }: { offer: AfterMealOffer }) {
  const cart = useCart();
  const tickets = useTickets();
  const noSheet = useNoSheet();
  const slug = cart.slug;
  const text = useSyncExternalStore(
    subscribeVisit,
    () => readVisitText(slug),
    () => null
  );
  const visit = useMemo(() => parseVisit(text), [text]);
  const [due, setDue] = useState<(AfterMealStep & { servedAt: number }) | null>(null);
  const [offered, setOffered] = useState<AfterMealStep | null>(null);
  const enabled = Boolean(tickets?.barPickup);

  // Une commande passée arrête la minuterie ; le scan du bar la relance, gardé
  // pour survivre à la page. La suite se décide sur cette commande seule. En
  // aperçu, l'heure du scan est celle où la page le voit : il se joue sous ses yeux.
  const orders = tickets?.tickets;
  useEffect(() => {
    if (!enabled) return;
    const current = parseVisit(readVisitText(slug));
    const placed = (orders ?? []).some(isActiveTicket);
    const fresh = (orders ?? []).filter(
      (ticket) => ticket.status === "servie" && !current?.orders.includes(ticket.id)
    );
    if (fresh.length > 0) {
      saveVisit(slug, {
        servedAt: Date.now(),
        orders: [...(current?.orders ?? []), ...fresh.map((ticket) => ticket.id)],
        lines: fresh.flatMap((ticket) => ticket.lines.map((line) => line.name)),
        shown: placed,
      });
    } else if (placed && current && !current.shown) {
      saveVisit(slug, { ...current, shown: true });
    }
  }, [enabled, orders, slug]);

  useEffect(() => {
    if (!enabled || !visit || visit.shown) return;
    // Expirée, elle reste gardée : ses commandes ne relancent pas la minuterie.
    const expire = () => saveVisit(slug, { ...visit, shown: true });
    const wait = afterMealWait(visit, Date.now());
    if (wait === null) {
      expire();
      return;
    }
    // La minuterie gèle avec l'onglet : elle se relit au retour, jamais en son absence.
    const check = () => {
      if (document.visibilityState !== "visible") return;
      const left = afterMealWait(visit, Date.now());
      if (left === null) return expire();
      if (left > 0) return;
      const step = nextStep(offer, visit.lines, cart.closed);
      if (step) setDue({ ...step, servedAt: visit.servedAt });
      else expire();
    };
    const timer = window.setTimeout(check, wait);
    const expiry = window.setTimeout(expire, visit.servedAt + AFTER_MEAL_EXPIRY_MS - Date.now());
    document.addEventListener("visibilitychange", check);
    window.addEventListener("pageshow", check);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(expiry);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("pageshow", check);
    };
  }, [enabled, visit, slug, offer, cart.closed]);

  // Une proposition qui attendait son tour ne survit pas à une nouvelle commande.
  const waiting = due && visit?.shown === false && visit.servedAt === due.servedAt ? due : null;
  const busy = !noSheet || cart.count > 0 || (orders ?? []).some(isActiveTicket);
  if (waiting && !offered && !busy) setOffered(waiting);
  useEffect(() => {
    if (!offered) return;
    const current = parseVisit(readVisitText(slug));
    if (current && !current.shown) saveVisit(slug, { ...current, shown: true });
  }, [offered, slug]);

  if (!enabled) return null;
  return (
    <>
      {cart.preview && visit && !visit.shown && !waiting && !offered && !busy && (
        <button
          type="button"
          className="after-meal-demo"
          aria-label={`Démo : ${DELAY_MINUTES} minutes plus tard`}
          onClick={() => saveVisit(slug, { ...visit, servedAt: Date.now() - AFTER_MEAL_DELAY_MS })}
        >
          Démo · {DELAY_MINUTES} min →
        </button>
      )}
      {offered && (
        <AfterMealSheet
          step={offered}
          offer={offer}
          onClosed={(toCart) => {
            setOffered(null);
            if (toCart) cart.requestOpen();
          }}
        />
      )}
    </>
  );
}
