"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// ⭐ "Reviews": one small button (the size of «افتح الخطة») that opens the public reviews page.
// Wide screens: it sits under the profile circle; elsewhere it is placed inline by the page.

export function ReviewsButton({ floating = false }: { floating?: boolean }) {
  // The floating one goes straight into <body>: inside the animated (transformed) page a "fixed"
  // element would move with the page instead of staying under the profile circle.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const button = (
    <a
      href="/reviews"
      lang="en"
      data-testid={floating ? "reviews-button-floating" : "reviews-button"}
      className={`${floating ? "fixed top-24 z-20 hidden min-[1360px]:inline-flex" : "inline-flex"} items-center justify-center rounded-full px-5 min-h-[42px] text-sm font-bold tracking-wide text-white shadow-md transition hover:brightness-110 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2`}
      style={{
        background: "linear-gradient(135deg, #7c3aed, #db2777)",
        // Under the profile circle: lined up with the header's edge (max-w-7xl + its padding).
        ...(floating ? { insetInlineEnd: "max(1rem, calc((100vw - 80rem) / 2 + 1rem))" } : {}),
      }}
    >
      Reviews
    </a>
  );
  if (!floating) return button;
  return mounted ? createPortal(button, document.body) : null;
}
