import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { BRAND_BY_ID, type Brand, type Slide } from "@/lib/social/brands";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Image n d'une publication : /api/social/slides/<post>/<n>.jpg. Route
 * publique à dessein — Instagram et Facebook viennent chercher chaque image
 * à son URL au moment de publier, et l'admin s'en sert pour l'aperçu et le
 * téléchargement Snapchat. Elle ne rend que ce que l'agent a enregistré en
 * base (aucun texte ne vient de l'URL), et l'identifiant est un uuid.
 *
 * Le rendu est déterministe : une publication ne change plus une fois
 * écrite, d'où le cache immuable.
 */

/* Formats imposés par les réseaux : portrait 4:5 du fil, 9:16 des stories. */
const FEED = { width: 1080, height: 1350 };
const STORY = { width: 1080, height: 1920 };
/* Instagram n'accepte que le JPEG ; next/og ne produit que du PNG. */
const JPEG_QUALITY = 90;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const font = (file: string) =>
  readFile(join(process.cwd(), "assets/fonts", file));

let fonts: Promise<
  { name: string; data: Buffer; weight: 400 | 500 | 600; style: "normal" }[]
> | null = null;

function loadFonts() {
  fonts ??= Promise.all([
    font("fraunces-latin-500-normal.woff"),
    font("instrument-sans-latin-400-normal.woff"),
    font("instrument-sans-latin-600-normal.woff"),
  ]).then(([display, sans, sansBold]) => [
    { name: "Fraunces", data: display, weight: 500, style: "normal" },
    { name: "Instrument Sans", data: sans, weight: 400, style: "normal" },
    { name: "Instrument Sans", data: sansBold, weight: 600, style: "normal" },
  ]);
  return fonts;
}

/** Le corps du titre suit sa longueur : le rédacteur vise 70 caractères,
 * mais rien ne doit déborder s'il en écrit davantage. */
function titleSize(title: string, cover: boolean): number {
  const base = cover ? 104 : 76;
  if (title.length > 90) return base * 0.62;
  if (title.length > 60) return base * 0.78;
  return base;
}

function SlideImage({
  brand,
  slide,
  index,
  total,
  story,
}: {
  brand: Brand;
  slide: Slide;
  index: number;
  total: number;
  story: boolean;
}) {
  const { theme } = brand;
  const cover = index === 1;
  const last = index === total;
  const accent = `linear-gradient(90deg, ${theme.accentFrom}, ${theme.accentTo})`;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        // Les stories perdent le haut et le bas sous l'interface de l'appli.
        padding: story ? "260px 96px 300px" : "96px",
        backgroundColor: theme.background,
        color: theme.foreground,
        fontFamily: "Instrument Sans",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            width: 120,
            height: 10,
            borderRadius: 5,
            backgroundImage: accent,
          }}
        />
        {slide.kicker ? (
          <div
            style={{
              marginTop: 48,
              fontSize: 30,
              fontWeight: 600,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: theme.accentFrom,
            }}
          >
            {slide.kicker}
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontFamily: "Fraunces",
            fontWeight: 500,
            fontSize: titleSize(slide.title, cover),
            lineHeight: 1.08,
            letterSpacing: -1,
          }}
        >
          {slide.title}
        </div>
        {slide.body ? (
          <div
            style={{
              marginTop: 44,
              fontSize: 40,
              lineHeight: 1.4,
              color: theme.muted,
            }}
          >
            {slide.body}
          </div>
        ) : null}
        {last ? (
          <div style={{ display: "flex", marginTop: 56 }}>
            <div
              style={{
                padding: "22px 44px",
                borderRadius: 999,
                backgroundImage: accent,
                color: theme.onAccent,
                fontSize: 36,
                fontWeight: 600,
              }}
            >
              {brand.url}
            </div>
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 28,
          color: theme.muted,
        }}
      >
        <div style={{ fontFamily: "Fraunces", fontSize: 36, color: theme.foreground }}>
          {brand.name}
        </div>
        <div>{last ? "" : `${index} / ${total}  →`}</div>
      </div>
    </div>
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ postId: string; file: string }> }
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

  const story = new URL(request.url).searchParams.get("format") === "story";
  const png = await new ImageResponse(
    (
      <SlideImage
        brand={brand}
        slide={slide}
        index={index}
        total={slides.length}
        story={story}
      />
    ),
    { ...(story ? STORY : FEED), fonts: await loadFonts() }
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
