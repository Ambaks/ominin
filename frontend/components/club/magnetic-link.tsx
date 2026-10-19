"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMagnetic } from "@/components/club/use-magnetic";

/* Le lien principal d'une page serveur, attiré par le curseur (use-magnetic). */
export function MagneticLink({ href, className, children }: { href: string; className: string; children: ReactNode }) {
  const ref = useMagnetic<HTMLAnchorElement>();
  return (
    <Link ref={ref} href={href} className={`club-magnet ${className}`}>
      {children}
    </Link>
  );
}
