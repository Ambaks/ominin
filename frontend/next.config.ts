import type { NextConfig } from "next";

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
    ],
  },
};

export default nextConfig;
