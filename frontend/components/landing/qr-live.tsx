"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/* 512 px : le code reste net et scannable même sur écrans haute densité. */
const QR_PNG_WIDTH = 512;

/**
 * QR code réel et scannable, encodant `origin + path`. Généré côté client
 * pour que le code pointe vers l'environnement où la page est servie.
 */
export function QrLive({
  path,
  alt,
  className,
}: {
  path: string;
  alt: string;
  className: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(`${window.location.origin}${path}`, {
      width: QR_PNG_WIDTH,
    }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return dataUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={dataUrl} alt={alt} className={className} />
  ) : (
    <div aria-busy className={`animate-pulse rounded-lg bg-neutral-200 ${className}`} />
  );
}
