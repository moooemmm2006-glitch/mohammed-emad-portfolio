"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-renders the server page when the live poller sees new engagement. */
export function RefreshOnActivity() {
  const router = useRouter();
  useEffect(() => {
    const h = () => router.refresh();
    window.addEventListener("studio:activity", h);
    return () => window.removeEventListener("studio:activity", h);
  }, [router]);
  return null;
}
