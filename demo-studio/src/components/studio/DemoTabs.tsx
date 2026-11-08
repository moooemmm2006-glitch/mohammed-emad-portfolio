import Link from "next/link";
import { Icon } from "./Icon";

const TABS = [
  { id: "edit", label: "تعديل", icon: "edit", href: (id: string) => `/studio/demos/${id}` },
  { id: "share", label: "ابعت", icon: "share", href: (id: string) => `/studio/demos/${id}/share` },
  { id: "activity", label: "النشاط", icon: "fire", href: (id: string) => `/studio/demos/${id}/activity` },
  { id: "site", label: "موقع حقيقي", icon: "globe", href: (id: string) => `/studio/demos/${id}/site` },
];

export function DemoTabs({ id, active }: { id: string; active: string }) {
  return (
    <nav className="flex gap-1 overflow-x-auto scrollbar-none mb-5 border-b border-white/[.06]" aria-label="أقسام النموذج">
      <Link href="/studio" className="flex items-center gap-1 h-10 px-3 text-sm text-fg3 hover:text-ivory"><Icon name="back" size={15} />النماذج</Link>
      {TABS.map((t) => (
        <Link key={t.id} href={t.href(id)} aria-current={active === t.id ? "page" : undefined}
          className={`flex items-center gap-1.5 h-10 px-3 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors ${active === t.id ? "border-cobalt text-ivory" : "border-transparent text-fg2 hover:text-ivory"}`}>
          <Icon name={t.icon} size={15} />{t.label}
        </Link>
      ))}
    </nav>
  );
}
