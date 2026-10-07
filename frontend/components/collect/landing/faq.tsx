import { KitFaq } from "@/components/landing-kit/faq";
import { faqSection } from "@/lib/collect-landing-data";

export function CollectFaq() {
  return (
    <KitFaq
      id={faqSection.id}
      eyebrow={faqSection.eyebrow}
      title={faqSection.title}
      items={faqSection.items}
    />
  );
}
