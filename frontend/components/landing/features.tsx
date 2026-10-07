import { KitBars, KitBento } from "@/components/landing-kit/bento";
import { featuresSection } from "@/lib/landing-data";

/*
 * Commande → ticket cuisine, en médiane, mesuré en service chez un client
 * (rapport public anonymisé /r7k2) : à table 18 s, au comptoir 4 min 39.
 */
const atTableSeconds = 18;
const atCounterSeconds = 4 * 60 + 39;

export function Features() {
  return (
    <KitBento
      id={featuresSection.id}
      eyebrow={featuresSection.eyebrow}
      title={featuresSection.title}
      items={featuresSection.features}
      lead={
        <KitBars
          rows={[
            { label: "Commande au comptoir", value: "4 min 39", share: 1 },
            {
              label: "Commande à table, avec Ominin",
              value: `${atTableSeconds} s`,
              share: atTableSeconds / atCounterSeconds,
              ember: true,
            },
          ]}
        />
      }
    />
  );
}
