/** Origine publique derrière le proxy Vercel, identique à l'aller et au retour OAuth. */
export function publicRequestOrigin(request: Request): string {
  const requestUrl = new URL(request.url);
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    .trim();
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    .trim();
  const protocol = forwardedProtocol
    ? `${forwardedProtocol.replace(/:$/, "")}:`
    : requestUrl.protocol;
  const host = forwardedHost ?? request.headers.get("host") ?? requestUrl.host;
  return `${protocol}//${host}`;
}
