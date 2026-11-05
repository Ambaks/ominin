import type { Metadata } from "next";
import { Lost } from "@/components/hotels/demo/ui";
import { demoNotFound, gestion } from "@/lib/hotels-demo-data";

export const metadata: Metadata = { title: gestion.seo.page(demoNotFound.title) };

export default function HotelsDemoNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-[32rem] flex-1 flex-col justify-center px-4">
      <Lost copy={demoNotFound.client} />
    </main>
  );
}
