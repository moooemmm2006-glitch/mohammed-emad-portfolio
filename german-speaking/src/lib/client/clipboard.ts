// Copy text everywhere: the Clipboard API, and the old hidden-textarea + execCommand("copy") way
// for browsers or contexts where the API is missing or refused (older iOS Safari, http, some WebViews).

/** Synchronous copy; must run inside the tap/click. Works on iOS Safari too. */
export function legacyCopy(text: string): boolean {
  if (typeof document === "undefined") return false;
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.setAttribute("aria-hidden", "true");
  // Visible to the browser but not to the user; 16px stops iOS from zooming in.
  Object.assign(ta.style, { position: "fixed", top: "0", insetInlineStart: "0", width: "1px", height: "1px", opacity: "0", fontSize: "16px", border: "0", padding: "0" });
  document.body.appendChild(ta);
  const sel = document.getSelection();
  const before = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
  let ok = false;
  try {
    // iOS needs a real selection range on an editable node.
    ta.contentEditable = "true";
    const range = document.createRange();
    range.selectNodeContents(ta);
    sel?.removeAllRanges();
    sel?.addRange(range);
    ta.select();
    ta.setSelectionRange(0, text.length);
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  ta.remove();
  if (sel) {
    sel.removeAllRanges();
    if (before) sel.addRange(before);
  }
  return ok;
}

const hasClipboardApi = () => typeof navigator !== "undefined" && typeof navigator.clipboard?.writeText === "function" && window.isSecureContext;

/** Clipboard API first, then the fallback. */
export async function copyText(text: string): Promise<boolean> {
  if (hasClipboardApi()) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // refused (no focus, permissions): fall through
    }
  }
  return legacyCopy(text);
}

/**
 * Copy and open a page in a new tab with ONE tap. The tab is opened synchronously, before any
 * async copy finishes, so Safari (iOS) doesn't block it as a popup. The synchronous copy runs first,
 * while this page still has focus; the Clipboard API is the backup.
 */
export function copyAndOpen(text: string, url: string): Promise<boolean> {
  const copied = legacyCopy(text);
  const later = copied ? Promise.resolve(true) : hasClipboardApi() ? navigator.clipboard.writeText(text).then(() => true, () => false) : Promise.resolve(false);
  window.open(url, "_blank", "noopener,noreferrer");
  return later;
}
