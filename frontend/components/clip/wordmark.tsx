import { Wordmark } from "@/components/brand/wordmark";

/** Marque Ominin Clip : « Ominin » en braise, « Clip » en clair. */
export function ClipWordmark({ className }: { className?: string }) {
  return <Wordmark suffix="Clip" className={className} />;
}
