import "@/components/gestion/soirees/soirees.css";
import { soireesFonts } from "@/lib/gestion/club-fonts";

/* Les écrans « Soirées » portent l'allure d'Ominin Club, sous .soirees seulement. */
export default function SoireesLayout({ children }: { children: React.ReactNode }) {
  return <div className={`soirees ${soireesFonts}`}>{children}</div>;
}
