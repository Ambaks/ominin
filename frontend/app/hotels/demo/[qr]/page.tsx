import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RoomView } from "@/components/hotels/demo/room-view";
import { SpaceView } from "@/components/hotels/demo/space-view";
import { DemoProvider } from "@/components/hotels/demo/store";
import { demoNotFound, demoSeo, gestion, qrPoints } from "@/lib/hotels-demo-data";

/*
 * Ce que voit le client après avoir scanné un QR du Grand Large : l'accueil
 * du séjour depuis sa chambre, ou la carte d'un espace depuis un transat ou
 * une table. Démo : tout reste dans le navigateur, jamais indexée. Un QR
 * inconnu tombe sur le 404 de l'hôtel.
 */

export function generateStaticParams() {
  return qrPoints.map((point) => ({ qr: point.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ qr: string }> }): Promise<Metadata> {
  const { qr } = await params;
  const point = qrPoints.find((p) => p.id === qr);
  return {
    title: gestion.seo.page(point ? point.label : demoNotFound.title),
    description: demoSeo.description,
    robots: { index: false, follow: false },
  };
}

export default async function HotelsDemoQr({ params }: { params: Promise<{ qr: string }> }) {
  const { qr } = await params;
  const point = qrPoints.find((p) => p.id === qr);
  if (!point) notFound();
  return (
    <main className="mx-auto flex w-full max-w-[32rem] flex-1 flex-col px-4">
      <DemoProvider>{point.kind === "room" ? <RoomView /> : <SpaceView id={point.space} qr={point.id} qrLabel={point.label} />}</DemoProvider>
    </main>
  );
}
