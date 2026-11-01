"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client/api";
import { authErrorText, useMe } from "@/lib/client/me";
import { useUI } from "@/lib/client/ui";
import { isLevel } from "@/lib/levels";
import type { TKey } from "@/lib/client/i18n";
import { FormError, PasswordField, TextField } from "./Fields";
import { IconCamera, IconSprachcafe, IconChart, IconFile, IconFlame, IconGear, IconKey, IconLogout, IconPen, IconShield, IconTrash, IconVideoPlay } from "./Icons";
import { useSite } from "./site/SiteProvider";
import { Modal } from "./Modal";
import { PHOTO_ACCEPT, PhotoCropper, checkPhotoFile } from "./PhotoCropper";
import { UserAvatar } from "./UserAvatar";

export async function uploadPhoto(blob: Blob): Promise<string> {
  const r = await api<{ photo: string }>("/api/me/photo", { method: "PUT", body: blob, headers: { "Content-Type": blob.type } });
  return r.photo;
}

type Dialog = "name" | "password" | null;

/** Google-style account circle in the header, with a dropdown card. */
export function ProfileMenu() {
  const { t } = useUI();
  const { me, logout, setUser } = useMe();
  const { links, openExplainer, trackClick } = useSite();
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Close on outside click and on Esc (focus goes back to the circle).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) wrap.current?.querySelector<HTMLElement>("[data-menu-item]")?.focus();
  }, [open]);

  useEffect(() => {
    if (!note) return;
    const id = setTimeout(() => setNote(null), 3000);
    return () => clearTimeout(id);
  }, [note]);

  if (!me) return null;
  const { user } = me;

  // Up/down arrows move between the menu buttons.
  const onMenuKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = [...(wrap.current?.querySelectorAll<HTMLElement>("[data-menu-item]") ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
  };

  const pickPhoto = () => fileInput.current?.click();
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const err = checkPhotoFile(f);
    if (err) return setNote(t(err));
    setOpen(false);
    setCropFile(f);
  };
  const savePhoto = async (blob: Blob) => {
    setSaving(true);
    try {
      setUser({ photo: await uploadPhoto(blob) });
      setCropFile(null);
      setNote(t("me_photo_done"));
    } catch (err) {
      setNote(authErrorText(err, t));
    } finally {
      setSaving(false);
    }
  };
  const removePhoto = async () => {
    await api("/api/me/photo", { method: "DELETE" }).catch(() => null);
    setUser({ photo: null });
  };

  const level = me.lastLevel && isLevel(me.lastLevel) ? me.lastLevel : null;

  return (
    <div ref={wrap} className="relative">
      <button
        ref={button}
        type="button"
        className="grid place-items-center rounded-full w-10 h-10 hover:ring-4 ring-surface-2 transition"
        aria-label={t("me_label")}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <UserAvatar name={user.name} username={user.username} photo={user.photo} size={36} />
      </button>
      <input ref={fileInput} type="file" accept={PHOTO_ACCEPT} className="hidden" onChange={onFile} />

      {note && (
        <p role="status" className="absolute top-full mt-2 end-0 z-50 w-64 card px-3 py-2 text-sm">
          {note}
        </p>
      )}

      {open && (
        <div
          role="dialog"
          aria-label={t("me_label")}
          onKeyDown={onMenuKey}
          className="fixed sm:absolute inset-x-3 sm:inset-x-auto top-14 sm:top-full sm:mt-2 sm:end-0 z-50 sm:w-80 card p-4 text-center max-h-[calc(100dvh-4.5rem)] overflow-y-auto"
        >
          <div className="relative w-20 h-20 mx-auto">
            <UserAvatar name={user.name} username={user.username} photo={user.photo} size={80} />
            <button
              type="button"
              data-menu-item
              onClick={pickPhoto}
              className="absolute -bottom-1 -end-1 grid place-items-center w-8 h-8 rounded-full bg-surface border border-line shadow"
              aria-label={t("me_change_photo")}
            >
              <IconCamera size={16} />
            </button>
          </div>
          <p className="mt-3 font-bold text-lg leading-tight">{user.name}</p>
          <p className="text-sm text-muted" dir="ltr">
            @{user.username}
            {user.role === "admin" && <span className="ms-2 chip !py-0 !px-2 text-xs">{t("me_admin_badge")}</span>}
          </p>
          <p className="mt-2 text-sm text-muted flex items-center justify-center gap-2 flex-wrap">
            <span>
              {t("me_level")}: {level ? <span className="font-semibold text-ink">{level} · {t(`lvl_${level}_name` as TKey)}</span> : t("me_no_level")}
            </span>
            {me.streak > 0 && (
              <span className="inline-flex items-center gap-1">
                <IconFlame size={14} /> {t("me_streak").replace("{n}", String(me.streak))}
              </span>
            )}
          </p>

          <div className="mt-4 grid gap-1 text-start">
            <MenuButton icon={<IconCamera size={18} />} onClick={pickPhoto}>
              {t("me_change_photo")}
            </MenuButton>
            {user.photo && (
              <MenuButton icon={<IconTrash size={18} />} onClick={removePhoto}>
                {t("me_remove_photo")}
              </MenuButton>
            )}
            <MenuButton icon={<IconPen size={18} />} onClick={() => (setOpen(false), setDialog("name"))}>
              {t("me_edit")}
            </MenuButton>
            <MenuButton icon={<IconKey size={18} />} onClick={() => (setOpen(false), setDialog("password"))}>
              {t("me_password")}
            </MenuButton>
            <div className="border-t border-line my-1" />
            {/* The pages that used to be in the header live here now. */}
            <MenuLink href="/grammar" icon={<span className="w-[18px] text-center">📘</span>} onClick={() => setOpen(false)}>
              {t("nav_grammar")}
            </MenuLink>
            <MenuLink href="/community" icon={<span className="w-[18px] text-center">👥</span>} onClick={() => setOpen(false)}>
              {t("community_nav")}
            </MenuLink>
            <MenuLink href="/sprachcafe" icon={<IconSprachcafe size={18} />} onClick={() => setOpen(false)}>
              {t("cafe_nav")}
            </MenuLink>
            <MenuLink href="/progress" icon={<IconChart size={18} />} onClick={() => setOpen(false)}>
              {t("nav_progress")}
            </MenuLink>
            <MenuLink href="/reports" icon={<IconFile size={18} />} onClick={() => setOpen(false)}>
              {t("nav_reports")}
            </MenuLink>
            <MenuLink href="/settings" icon={<IconGear size={18} />} onClick={() => setOpen(false)}>
              {t("nav_settings")}
            </MenuLink>
            {user.role === "admin" && (
              <MenuLink href="/admin" icon={<IconShield size={18} />} onClick={() => setOpen(false)}>
                {t("me_admin")}
              </MenuLink>
            )}
            <div className="border-t border-line my-1" />
            {/* The owner's channel, the break corner and the tutorials. */}
            {links.channelUrl && (
              <a
                href={links.channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-menu-item
                onClick={() => (trackClick("menu"), setOpen(false))}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-2"
              >
                <IconVideoPlay size={18} /> {t("yt_my_channel")} <span className="red-dot ms-auto" aria-hidden="true" />
              </a>
            )}
            <MenuLink href="/pause" icon={<span className="w-[18px] text-center">☕</span>} onClick={() => setOpen(false)}>
              {t("pause_name")}
            </MenuLink>
            {links.explainerId && (
              <MenuButton icon={<span className="w-[18px] text-center">▶️</span>} onClick={() => (setOpen(false), openExplainer())}>
                {t("yt_explainer_short")}
              </MenuButton>
            )}
            {links.playlistId && (
              <MenuLink href="/tutorials" icon={<span className="w-[18px] text-center">🎓</span>} onClick={() => setOpen(false)}>
                {t("yt_tutorials")}
              </MenuLink>
            )}
            <div className="border-t border-line my-1" />
            <MenuButton icon={<IconLogout size={18} />} onClick={logout}>
              {t("me_logout")}
            </MenuButton>
          </div>
        </div>
      )}

      {cropFile && <PhotoCropper file={cropFile} busy={saving} onCancel={() => setCropFile(null)} onDone={savePhoto} />}
      {dialog === "name" && <EditNameDialog onClose={() => setDialog(null)} onSaved={() => setNote(t("me_name_done"))} />}
      {dialog === "password" && <PasswordDialog onClose={() => setDialog(null)} onSaved={() => setNote(t("me_pw_done"))} />}
    </div>
  );
}

function MenuLink({ href, icon, onClick, children }: { href: string; icon: React.ReactNode; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link href={href} data-menu-item onClick={onClick} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-2">
      {icon} {children}
    </Link>
  );
}

function MenuButton({ icon, onClick, children }: { icon: React.ReactNode; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" data-menu-item onClick={onClick} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-2 text-start w-full">
      {icon} {children}
    </button>
  );
}

function EditNameDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { t } = useUI();
  const { me, setUser } = useMe();
  const [name, setName] = useState(me?.user.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/me", { method: "PATCH", body: JSON.stringify({ name }) });
      setUser({ name: name.trim() });
      onSaved();
      onClose();
    } catch (err) {
      setError(authErrorText(err, t));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={t("me_edit")} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <TextField label={t("auth_name")} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" required />
        <FormError>{error}</FormError>
        <div className="flex gap-2 justify-end">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t("me_cancel")}
          </button>
          <button className="btn btn-primary" disabled={busy || !name.trim()}>
            {t("me_save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PasswordDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { t } = useUI();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8) return setError(t("autherr_password_short"));
    if (next !== confirm) return setError(t("autherr_password_mismatch"));
    setBusy(true);
    setError(null);
    try {
      await api("/api/me/password", { method: "POST", body: JSON.stringify({ current, next, confirm }) });
      onSaved();
      onClose();
    } catch (err) {
      setError(authErrorText(err, t));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={t("me_password")} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <PasswordField label={t("me_current_pw")} value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
        <PasswordField label={t("me_new_pw")} hint={t("auth_password_hint")} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required />
        <PasswordField label={t("auth_confirm")} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
        <FormError>{error}</FormError>
        <div className="flex gap-2 justify-end">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t("me_cancel")}
          </button>
          <button className="btn btn-primary" disabled={busy || !current || !next || !confirm}>
            {t("me_save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
