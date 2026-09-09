"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminBasePath } from "@/lib/admin/base-path";

export default function EmailsRedirect() {
  const router = useRouter();
  const { basePath } = useAdminBasePath();
  useEffect(() => {
    router.replace(`${basePath}/lea`);
  }, [router, basePath]);
  return null;
}
