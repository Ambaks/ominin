import { Wordmark } from "@/components/brand/wordmark";

/** Marque Ominin Agents : « Ominin » en braise, « Agents » en clair. */
export function AgentsWordmark({ className }: { className?: string }) {
  return <Wordmark suffix="Agents" className={className} />;
}
