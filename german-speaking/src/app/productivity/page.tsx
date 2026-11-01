"use client";

import { ProductivitySection } from "@/components/productivity/ProductivitySection";

/** 🎯 The full productivity section: every video and course, per creator. */
export default function ProductivityPage() {
  return (
    <div className="max-w-6xl mx-auto pb-6">
      <ProductivitySection headingLevel={1} />
    </div>
  );
}
