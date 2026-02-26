"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminLayout() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/photographer");
  }, [router]);

  return <div className="page-wrap text-sm text-muted">Redirecting to photographer dashboard...</div>;
}
