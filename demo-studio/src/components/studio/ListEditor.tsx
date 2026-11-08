"use client";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { uid } from "@/lib/demo/model";
import { Icon } from "./Icon";

export type FieldSpec<T> = { key: keyof T & string; label: string; multiline?: boolean; placeholder?: string; half?: boolean; dir?: "ltr" };

/** Editable list: add, delete, reorder by drag-and-drop (or the keyboard arrows). */
export function ListEditor<T extends { id: string }>({
  items, onChange, fields, titleKey, addLabel, blank, max = 30, extra,
}: {
  items: T[]; onChange: (v: T[]) => void; fields: FieldSpec<T>[]; titleKey: keyof T & string; addLabel: string;
  blank: () => Omit<T, "id">; max?: number; extra?: (item: T, set: (patch: Partial<T>) => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const dragId = useRef<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  const set = (id: string, patch: Partial<T>) => onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = items.slice();
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {items.map((it, i) => {
          const isOpen = open === it.id;
          return (
            <motion.div key={it.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
              draggable onDragStart={() => { dragId.current = it.id; }} onDragEnd={() => { dragId.current = null; setOver(null); }}
              onDragOver={(e) => { e.preventDefault(); setOver(it.id); }}
              onDrop={(e) => { e.preventDefault(); const from = items.findIndex((x) => x.id === dragId.current); if (from >= 0) move(from, i); setOver(null); }}
              className={`rounded-2xl border bg-ink-1 transition-colors ${over === it.id ? "border-cobalt" : "border-white/[.08]"}`}>
              <div className="flex items-center gap-1.5 p-2">
                <span className="cursor-grab text-fg3 px-1 active:cursor-grabbing" title="اسحب لترتيب" aria-hidden><Icon name="grip" size={16} /></span>
                <button type="button" onClick={() => setOpen(isOpen ? null : it.id)} aria-expanded={isOpen} className="flex-1 min-w-0 text-start px-2 py-1.5 rounded-lg hover:bg-white/[.04]">
                  <span className="block truncate text-[14.5px]">{String(it[titleKey] || "—")}</span>
                </button>
                <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} className="btn btn-ghost btn-sm px-2 border-0" aria-label="لفوق"><Icon name="up" size={15} /></button>
                <button type="button" onClick={() => move(i, i + 1)} disabled={i === items.length - 1} className="btn btn-ghost btn-sm px-2 border-0" aria-label="لتحت"><Icon name="down" size={15} /></button>
                <button type="button" onClick={() => onChange(items.filter((x) => x.id !== it.id))} className="btn btn-ghost btn-sm px-2 border-0 text-[#ff8a8f]" aria-label={`امسح ${String(it[titleKey] || "")}`}><Icon name="trash" size={15} /></button>
              </div>
              {isOpen && (
                <div className="grid grid-cols-2 gap-3 px-3 pb-3">
                  {fields.map((f) => (
                    <label key={f.key} className={f.half ? "col-span-1" : "col-span-2"}>
                      <span className="label">{f.label}</span>
                      {f.multiline ? (
                        <textarea rows={2} className="field" value={String(it[f.key] ?? "")} placeholder={f.placeholder} onChange={(e) => set(it.id, { [f.key]: e.target.value } as Partial<T>)} />
                      ) : (
                        <input className="field" dir={f.dir} value={String(it[f.key] ?? "")} placeholder={f.placeholder} onChange={(e) => set(it.id, { [f.key]: e.target.value } as Partial<T>)} />
                      )}
                    </label>
                  ))}
                  {extra && <div className="col-span-2">{extra(it, (p) => set(it.id, p))}</div>}
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
      {items.length < max && (
        <button type="button" onClick={() => { const n = { ...blank(), id: uid("i") } as T; onChange([...items, n]); setOpen(n.id); }}
          className="w-full rounded-2xl border border-dashed border-white/15 py-2.5 text-sm text-fg2 hover:text-ivory hover:border-white/30 transition flex items-center justify-center gap-1.5">
          <Icon name="plus" size={15} />{addLabel}
        </button>
      )}
    </div>
  );
}
