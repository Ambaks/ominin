import QRCode from "qrcode";
import { Reveal } from "@/components/landing-kit/reveal";
import { demoBand } from "@/lib/menu-landing-data";
import { menuSiteUrl } from "@/lib/site";

/* « Ne nous croyez pas sur parole » : la démo du Caffè Panis, en lien et en QR à scanner depuis l'écran. */
export async function MenuDemoBand() {
  const qr = await QRCode.toString(`${menuSiteUrl}${demoBand.path}`, { type: "svg", margin: 0 });
  return (
    <section className="px-4 pb-16 sm:px-6 sm:pb-24 lg:px-10">
      <Reveal className="g-glass g-glass-hero mx-auto w-full max-w-6xl p-g-pad">
        <div className="g-plate flex flex-col items-center gap-10 p-8 text-center sm:flex-row sm:p-10 sm:text-left lg:p-14">
          <div className="flex-1">
            <h2 className="kit-display text-balance text-4xl sm:text-5xl lg:text-6xl">{demoBand.title}</h2>
            <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted lg:text-lg">{demoBand.body}</p>
            <a href={demoBand.path} className="g-btn g-btn-primary g-press group mt-8">
              {demoBand.label}
              <span aria-hidden className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </a>
          </div>
          <figure className="shrink-0">
            <div
              role="img"
              aria-label={demoBand.qrAlt}
              className="size-44 rounded-2xl bg-white p-4 text-black [&>svg]:size-full lg:size-52"
              dangerouslySetInnerHTML={{ __html: qr }}
            />
            <figcaption className="mt-3 text-center text-xs text-muted">{demoBand.qrCaption}</figcaption>
          </figure>
        </div>
      </Reveal>
    </section>
  );
}
