import { KitFaq } from "@/components/landing-kit/faq";
import { faqSection } from "@/lib/landing-data";

export function Faq() {
  return (
    <KitFaq id={faqSection.id} eyebrow={faqSection.eyebrow} title={faqSection.title} items={faqSection.items} />
  );
}
