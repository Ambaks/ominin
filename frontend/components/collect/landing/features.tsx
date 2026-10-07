import { KitBars, KitBento } from "@/components/landing-kit/bento";
import { comparisonSection, featuresSection } from "@/lib/collect-landing-data";

/** Les deux commissions côte à côte, à l'échelle : ce que dit « jusqu'à 6× ». */
const { platform, ominin } = comparisonSection;

export function CollectFeatures() {
  return (
    <KitBento
      id={featuresSection.id}
      eyebrow={featuresSection.eyebrow}
      title={featuresSection.title}
      items={featuresSection.features}
      lead={
        <KitBars
          rows={[platform, ominin].map((row) => ({
            label: row.label,
            value: `${Math.round(row.rate * 100)}\u00a0%`,
            share: row.rate / platform.rate,
            ember: row === ominin,
          }))}
        />
      }
    />
  );
}
