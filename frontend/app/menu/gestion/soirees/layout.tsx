import "@/components/club/tokens.css";
import "@/components/gestion/soirees/soirees.css";
import { clubFonts } from "@/lib/club/fonts";

/* Les écrans « Soirées » portent l'allure d'Ominin Club (ses jetons, ses polices), sous .soirees seulement. */
export default function SoireesLayout({ children }: { children: React.ReactNode }) {
  return <div className={`club-tokens soirees ${clubFonts}`}>{children}</div>;
}
