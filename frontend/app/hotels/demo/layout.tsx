import type { Viewport } from "next";
import type { ReactNode } from "react";
import { Mesh } from "@/components/gestion/ui";
import { hotelsSans, hotelsSerif } from "@/components/hotels/font";
import { kitFont } from "@/components/landing-kit/font";
import "@/components/landing-kit/kit.css";
import "@/components/hotels/hotels.css";
import "@/components/hotels/demo/demo.css";

export const viewport: Viewport = {
  themeColor: "#131729",
};

/* La démo client, dans la nuit marine et le laiton de la landing hôtels. */
export default function HotelsDemoLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`hotels kit-landing g-titres flex min-h-dvh flex-1 flex-col ${kitFont.variable} ${hotelsSerif.variable} ${hotelsSans.variable}`}>
      <Mesh />
      <div className="relative z-1 flex flex-1 flex-col">{children}</div>
    </div>
  );
}
