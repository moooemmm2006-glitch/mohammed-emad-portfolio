"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IconX } from "./Icons";

/** Centred dialog (bottom sheet on phones). Esc and the backdrop close it; focus returns afterwards. */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const first = box.current?.querySelector<HTMLElement>("input, button:not([data-close]), [tabindex='0']");
    (first ?? box.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close.current();
      }
      // Keep Tab inside the dialog.
      if (e.key === "Tab" && box.current) {
        const items = [...box.current.querySelectorAll<HTMLElement>("button, input, a[href], [tabindex='0']")].filter((el) => !el.hasAttribute("disabled"));
        if (!items.length) return;
        const [a, z] = [items[0], items[items.length - 1]];
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          z.focus();
        } else if (!e.shiftKey && document.activeElement === z) {
          e.preventDefault();
          a.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      before?.focus?.();
    };
  }, []);

  // Portal to <body>: a parent with backdrop-filter (the sticky header) would otherwise trap "fixed".
  return createPortal(
    <div className="fixed inset-0 z-50 grid items-end sm:items-center justify-items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" data-close className="absolute inset-0 bg-black/50" aria-label="Close" tabIndex={-1} onClick={onClose} />
      <div ref={box} tabIndex={-1} className="relative w-full sm:max-w-md bg-surface rounded-t-3xl sm:rounded-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl max-h-[92dvh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" data-close className="btn btn-ghost !px-2 !min-h-[36px]" onClick={onClose} aria-label="Close">
            <IconX />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
