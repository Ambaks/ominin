import Image from "next/image";
import { screenSizes } from "@/lib/pitch/kit";

/*
 * Cadres d'appareils sobres autour des captures réelles des démos : un
 * liseré, un bord d'écran, aucune réplique de modèle. La largeur vient du
 * parent (w-full) ; le rapport de l'écran, de la capture.
 *
 * sizes : la largeur d'affichage, pour que next/image serve la bonne
 * variante ; la présentation passe unoptimized et garde la capture d'origine,
 * nette quand on zoome dans le PDF.
 */
type Shot = {
  src: string;
  alt: string;
  sizes: string;
  unoptimized?: boolean;
  priority?: boolean;
  className?: string;
};

export function PhoneFrame({ src, alt, sizes, unoptimized, priority, className = "" }: Shot) {
  const { width, height } = screenSizes.phone;
  return (
    <div className={`device-phone ${className}`}>
      <div className="device-phone-screen" style={{ aspectRatio: `${width} / ${height}` }}>
        <Image src={src} alt={alt} fill sizes={sizes} unoptimized={unoptimized} priority={priority} className="object-cover object-top" />
        <span aria-hidden className="device-phone-camera" />
      </div>
    </div>
  );
}

export function TabletFrame({ src, alt, sizes, unoptimized, crop, className = "" }: Shot & { crop?: Crop }) {
  return (
    <div className={`device-tablet ${className}`}>
      <div className="device-tablet-screen">
        <Screen src={src} alt={alt} sizes={sizes} unoptimized={unoptimized} size={screenSizes.tablet} crop={crop} />
      </div>
    </div>
  );
}

/** Une zone de la capture, en pixels CSS de la capture. */
type Crop = { x: number; y: number; width: number; height: number };

/**
 * L'écran d'un cadre : la capture entière, ou seulement la zone crop — la
 * vue réseau entière, réduite à la largeur d'une diapositive, ne se lisait
 * plus. Les marges en % se rapportent à la largeur, verticale comprise.
 */
function Screen({
  src,
  alt,
  sizes,
  unoptimized,
  size,
  crop,
}: Omit<Shot, "className"> & { size: { width: number; height: number }; crop?: Crop }) {
  const view = crop ?? { x: 0, y: 0, ...size };
  return (
    <div
      className={`relative overflow-hidden ${crop && crop.y + crop.height < size.height ? "device-screen-fade" : ""}`}
      style={{ aspectRatio: `${view.width} / ${view.height}` }}
    >
      <Image
        src={src}
        alt={alt}
        width={size.width}
        height={size.height}
        sizes={sizes}
        unoptimized={unoptimized}
        className="block max-w-none"
        style={{
          width: `${(size.width / view.width) * 100}%`,
          height: "auto",
          marginLeft: `${(-view.x / view.width) * 100}%`,
          marginTop: `${(-view.y / view.width) * 100}%`,
        }}
      />
    </div>
  );
}

export function BrowserFrame({
  src,
  alt,
  sizes,
  unoptimized,
  url,
  crop,
  badge,
  className = "",
}: Shot & { url: string; crop?: Crop; badge?: string }) {
  return (
    <div className={`device-browser ${className}`}>
      <div className="device-browser-bar" aria-hidden>
        <span className="device-browser-dots">
          <span />
          <span />
          <span />
        </span>
        <span className="device-browser-url">{url}</span>
        {badge && <span className="device-browser-badge">{badge}</span>}
      </div>
      <Screen src={src} alt={alt} sizes={sizes} unoptimized={unoptimized} size={screenSizes.desktop} crop={crop} />
    </div>
  );
}
