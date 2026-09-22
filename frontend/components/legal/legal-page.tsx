import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { contactEmail } from "@/lib/landing-data";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LEGAL_LINKS, LEGAL_PATHS, editorLegalName } from "@/lib/legal/constants";
import { pendingVersion, versionInForce } from "@/lib/legal/documents";
import { frenchDate } from "@/lib/legal/format";
import { documentHash, shortHash } from "@/lib/legal/hash";
import { isPublished } from "@/lib/legal/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  LegalVersionError,
  type LegalBlock,
  type LegalDoc,
  type LegalDocument,
} from "@/lib/legal/types";

/*
 * Présentation publique des documents contractuels. Une seule mise en forme
 * pour les quatre pages : le client doit retrouver à l'écran le texte exact
 * qu'il signe dans le tunnel, à la même empreinte.
 *
 * L'art. 1127-1 du code civil veut que les conditions soient reproductibles
 * et conservables : la page doit donc s'imprimer et s'enregistrer telle
 * quelle. D'où la mesure de lecture tenue courte, les articles ancrés, et le
 * traitement d'impression ci-dessous.
 */

/*
 * Le thème est sombre par défaut et les navigateurs n'impriment pas les
 * fonds : sans cette bascule, du texte gris clair sortirait sur papier
 * blanc. Le sélecteur descendant l'emporte sur les utilitaires de couleur du
 * sous-arbre (même couche, spécificité supérieure), ce qu'un simple
 * print:text-black ne ferait pas.
 */
const PRINT_INK = "print:text-black print:[&_*]:text-black";

export const legalHeadingClass =
  "font-display text-lg font-medium tracking-tight sm:text-xl";

export const legalBodyClass = "text-[15px] leading-7 text-muted";

export const legalLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.22em] text-faint";

/**
 * Coquille commune aux documents versionnés et aux mentions légales : en-tête
 * de marque, titre, ligne d'état, puis renvois vers les autres textes.
 */
export function LegalShell({
  title,
  lead,
  meta,
  current,
  fingerprint,
  children,
}: {
  title: string;
  lead: string;
  /** Ligne d'état sous le chapô : version et date d'effet, ou fondement légal. */
  meta: string;
  /** Document affiché, retiré de la barre de renvois. */
  current: keyof typeof LEGAL_PATHS;
  /** Empreinte abrégée, absente des pages non versionnées. */
  fingerprint?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`mx-auto w-full max-w-[68ch] px-4 pb-24 sm:px-6 print:max-w-none print:px-0 print:pb-0 ${PRINT_INK}`}
    >
      <header className="flex items-center justify-between py-4 print:hidden">
        <Link href="/" aria-label="Accueil">
          <Wordmark />
        </Link>
        <ThemeToggle />
      </header>

      <div className="border-b border-hairline pb-8 pt-4 print:border-black/25">
        <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">{lead}</p>
        <p className="mt-5 text-xs text-faint">{meta}</p>
      </div>

      <main className="mt-12 space-y-12">{children}</main>

      <footer className="mt-16 break-inside-avoid border-t border-hairline pt-8 print:border-black/25">
        {fingerprint && (
          <div>
            <h2 className={legalLabelClass}>Empreinte du texte</h2>
            <p className="mt-2 font-mono text-sm tracking-wider text-muted">
              {fingerprint}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-faint">
              Début de l&apos;empreinte SHA-256 des articles ci-dessus. Elle
              désigne cette version au mot près, et la même valeur est
              enregistrée avec votre acceptation.
            </p>
          </div>
        )}

        <nav aria-label="Documents légaux" className={fingerprint ? "mt-8" : ""}>
          <h2 className={legalLabelClass}>Autres documents</h2>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
            {LEGAL_LINKS.filter((link) => link.key !== current).map((link) => (
              <li key={link.key}>
                <Link
                  href={link.href}
                  className="transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="mt-8 text-xs text-faint">
          Document publié par {editorLegalName}.
        </p>
      </footer>
    </div>
  );
}

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === "string") {
    return <p className={legalBodyClass}>{block}</p>;
  }
  return (
    <ul
      className={`ml-5 list-disc space-y-2 marker:text-ember-2 ${legalBodyClass}`}
    >
      {block.map((item, index) => (
        // Texte figé, jamais réordonné : l'index est un identifiant stable,
        // et deux puces identiques ne le mettent pas en défaut.
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

/**
 * Préavis de la version suivante. Publié ici et non seulement dans le tunnel :
 * c'est la contrepartie publique de la clause de révision — annonce datée,
 * résumé de ce qui change, sortie sans frais avant la bascule.
 */
function PendingNotice({ next }: { next: LegalDocument }) {
  return (
    <aside className="break-inside-avoid rounded-2xl border border-ember-2/30 bg-surface p-5 sm:p-6 print:border-black/40">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ember-2">
        Prochaine version
      </h2>
      <p className="mt-3 text-[15px] leading-7">
        La version {next.version} entre en vigueur le{" "}
        {frenchDate(next.effectiveFrom)}. Jusque-là, le texte ci-dessous reste
        celui qui vous engage.
      </p>
      <p className={`mt-3 ${legalBodyClass}`}>{next.summary}</p>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Si ces changements ne vous conviennent pas, vous pouvez résilier avant
        cette date, sans frais ni pénalité.
      </p>
    </aside>
  );
}

/*
 * Numérotation. Elle est lue du titre de l'article — « Article 12 — … »,
 * « Annexe 1 — … » — et non recomptée à l'affichage : le corps du contrat
 * renvoie à « l'article 9 » et à « l'Annexe 1 », et une numérotation
 * calculée ici finirait par désigner autre chose que ce que le texte cite.
 * Les annexes suivent leur propre suite, d'où « Annexe 1 » et non
 * « Article 23 ».
 */
const NUMBERED = /^((?:Article|Annexe)\s+\d+)\s+—\s+(.*)$/;

function numbered(articles: LegalDocument["articles"]) {
  return articles.map((entry, index) => {
    const match = NUMBERED.exec(entry.heading);
    if (!match) {
      return { entry, id: `section-${index + 1}`, label: null, title: entry.heading };
    }
    const [, label, title] = match;
    return {
      // Ancre stable : une clause se cite depuis l'app ou un e-mail.
      id: label.toLowerCase().replace(/\s+/g, "-"),
      entry,
      label,
      title,
    };
  });
}

/*
 * Version à venir, annoncée seulement si elle est publiée en base. Si la base
 * est injoignable, on n'annonce rien plutôt que d'échouer : la page doit
 * toujours servir le texte en vigueur, et taire un préavis qu'on ne peut pas
 * confirmer vaut mieux qu'en afficher un que l'e-mail n'a peut-être pas donné.
 */
async function announcedVersion(doc: LegalDoc) {
  const next = pendingVersion(doc);
  if (!next) return undefined;
  try {
    return (await isPublished(createAdminClient(), next)) ? next : undefined;
  } catch (cause) {
    console.error("[legal] préavis non vérifiable", cause);
    return undefined;
  }
}

export async function LegalPage({ doc }: { doc: LegalDoc }) {
  /*
   * La version se résout ici, et son absence se rend en page plutôt qu'en
   * 500 : ces adresses sont citées dans le contrat lui-même, un client qui
   * les ouvre doit toujours trouver une réponse lisible.
   */
  let document: LegalDocument;
  try {
    document = versionInForce(doc);
  } catch (cause) {
    if (!(cause instanceof LegalVersionError)) throw cause;
    console.error("[legal]", cause.message);
    return (
      <LegalShell
        title="Document indisponible"
        lead=""
        meta=""
        current={doc}
      >
        <p className={legalBodyClass}>
          Ce document est momentanément indisponible. Écrivez-nous à{" "}
          <a href={`mailto:${contactEmail}`} className="underline">
            {contactEmail}
          </a>{" "}
          et nous vous en adressons une copie.
        </p>
      </LegalShell>
    );
  }

  const next = await announcedVersion(document.doc);

  return (
    <LegalShell
      title={document.title}
      lead={document.lead}
      meta={`Version ${document.version} · en vigueur depuis le ${frenchDate(
        document.effectiveFrom
      )}`}
      current={document.doc}
      fingerprint={shortHash(documentHash(document))}
    >
      {next && <PendingNotice next={next} />}

      {numbered(document.articles).map(({ entry, id, label, title }) => (
        <section key={id} id={id} className="scroll-mt-8 break-inside-avoid">
          {label && (
            <a
              href={`#${id}`}
              className={`${legalLabelClass} transition-colors hover:text-ember-2`}
            >
              {label}
            </a>
          )}
          <h2 className={`mt-2 ${legalHeadingClass}`}>{title}</h2>
          <div className="mt-4 space-y-4">
            {entry.body.map((block, blockIndex) => (
              <Block key={`${id}-${blockIndex}`} block={block} />
            ))}
          </div>
        </section>
      ))}
    </LegalShell>
  );
}
