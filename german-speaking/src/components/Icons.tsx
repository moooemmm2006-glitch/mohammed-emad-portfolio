// Minimal stroke icon set (24×24, currentColor).
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function I({ size = 20, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

export const IconMic = (p: P) => (
  <I {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </I>
);
export const IconHome = (p: P) => (
  <I {...p}>
    <path d="M3 11l9-7 9 7M5 10v10h14V10" />
  </I>
);
/** 🎯 Productivity: a target with an arrow. */
export const IconProductivity = (p: P) => (
  <I {...p}>
    <circle cx="11" cy="13" r="8" />
    <circle cx="11" cy="13" r="4" />
    <path d="M11 13l8.5-8.5M16.5 4.5h3v3" />
  </I>
);
export const IconChart = (p: P) => (
  <I {...p}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </I>
);
export const IconFile = (p: P) => (
  <I {...p}>
    <path d="M14 3H6v18h12V7zM14 3v4h4M9 12h6M9 16h6" />
  </I>
);
export const IconGear = (p: P) => (
  <I {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </I>
);
export const IconSun = (p: P) => (
  <I {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </I>
);
export const IconMoon = (p: P) => (
  <I {...p}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </I>
);
export const IconRepeat = (p: P) => (
  <I {...p}>
    <path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3" />
  </I>
);
export const IconSlow = (p: P) => (
  <I {...p}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2 2M10 2h4" />
  </I>
);
export const IconHelp = (p: P) => (
  <I {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" />
  </I>
);
export const IconEye = (p: P) => (
  <I {...p}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
    <circle cx="12" cy="12" r="3" />
  </I>
);
export const IconEyeOff = (p: P) => (
  <I {...p}>
    <path d="M17.9 17.9A10 10 0 0 1 12 20C5 20 1 12 1 12a18 18 0 0 1 5-5.9M9.9 4.2A9 9 0 0 1 12 4c7 0 11 8 11 8a18 18 0 0 1-2.2 3.2M14.1 14.1a3 3 0 1 1-4.2-4.2M1 1l22 22" />
  </I>
);
export const IconStop = (p: P) => (
  <I {...p}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </I>
);
export const IconSend = (p: P) => (
  <I {...p}>
    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
  </I>
);
export const IconMenu = (p: P) => (
  <I {...p}>
    <path d="M3 6h18M3 12h18M3 18h18" />
  </I>
);
export const IconX = (p: P) => (
  <I {...p}>
    <path d="M18 6L6 18M6 6l12 12" />
  </I>
);
export const IconFlame = (p: P) => (
  <I {...p}>
    <path d="M12 22c4 0 7-3 7-7 0-5-5-7-5-12-3 2-4 5-4 7-1-1-2-2-2-4-2 2-3 5-3 9 0 4 3 7 7 7z" />
  </I>
);
export const IconClock = (p: P) => (
  <I {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </I>
);
export const IconTrash = (p: P) => (
  <I {...p}>
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
  </I>
);
export const IconDownload = (p: P) => (
  <I {...p}>
    <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
  </I>
);
export const IconUpload = (p: P) => (
  <I {...p}>
    <path d="M12 21V9M7 14l5-5 5 5M5 3h14" />
  </I>
);
export const IconPlay = (p: P) => (
  <I {...p}>
    <path d="M6 4l14 8-14 8z" />
  </I>
);
export const IconSparkle = (p: P) => (
  <I {...p}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8z" />
  </I>
);
export const IconBook = (p: P) => (
  <I {...p}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
  </I>
);
export const IconArrow = (p: P) => (
  <I {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </I>
);
export const IconCamera = (p: P) => (
  <I {...p}>
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </I>
);
export const IconLogout = (p: P) => (
  <I {...p}>
    <path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10" />
  </I>
);
export const IconKey = (p: P) => (
  <I {...p}>
    <circle cx="8" cy="15" r="4" />
    <path d="M11 12l9-9M16 7l3 3M14 9l2 2" />
  </I>
);
export const IconPen = (p: P) => (
  <I {...p}>
    <path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" />
  </I>
);
export const IconShield = (p: P) => (
  <I {...p}>
    <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
  </I>
);
export const IconHeadphones = (p: P) => (
  <I {...p}>
    <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
    <rect x="3" y="14" width="4" height="7" rx="1.5" />
    <rect x="17" y="14" width="4" height="7" rx="1.5" />
  </I>
);
/** Our own simple "play video" mark (a rounded red box with a white triangle), not YouTube's logo file. */
export const IconVideoPlay = ({ size = 20, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
    <rect x="1.5" y="4.5" width="21" height="15" rx="4.5" fill="#e11d2e" />
    <path d="M10 9l5.2 3L10 15z" fill="#fff" />
  </svg>
);
/** Sprachcafé: two speech bubbles (a conversation), the second one with three dots. */
export const IconSprachcafe = (p: P) => (
  <I {...p}>
    <path d="M15 8.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h1v3l3.2-3" />
    <path d="M11 10.5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4.5a2 2 0 0 1-2 2h-.5V20l-3.5-3H13a2 2 0 0 1-2-2z" />
    <path d="M14.2 12.75h.01M16 12.75h.01M17.8 12.75h.01" strokeWidth={2.4} />
  </I>
);

/** WhatsApp glyph (filled, green circle) — used to point to the Sprachcafé WhatsApp group. */
export function IconWhatsApp({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label="WhatsApp">
      <circle cx="16" cy="16" r="16" fill="#25D366" />
      <path fill="#fff" d="M16.02 6.5a9.43 9.43 0 0 0-8.08 14.3L6.5 25.5l4.83-1.4a9.43 9.43 0 1 0 4.69-17.6Zm0 17.2a7.8 7.8 0 0 1-3.98-1.09l-.29-.17-2.87.83.85-2.8-.19-.3a7.78 7.78 0 1 1 6.48 3.53Zm4.28-5.83c-.23-.12-1.38-.68-1.6-.76-.21-.08-.37-.12-.52.12-.16.23-.6.76-.74.91-.14.16-.27.18-.5.06a6.37 6.37 0 0 1-1.88-1.16 7.05 7.05 0 0 1-1.3-1.62c-.14-.23 0-.36.1-.47.1-.11.23-.27.35-.41.12-.14.16-.23.23-.39.08-.16.04-.29-.02-.41-.06-.12-.52-1.26-.72-1.72-.19-.45-.38-.39-.52-.4h-.45a.86.86 0 0 0-.62.3 2.6 2.6 0 0 0-.82 1.94 4.52 4.52 0 0 0 .95 2.4 10.36 10.36 0 0 0 3.97 3.5c.55.24.99.39 1.32.5.56.17 1.07.15 1.47.09.45-.07 1.38-.56 1.57-1.11.2-.55.2-1.02.14-1.11-.06-.1-.21-.16-.44-.27Z" />
    </svg>
  );
}

/** Calendar glyph in a blue circle — "pick a session" step in the Sprachcafé hero. */
export function IconCalendarBadge({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label="Calendar">
      <circle cx="16" cy="16" r="16" fill="#2563eb" />
      <rect x="8.5" y="10" width="15" height="13.5" rx="2.5" fill="#fff" />
      <rect x="8.5" y="10" width="15" height="4" rx="2" fill="#bfdbfe" />
      <path d="M12 8v4M20 8v4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <g fill="#2563eb"><circle cx="12.5" cy="17.5" r="1.2" /><circle cx="16" cy="17.5" r="1.2" /><circle cx="19.5" cy="17.5" r="1.2" /><circle cx="12.5" cy="21" r="1.2" /><circle cx="16" cy="21" r="1.2" /></g>
    </svg>
  );
}

/** Video-call + speech glyph in a teal circle — "join the live session and talk" step (generic, not a brand logo). */
export function IconVideoTalkBadge({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label="Video call">
      <circle cx="16" cy="16" r="16" fill="#0d9488" />
      <rect x="7" y="11" width="13" height="10" rx="2.5" fill="#fff" />
      <path d="M20 14.5l5-3v9l-5-3z" fill="#fff" />
      <path d="M10.5 15h6M10.5 17.5h4" stroke="#0d9488" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
