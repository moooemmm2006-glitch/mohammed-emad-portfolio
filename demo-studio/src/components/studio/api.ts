"use client";
/** Tiny fetch wrapper: JSON in/out, Arabic error messages. */
export async function api<T = unknown>(url: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(url, {
    method: opts.method || (opts.body ? "POST" : "GET"),
    headers: opts.body ? { "content-type": "application/json" } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  if (res.status === 401) {
    window.location.href = `/studio/login?next=${encodeURIComponent(location.pathname)}`;
    throw new Error("لازم تسجّل دخول الأول");
  }
  if (!res.ok) throw new Error(j.error || "حصلت مشكلة، جرّب تاني");
  return j as T;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}
