import type { Metadata, Viewport } from "next";
import { Mesh } from "@/components/gestion/ui";
import { HotelsFaq, HotelsFinalCta, HotelsFooter, HotelsNav, HotelsObjective } from "@/components/hotels/chrome";
import { HotelsHero } from "@/components/hotels/hero";
import { HotelsDirection, HotelsInfrastructure, HotelsTeam } from "@/components/hotels/operations";
import { HotelsRoomService } from "@/components/hotels/room-service";
import { HotelsCachet, HotelsSpaces } from "@/components/hotels/spaces";
import { HotelsFolio, HotelsGuest, HotelsStay } from "@/components/hotels/stay";
import { hotelsSans, hotelsSerif } from "@/components/hotels/font";
import { kitFont } from "@/components/landing-kit/font";
import { hotelsBrand, seo } from "@/lib/hotels-landing-data";
import { hotelsSiteUrl } from "@/lib/site";
import "@/components/landing-kit/kit.css";
import "@/components/hotels/hotels.css";

// Canonical absolu : la réécriture du proxy rend cette page accessible à la
// fois sur hotels.ominin.com et ominin.com/hotels — une seule URL fait foi.
export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  alternates: { canonical: hotelsSiteUrl },
  openGraph: {
    title: seo.title,
    description: seo.description,
    type: "website",
    siteName: hotelsBrand,
    locale: "fr_FR",
    url: hotelsSiteUrl,
    images: [{ url: "/logo.png", width: 512, height: 512, alt: hotelsBrand }],
  },
  twitter: {
    card: "summary_large_image",
    title: seo.title,
    description: seo.description,
    images: ["/logo.png"],
  },
};

/* La nuit marine de la landing, à la place du brun du portail. */
export const viewport: Viewport = {
  themeColor: "#131729",
};

export default function HotelsHome() {
  return (
    <div className={`hotels kit-landing g-titres flex flex-1 flex-col ${kitFont.variable} ${hotelsSerif.variable} ${hotelsSans.variable}`}>
      <Mesh />
      <div className="relative z-1 flex flex-1 flex-col">
        <HotelsNav />
        <main className="overflow-x-clip">
          <HotelsHero />
          <HotelsSpaces />
          <HotelsCachet />
          <HotelsRoomService />
          <HotelsFolio />
          <HotelsStay />
          <HotelsGuest />
          <HotelsTeam />
          <HotelsDirection />
          <HotelsInfrastructure />
          <HotelsObjective />
          <HotelsFaq />
          <HotelsFinalCta />
        </main>
        <HotelsFooter />
      </div>
    </div>
  );
}
