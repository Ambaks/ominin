import { PageSizes, PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { CommercialSignature } from "@/lib/legal/commercial";
import { editorLegalName } from "@/lib/legal/constants";
import { commercialName, signatureRecord, signatureStatement } from "./record";

/*
 * Exemplaire PDF du contrat signé (art. 10.4) : relevé de signature, puis le
 * texte entier. Les polices standard de pdf-lib n'encodent que WinAnsi, d'où
 * printable() avant toute mesure ou tracé.
 */

/** Mise en page de ce document, en points. */
export const LAYOUT = {
  page: PageSizes.A4,
  margin: 56,
  chrome: 8,
  title: 18,
  heading: 11.5,
  body: 10,
  leading: 1.45,
  paragraphGap: 5,
  sectionGap: 14,
  labelWidth: 112,
  bulletIndent: 14,
  /** Lignes de texte gardées sous un titre d'article. */
  keepWithNext: 2,
  /** En-tête et pied de page, depuis le bord. */
  chromeOffset: 28,
  muted: rgb(0.4, 0.4, 0.4),
  ink: rgb(0.1, 0.1, 0.1),
};

const slug = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// Sans le nom du commercial : saisi librement, il n'a pas de longueur bornée et
// finirait tel quel dans les en-têtes MIME et HTTP.
export const signedContractFilename = ({ document }: CommercialSignature) =>
  `contrat-commercial-ominin-${slug(document.version)}.pdf`;

// Espaces fines (Intl fr-FR) et signes typographiques hors WinAnsi.
const SUBSTITUTES: Record<string, string> = {
  "\u202f": "\u00a0",
  "\u2009": " ",
  "\u2011": "-",
  "\u2212": "-",
  "\u2192": "->",
  "\u2260": "!=",
  "\u2264": "<=",
  "\u2265": ">=",
};

/**
 * Texte encodable par la police : substitut connu, sinon la lettre sans son
 * accent, sinon « ? ». Ne lève jamais — une identité exotique ne doit pas
 * priver le commercial de son exemplaire.
 */
function printable(text: string, charset: Set<number>) {
  let out = "";
  for (const char of text.normalize("NFC").replace(/[\t\r\n]+/g, " ")) {
    if (charset.has(char.codePointAt(0)!)) {
      out += char;
      continue;
    }
    const fallback = SUBSTITUTES[char] ?? char.normalize("NFD").replace(/\p{M}/gu, "");
    out += [...fallback].every((c) => charset.has(c.codePointAt(0)!)) && fallback ? fallback : "?";
  }
  return out;
}

/** Coupe aux espaces ordinaires (jamais aux insécables), et dans un mot trop long. */
function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const width = (value: string) => font.widthOfTextAtSize(value, size);
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ").filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (width(candidate) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = "";
    for (const char of word) {
      if (line && width(line + char) > maxWidth) {
        lines.push(line);
        line = "";
      }
      line += char;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Page A4 qui se remplit de haut en bas : paragraphes coupés à la largeur,
 * lignes « libellé : valeur », saut de page automatique, puis en-tête et
 * numéros de page posés à la fin. Partagée par le contrat et les relevés.
 */
export async function pdfWriter(meta: { title: string; subject: string; date: Date }) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const charset = new Set(regular.getCharacterSet());
  // Guillemets et ponctuation haute restent collés à leur mot en fin de ligne.
  const clean = (text: string) =>
    printable(text, charset).replace(/« /g, "«\u00a0").replace(/ ([»:;?!])/g, "\u00a0$1");

  const header = clean(meta.title);
  pdf.setTitle(header);
  pdf.setAuthor(editorLegalName);
  pdf.setSubject(clean(meta.subject));
  pdf.setLanguage("fr-FR");
  // Date du document, pas du rendu : mêmes octets à chaque téléchargement.
  pdf.setCreationDate(meta.date);
  pdf.setModificationDate(meta.date);

  const [pageWidth, pageHeight] = LAYOUT.page;
  const left = LAYOUT.margin;
  const textWidth = pageWidth - 2 * LAYOUT.margin;
  const bottom = LAYOUT.margin;
  const top = pageHeight - LAYOUT.margin;
  const lineHeight = (size: number) => size * LAYOUT.leading;

  let page: PDFPage = pdf.addPage(LAYOUT.page);
  let y = top;
  const room = (height: number) => {
    if (y - height < bottom) {
      page = pdf.addPage(LAYOUT.page);
      y = top;
    }
  };

  /** Paragraphe à partir de `x`, puce éventuelle tracée sur sa première ligne. */
  const paragraph = (
    text: string,
    { font = regular, size = LAYOUT.body, x = left, color = LAYOUT.ink, bullet = false } = {},
  ) => {
    const height = lineHeight(size);
    wrap(clean(text), font, size, left + textWidth - x).forEach((line, index) => {
      room(height);
      y -= height;
      if (bullet && index === 0) {
        page.drawText("•", { x: x - LAYOUT.bulletIndent, y, size, font, color });
      }
      page.drawText(line, { x, y, size, font, color });
    });
  };

  /** « Libellé  valeur », la valeur coupée dans sa colonne. */
  const row = (label: string, value: string) => {
    const valueX = left + LAYOUT.labelWidth;
    const lines = wrap(clean(value), regular, LAYOUT.body, left + textWidth - valueX);
    const height = lineHeight(LAYOUT.body);
    room(height * lines.length);
    page.drawText(clean(label), { x: left, y: y - height, size: LAYOUT.body, font: regular, color: LAYOUT.muted });
    for (const line of lines) {
      y -= height;
      page.drawText(line, { x: valueX, y, size: LAYOUT.body, font: regular, color: LAYOUT.ink });
    }
  };

  /** Un titre ne reste pas seul en bas de page. */
  const heading = (text: string) => {
    y -= LAYOUT.sectionGap;
    room(lineHeight(LAYOUT.heading) + LAYOUT.keepWithNext * lineHeight(LAYOUT.body));
    paragraph(text, { font: bold, size: LAYOUT.heading });
    y -= LAYOUT.paragraphGap;
  };

  const gap = () => {
    y -= LAYOUT.paragraphGap;
  };

  const finish = () => {
    const pages = pdf.getPages();
    pages.forEach((sheet, index) => {
      const chrome = { size: LAYOUT.chrome, font: regular, color: LAYOUT.muted };
      sheet.drawText(header, { ...chrome, x: left, y: pageHeight - LAYOUT.chromeOffset });
      const number = `page ${index + 1} / ${pages.length}`;
      sheet.drawText(number, {
        ...chrome,
        x: left + textWidth - regular.widthOfTextAtSize(number, LAYOUT.chrome),
        y: LAYOUT.chromeOffset,
      });
    });
    return pdf.save();
  };

  return { paragraph, row, heading, gap, finish, bold, left };
}

export async function signedContractPdf(signature: CommercialSignature) {
  const { document } = signature;
  const doc = await pdfWriter({
    title: `${document.title} — version ${document.version}`,
    subject: `Exemplaire signé — ${commercialName(signature.terms.identity)}`,
    date: new Date(signature.acceptedAt),
  });

  doc.paragraph(document.title, { font: doc.bold, size: LAYOUT.title });
  doc.paragraph(`Version ${document.version} — exemplaire signé électroniquement`, { color: LAYOUT.muted });

  doc.heading("Relevé de signature");
  for (const [label, value] of signatureRecord(signature)) doc.row(label, value);
  doc.gap();
  doc.paragraph(signatureStatement(signature));

  for (const article of document.articles) {
    doc.heading(article.heading);
    for (const entry of article.body) {
      if (typeof entry === "string") {
        doc.paragraph(entry);
      } else {
        for (const item of entry) {
          doc.paragraph(item, { x: doc.left + LAYOUT.bulletIndent, bullet: true });
        }
      }
      doc.gap();
    }
  }
  return doc.finish();
}

/** Téléchargement de l'exemplaire : personnel, jamais mis en cache. */
export async function signedContractResponse(signature: CommercialSignature) {
  return new Response(new Uint8Array(await signedContractPdf(signature)), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${signedContractFilename(signature)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
