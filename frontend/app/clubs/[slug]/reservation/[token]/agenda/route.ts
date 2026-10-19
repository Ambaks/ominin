import { formatCents } from "@/lib/club/format";
import { bookingPath } from "@/lib/club/links";
import { fetchBookingByToken } from "@/lib/club/public";
import { clubSiteUrl } from "@/lib/site";

/*
 * La soirée réservée, à ajouter au calendrier (.ics). Sans extension dans
 * le chemin : proxy.ts ne réécrit pas les chemins à extension, et
 * club.ominin.com/<slug>/… doit atteindre cette route.
 */

/* RFC 5545 : lignes de 75 octets au plus, repliées par CRLF + espace. */
const LINE_OCTETS = 75;

function fold(line: string): string {
  const out: string[] = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const bytes = Buffer.byteLength(char);
    if (size + bytes > LINE_OCTETS - (out.length ? 1 : 0)) {
      out.push(current);
      current = "";
      size = 0;
    }
    current += char;
    size += bytes;
  }
  out.push(current);
  return out.join("\r\n ");
}

/* TEXT (RFC 5545 §3.3.11) : barre oblique inverse, point-virgule et virgule échappés, sauts de ligne en \n. */
const text = (value: string) => value.replace(/[\\;,]/g, (char) => `\\${char}`).replace(/\r?\n/g, "\\n");

/* Un nom de fichier sûr dans l'en-tête : ASCII seul, sans guillemets ni espaces. */
const asciiName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; token: string }> }
) {
  const { slug, token } = await params;
  const booking = await fetchBookingByToken(token);
  if (!booking || booking.club.slug !== slug) return new Response("Réservation introuvable.", { status: 404 });

  const url = `${clubSiteUrl}${bookingPath(slug, token)}`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ominin//Ominin Club//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${token}@${new URL(clubSiteUrl).host}`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(booking.event.startsAt)}`,
    `DTEND:${stamp(booking.event.endsAt)}`,
    `SUMMARY:${text(`${booking.event.title} — ${booking.club.name}, ${booking.table.zone}`)}`,
    ...(booking.club.address ? [`LOCATION:${text(booking.club.address)}`] : []),
    `DESCRIPTION:${text(`${booking.table.zone}, ${booking.partySize} pers. — ${formatCents(booking.totalCents)}.\nVotre réservation et son QR code : ${url}`)}`,
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return new Response(`${lines.map(fold).join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${asciiName(`${slug}-${booking.table.zone}`) || "reservation"}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
