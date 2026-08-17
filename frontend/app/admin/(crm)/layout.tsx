import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/shell";

export const metadata: Metadata = {
  title: "CRM — Ominin Admin",
  // robots.txt ne peut pas interdire « / » pour le seul host admin : le
  // noindex au niveau de l'arbre est la vraie barrière d'indexation.
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AdminShell>{children}</AdminShell>;
}
