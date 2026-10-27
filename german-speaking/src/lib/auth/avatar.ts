// Initials and a stable background colour for users without a photo (client and server).

/** One letter for Arabic names ("م" for محمد), two initials for Latin names ("ME" for Mohammed Emad). */
export function initialsOf(name: string | null | undefined, username = ""): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return (username[0] ?? "?").toUpperCase();
  const first = Array.from(words[0])[0] ?? "?";
  if (/[؀-ۿ]/.test(first)) return first;
  const last = words.length > 1 ? (Array.from(words[words.length - 1])[0] ?? "") : "";
  return (first + (/[A-Za-zÀ-ɏ]/.test(last) ? last : "")).toUpperCase();
}

/** The same username always gets the same colour; dark enough for white text. */
export function colorFor(username: string): string {
  let h = 0;
  for (const ch of username) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return `hsl(${h % 360} 55% 42%)`;
}
