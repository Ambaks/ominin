/*
 * CSV maison, RFC 4180 : le parseur et l'écrivain partagent les mêmes règles,
 * donc un export se réimporte à l'identique. Géré explicitement : BOM UTF-8,
 * champs cités contenant délimiteur / guillemets / sauts de ligne (LF et
 * CRLF), et détection du délimiteur entre virgule et point-virgule — les
 * exports Excel français utilisent « ; ».
 */

export interface CsvColumn<Row> {
  header: string;
  value: (row: Row) => string | number | null;
}

/** Compte les occurrences d'un caractère hors guillemets sur la 1re ligne. */
function countOutsideQuotes(line: string, char: string): number {
  let count = 0;
  let quoted = false;
  for (const c of line) {
    if (c === '"') quoted = !quoted;
    else if (c === char && !quoted) count += 1;
  }
  return count;
}

export function parseCsv(text: string): string[][] {
  // BOM UTF-8 posé par Excel (et par notre export).
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  // Première ligne quel que soit le saut (CRLF, LF, ou CR seul).
  const firstLine = input.split(/\r\n|\r|\n/, 1)[0];
  const delimiter =
    countOutsideQuotes(firstLine, ";") > countOutsideQuotes(firstLine, ",")
      ? ";"
      : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < input.length; i += 1) {
    const c = input[i];
    if (quoted) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"' && field === "") {
      quoted = true;
    } else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && input[i + 1] === "\n") i += 1;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Les lignes vides sont conservées : l'appelant les filtre en gardant les
  // numéros de ligne d'origine (les messages « Ligne N » doivent pointer sur
  // le vrai fichier, sauts compris).
  return rows;
}

/** Une ligne sans aucune cellule non vide (double saut, fin de fichier). */
export function isEmptyRow(row: string[]): boolean {
  return row.every((cell) => cell.trim() === "");
}

function escapeField(value: string): string {
  // Préfixe apostrophe : neutralise l'interprétation en formule par les
  // tableurs (=, +, -, @ en tête de cellule — exfiltration/DDE à l'ouverture
  // d'un export dont les données viennent de listes importées). Les nombres
  // purs sont exemptés : une longitude négative n'est pas une formule, et le
  // préfixe casserait sa réimportation.
  const neutralized =
    /^[=+\-@]/.test(value) && !/^-?\d+([.,]\d+)?$/.test(value)
      ? `'${value}`
      : value;
  return /[",;\n\r]/.test(neutralized)
    ? `"${neutralized.replaceAll('"', '""')}"`
    : neutralized;
}

export function toCsv<Row>(rows: Row[], columns: CsvColumn<Row>[]): string {
  const lines = [
    columns.map((c) => escapeField(c.header)).join(","),
    ...rows.map((row) =>
      columns
        .map((c) => {
          const value = c.value(row);
          return escapeField(value == null ? "" : String(value));
        })
        .join(",")
    ),
  ];
  // BOM : Excel ouvre le fichier en UTF-8 (accents intacts) ; CRLF RFC 4180.
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
