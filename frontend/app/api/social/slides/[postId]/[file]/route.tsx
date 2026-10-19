import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { BRAND_BY_ID, type Brand, type Slide } from "@/lib/social/brands";
import { SCREEN_BY_ID, screenPath } from "@/lib/social/screens";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Image n d'une publication : /api/social/slides/<post>/<n>.jpg. Route
 * publique à dessein — Instagram et Facebook viennent chercher chaque image
 * à son URL au moment de publier, et l'admin s'en sert pour l'aperçu et le
 * téléchargement Snapchat. Elle ne rend que ce que l'agent a enregistré en
 * base (aucun texte ne vient de l'URL), et l'identifiant est un uuid.
 *
 * Gabarit des landings (components/landing-kit) : Geist très gras et serré,
 * fond sombre avec un halo, étiquette à pastille, et les mots du titre que
 * le rédacteur encadre de [[ ]] posés sur le dégradé de la marque. Une image
 * qui porte une capture (lib/social/screens) garde le texte en haut et pose
 * l'écran dans un téléphone qui sort par le bas du cadre.
 */

/* Formats imposés par les réseaux : portrait 4:5 du fil, 9:16 des stories. */
const FEED = { width: 1080, height: 1350 };
const STORY = { width: 1080, height: 1920 };
/* Instagram n'accepte que le JPEG ; next/og ne produit que du PNG. */
const JPEG_QUALITY = 90;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HIGHLIGHT = /\[\[(.+?)\]\]/g;

let assets: Promise<{
  fonts: { name: string; data: Buffer; weight: 400 | 500 | 800; style: "normal" }[];
  logo: string;
}> | null = null;

/* Chemins littéraux, un par appel : le traçage des fichiers de Vercel ne
 * suit que ceux-là. Un chemin assemblé à l'exécution lui fait embarquer tout
 * public/ (films et PDF des pitchs) dans la fonction. */
function loadAssets() {
  assets ??= Promise.all([
    readFile(join(process.cwd(), "assets/fonts/geist-latin-400-normal.woff")),
    readFile(join(process.cwd(), "assets/fonts/geist-latin-800-normal.woff")),
    readFile(join(process.cwd(), "assets/fonts/fraunces-latin-500-normal.woff")),
    readFile(join(process.cwd(), "public/logo.png")),
  ]).then(([geist, geistBlack, fraunces, logo]) => ({
    fonts: [
      { name: "Geist", data: geist, weight: 400, style: "normal" },
      { name: "Geist", data: geistBlack, weight: 800, style: "normal" },
      { name: "Fraunces", data: fraunces, weight: 500, style: "normal" },
    ],
    logo: `data:image/png;base64,${logo.toString("base64")}`,
  }));
  return assets;
}

/* Téléphone des images à capture : largeur, haut de l'écran dans le cadre
 * (fil, story), bordure et arrondi. Les captures font 780 px de large. */
const PHONE = { width: 560, top: 640, storyTop: 900, bezel: 16, radius: 72 };

/** Capture du catalogue en data URI, lue par HTTP sur le site lui-même et non
 * sur le disque : un chemin assemblé ferait embarquer tout public/ (voir
 * loadAssets). Un id inconnu ou une capture introuvable donne une image
 * texte seul plutôt qu'une erreur. Une capture cadrée en bas est réduite au
 * bas de l'écran, à la hauteur que le téléphone laisse voir dans le fil. */
async function loadScreen(
  id: string | undefined,
  origin: string,
): Promise<string | null> {
  const screen = id ? SCREEN_BY_ID.get(id) : undefined;
  if (!screen) return null;
  const response = await fetch(new URL(screenPath(screen.id), origin)).catch(
    () => null,
  );
  if (!response?.ok) return null;
  let data: Buffer = Buffer.from(await response.arrayBuffer());
  if (screen.focus === "bottom") {
    const { width = 0, height = 0 } = await sharp(data).metadata();
    const visible = Math.round(
      ((FEED.height - PHONE.top - PHONE.bezel) * width) /
        (PHONE.width - 2 * PHONE.bezel),
    );
    if (visible < height) {
      data = await sharp(data)
        .extract({ left: 0, top: height - visible, width, height: visible })
        .jpeg({ quality: JPEG_QUALITY })
        .toBuffer();
    }
  }
  return `data:image/jpeg;base64,${data.toString("base64")}`;
}

/** Le corps du titre suit sa longueur : le rédacteur vise 70 caractères,
 * mais rien ne doit déborder s'il en écrit davantage. Au-dessus d'une
 * capture, il cède la place au téléphone. */
function titleSize(title: string, cover: boolean, withScreen: boolean): number {
  const base = withScreen ? 72 : cover ? 118 : 86;
  const length = title.replace(HIGHLIGHT, "$1").length;
  if (length > 90) return base * 0.62;
  if (length > 60) return base * 0.78;
  return base;
}

interface TitlePart {
  text: string;
  highlight: boolean;
  /** Ce qui suit le passage sans espace (« colis » + « . ») : même mot. */
  tail: string;
}

/** Mots du titre, chacun à part pour que la ligne se coupe entre eux ; un
 * passage encadré de [[ ]] reste d'un seul tenant, sur le dégradé. */
function titleParts(title: string): TitlePart[] {
  const parts: TitlePart[] = [];
  title.split(HIGHLIGHT).forEach((segment, index) => {
    if (index % 2 === 1) {
      parts.push({ text: segment, highlight: true, tail: "" });
      return;
    }
    const words = segment.split(/\s+/);
    const glued = parts.at(-1);
    if (glued && words[0]) glued.tail += words.shift();
    for (const word of words.filter(Boolean)) {
      parts.push({ text: word, highlight: false, tail: "" });
    }
  });
  return parts;
}

function SlideImage({
  brand,
  slide,
  index,
  total,
  story,
  logo,
  screen,
}: {
  brand: Brand;
  slide: Slide;
  index: number;
  total: number;
  story: boolean;
  logo: string;
  /** Capture en data URI, ou null : image texte seul. */
  screen: string | null;
}) {
  const { theme } = brand;
  const cover = index === 1;
  const last = index === total;
  const accent = `linear-gradient(90deg, ${theme.accentFrom}, ${theme.accentTo})`;
  const size = titleSize(slide.title, cover, screen !== null);
  const [first, ...rest] = brand.name.split(" ");
  const pagination = last ? "" : `${index} / ${total}  →`;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        backgroundColor: theme.background,
        color: theme.foreground,
        fontFamily: "Geist",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -260,
          right: -260,
          width: 900,
          height: 900,
          display: "flex",
          borderRadius: 900,
          backgroundImage: `radial-gradient(circle, ${theme.accentTo}38, transparent 65%)`,
        }}
      />

      {screen ? (
        <div
          style={{
            position: "absolute",
            top: story ? PHONE.storyTop : PHONE.top,
            left: (FEED.width - PHONE.width) / 2,
            width: PHONE.width,
            display: "flex",
            padding: PHONE.bezel,
            borderRadius: PHONE.radius,
            backgroundColor: "#1b1714",
            border: `2px solid ${theme.muted}55`,
            boxShadow: `0 -30px 120px ${theme.accentTo}40`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- rendu next/og, pas de next/image */}
          <img
            src={screen}
            width={PHONE.width - 2 * PHONE.bezel}
            alt=""
            style={{ borderRadius: PHONE.radius - PHONE.bezel }}
          />
        </div>
      ) : null}

      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: screen ? "flex-start" : "space-between",
          gap: screen ? 44 : 0,
          // Les stories perdent le haut et le bas sous l'interface de l'appli.
          padding: story ? "260px 96px 300px" : "96px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 14,
                backgroundColor: theme.accentFrom,
              }}
            />
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: 6,
                textTransform: "uppercase",
                color: theme.accentFrom,
              }}
            >
              {slide.kicker || brand.name}
            </div>
          </div>
          {screen ? (
            <div style={{ fontSize: 28, color: theme.muted }}>{pagination}</div>
          ) : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              columnGap: size * 0.17,
              rowGap: size * 0.08,
              fontWeight: 800,
              fontSize: size,
              lineHeight: 1,
              letterSpacing: -size * 0.045,
            }}
          >
            {titleParts(slide.title).map((part, position) =>
              part.highlight ? (
                <div
                  key={position}
                  style={{ display: "flex", alignItems: "flex-end" }}
                >
                  <div
                    style={{
                      padding: `${size * 0.02}px ${size * 0.12}px ${size * 0.08}px`,
                      borderRadius: size * 0.12,
                      backgroundImage: accent,
                      color: theme.onAccent,
                    }}
                  >
                    {part.text}
                  </div>
                  {part.tail ? (
                    <div style={{ paddingBottom: size * 0.08 }}>{part.tail}</div>
                  ) : null}
                </div>
              ) : (
                <div key={position}>{part.text + part.tail}</div>
              ),
            )}
          </div>
          {slide.body ? (
            <div
              style={{
                marginTop: screen ? 28 : 48,
                fontSize: screen ? 34 : 40,
                lineHeight: 1.4,
                letterSpacing: -0.5,
                color: theme.muted,
              }}
            >
              {slide.body}
            </div>
          ) : null}
          {last ? (
            <div style={{ display: "flex", marginTop: 60 }}>
              <div
                style={{
                  padding: "24px 48px",
                  borderRadius: 999,
                  backgroundImage: accent,
                  color: theme.onAccent,
                  fontSize: 38,
                  fontWeight: 800,
                  letterSpacing: -1,
                }}
              >
                {brand.url}
              </div>
            </div>
          ) : null}
        </div>

        {screen ? null : (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 28,
              color: theme.muted,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- rendu next/og, pas de next/image */}
              <img src={logo} width={44} height={44} alt="" />
              <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 38 }}>
                <span style={{ color: theme.accentFrom }}>{first}</span>
                {rest.length ? (
                  <span style={{ marginLeft: 10, color: theme.foreground }}>
                    {rest.join(" ")}
                  </span>
                ) : null}
              </div>
            </div>
            <div>{pagination}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ postId: string; file: string }> },
) {
  const { postId, file } = await params;
  const index = Number(/^(\d+)\.jpg$/.exec(file)?.[1]);
  if (!UUID.test(postId) || !Number.isInteger(index)) {
    return new Response("Not found", { status: 404 });
  }

  const { data: post } = await createAdminClient()
    .from("social_posts")
    .select("brand, slides")
    .eq("id", postId)
    .maybeSingle();
  const slides = (post?.slides ?? []) as unknown as Slide[];
  const brand = post ? BRAND_BY_ID.get(post.brand as Brand["id"]) : undefined;
  const slide = slides[index - 1];
  if (!brand || !slide) return new Response("Not found", { status: 404 });

  const url = new URL(request.url);
  const story = url.searchParams.get("format") === "story";
  const [{ fonts, logo }, screen] = await Promise.all([
    loadAssets(),
    loadScreen(slide.screen, url.origin),
  ]);
  const png = await new ImageResponse(
    (
      <SlideImage
        brand={brand}
        slide={slide}
        index={index}
        total={slides.length}
        story={story}
        logo={logo}
        screen={screen}
      />
    ),
    { ...(story ? STORY : FEED), fonts },
  ).arrayBuffer();
  const jpeg = await sharp(Buffer.from(png))
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();

  return new Response(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
