import type { ShopFaqItem } from "@/lib/shop/types";
import { ChevronDownIcon } from "../icons";
import { Multiline } from "./ui";

/** Accordéon natif (details/summary) : fonctionne sans JavaScript. */
export function FaqAccordion({ items }: { items: ShopFaqItem[] }) {
  if (items.length === 0) return <p className="text-sm text-shop-ink-soft">Les questions fréquentes arrivent bientôt.</p>;
  return (
    <div className="flex flex-col divide-y divide-shop-line rounded-[24px] border border-shop-line bg-shop-paper px-6">
      {items.map((item, i) => (
        <details key={item.id} className="group" open={i === 0}>
          <summary className="flex cursor-pointer items-center justify-between gap-6 py-5 text-[15px] font-medium text-shop-ink">
            {item.question}
            <ChevronDownIcon className="size-[18px] shrink-0 text-shop-ink-soft transition-transform group-open:rotate-180" />
          </summary>
          <div className="pb-6">
            <Multiline text={item.answer} className="text-sm" />
          </div>
        </details>
      ))}
    </div>
  );
}
