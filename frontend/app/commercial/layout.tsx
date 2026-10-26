import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Espace commercial — Ominin",
  robots: { index: false, follow: false },
};

export default function CommercialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
