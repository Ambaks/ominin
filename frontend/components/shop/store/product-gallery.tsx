"use client";

import { useState } from "react";
import type { ShopProductBadge, ShopProductImage } from "@/lib/shop/types";
import { GiftIcon } from "../icons";
import { ProductBadge } from "./ui";

export function ProductGallery({ images, name, badge }: { images: ShopProductImage[]; name: string; badge: ShopProductBadge | null }) {
  const [index, setIndex] = useState(0);
  const current = images[index] ?? images[0];
  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[24px] bg-shop-tint md:rounded-[28px]">
        {current ? (
          <img key={current.id} src={current.url} alt={current.alt ?? name} className="size-full object-cover object-[50%_55%]" />
        ) : (
          <div className="flex size-full items-center justify-center text-shop-accent-soft">
            <GiftIcon className="size-16" strokeWidth={1.1} />
          </div>
        )}
        {badge && <ProductBadge badge={badge} className="absolute left-5 top-5" />}
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-3">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Voir la photo ${i + 1}`}
              aria-pressed={i === index}
              className={`aspect-square overflow-hidden rounded-2xl border-2 transition ${i === index ? "border-shop-accent" : "border-transparent hover:border-shop-accent-soft"}`}
            >
              <img src={img.url} alt="" className="size-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
