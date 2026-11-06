import { permanentRedirect } from "next/navigation";
import { bulleUrl } from "@/lib/bulles/links";

/* La réservation est sous /bulle ; le pluriel, qu'on tape volontiers, y mène aussi. */
export default async function BullesAlias({ params }: PageProps<"/menu/w/[slug]/bulles">) {
  const { slug } = await params;
  permanentRedirect(bulleUrl(slug));
}
