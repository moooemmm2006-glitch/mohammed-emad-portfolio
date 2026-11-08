"use client";
import { useEffect, useState } from "react";
import type { DemoContent } from "@/lib/demo/model";
import { Template } from "@/templates/Template";

export function PreviewFrame() {
  const [data, setData] = useState<{ content: DemoContent; slug: string } | null>(null);
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "demo-preview") setData({ content: e.data.content, slug: e.data.slug });
      if (e.data?.type === "demo-scroll") document.getElementById(e.data.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    window.addEventListener("message", onMsg);
    window.parent.postMessage({ type: "demo-preview-ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMsg);
  }, []);
  if (!data) return <div className="grid min-h-dvh place-items-center bg-white text-[#6C707A]">…</div>;
  return <Template content={data.content} slug={data.slug} mode="preview" />;
}
