"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminBasePath } from "@/lib/admin/base-path";

/*
 * Anciennes adresses de la prospection (/emails, puis /lea), encore citées
 * par les e-mails de notification déjà envoyés.
 */
export default function ProspectionRedirect() {
  const router = useRouter();
  const { basePath } = useAdminBasePath();
  useEffect(() => {
    router.replace(`${basePath}/prospection`);
  }, [router, basePath]);
  return null;
}
