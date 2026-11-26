/**
 * /admin — redirects to /admin/dashboard
 * Static redirect using a meta-refresh and a JS redirect for speed.
 * Compatible with output: "export".
 */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminRoot() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/dashboard");
  }, [router]);

  return (
    <div className="flex h-full items-center justify-center p-8">
      <p className="font-mono text-micro uppercase tracking-[0.16em] text-[var(--color-subtle)]">
        Redirecting…
      </p>
    </div>
  );
}
