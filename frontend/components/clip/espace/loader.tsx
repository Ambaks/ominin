import { ClipWordmark } from "@/components/clip/wordmark";

/*
 * Écran de chargement de marque : trame timeline en filigrane, halo braise,
 * wordmark et barre indéterminée en dégradé ember. Remplace les squelettes
 * shimmer sur les attentes pleine page de l'espace (chargement initial,
 * lecture des analytics, streaming de route).
 */
export function ClipLoader({
  label = "Chargement de votre espace…",
}: {
  label?: string;
}) {
  return (
    <div
      aria-busy
      className="relative flex min-h-[50dvh] flex-col items-center justify-center overflow-hidden rounded-2xl border border-hairline bg-surface px-6 py-16 text-center"
    >
      <div
        className="clip-timeline-motif absolute inset-0 [mask-image:radial-gradient(ellipse_70%_80%_at_50%_40%,black,transparent)]"
        aria-hidden
      />
      <div className="ember-glow absolute inset-0" aria-hidden />

      <div className="relative flex flex-col items-center gap-4">
        <ClipWordmark className="text-2xl" />
        <p className="text-sm text-muted">{label}</p>
        <div className="h-1.5 w-56 overflow-hidden rounded-full bg-background/70">
          <div className="loader-bar ember-gradient h-full w-1/3 rounded-full" />
        </div>
      </div>
    </div>
  );
}
