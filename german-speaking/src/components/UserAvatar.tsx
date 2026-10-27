"use client";

import { colorFor, initialsOf } from "@/lib/auth/avatar";

/** Round profile picture: the photo, or initials on a colour derived from the username. */
export function UserAvatar({ name, username, photo, size = 36, className = "" }: { name: string; username: string; photo: string | null; size?: number; className?: string }) {
  const style = { width: size, height: size };
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element -- tiny avatar from Blob or a data: URL
    return <img src={photo} alt="" style={style} className={`rounded-full object-cover shrink-0 ${className}`} />;
  }
  const initials = initialsOf(name, username);
  return (
    <span
      aria-hidden="true"
      style={{ ...style, background: colorFor(username || name), fontSize: size * (initials.length > 1 ? 0.38 : 0.46) }}
      className={`rounded-full shrink-0 grid place-items-center text-white font-bold select-none ${className}`}
    >
      {initials}
    </span>
  );
}
