import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/*
 * CSP additive et prudente, calquée sur les origines réellement utilisées :
 *  - Supabase (REST/Storage/Realtime) : connect-src https + wss, img-src storage.
 *  - Stripe : checkout par redirection (pas de stripe.js embarqué) ; js/checkout
 *    autorisés en frame-src par sécurité future.
 *  - Polices : next/font auto-héberge au build → aucun domaine Google requis.
 *  - Images d'illustration : Unsplash.
 * script/style gardent 'unsafe-inline' : Next (App Router) et next-themes
 * injectent des scripts inline sans nonce. En dev, 'unsafe-eval' + ws pour le HMR.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com${
    isDev ? " ws: http://localhost:*" : ""
  }`,
  "frame-src 'self' https://js.stripe.com https://checkout.stripe.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  // HSTS : ignoré par les navigateurs hors HTTPS (dev/local), actif en prod.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  // Dev only : autorise l'accès au serveur de dev depuis le téléphone sur le
  // réseau local (Next 16 bloque les origines cross-host par défaut, ce qui
  // cassait le hot-reload en testant le menu QR sur mobile).
  allowedDevOrigins: ["192.168.88.1"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      // Photos de plats téléversées (bucket public Supabase Storage).
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // En-têtes de sécurité appliqués à toutes les routes (pages, API, assets).
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
