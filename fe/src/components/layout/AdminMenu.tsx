"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { getSessionToken, clearSessionToken } from "@/lib/session";

/**
 * Single dropdown replacing the old separate "Thùng rác" link + admin
 * status pill — everything admin-related (trash, login/logout, and the
 * system-wide public/private toggle) lives behind one "Quản trị" button
 * now, leaving room to add more admin-only actions here later without
 * cluttering the top bar itself.
 */
export default function AdminMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // null = not loaded yet (only fetched lazily once the menu is opened by
  // an admin — a regular visitor never needs this, so no point fetching it
  // for every page load).
  const [isPublic, setIsPublic] = useState<boolean | null>(null);
  const [hasAccessCode, setHasAccessCode] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setIsAdmin(Boolean(getSessionToken()));
  }, [pathname]);

  useEffect(() => {
    if (!open || !isAdmin || isPublic !== null) return;
    api.get<{ isPublic: boolean; hasAccessCode: boolean }>("/api/settings/public-status").then((s) => {
      setIsPublic(s.isPublic);
      setHasAccessCode(s.hasAccessCode);
    });
  }, [open, isAdmin, isPublic]);

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  function handleLogout() {
    clearSessionToken();
    setIsAdmin(false);
    setOpen(false);
    if (pathname === "/trash") router.push("/");
  }

  async function handleTogglePublic() {
    if (isPublic === null || saving) return;
    const next = !isPublic;
    setSaving(true);
    try {
      await api.patch<{ isPublic: boolean; hasAccessCode: boolean }>("/api/settings", { isPublic: next });
      setIsPublic(next);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAccessCode(e: React.FormEvent) {
    e.preventDefault();
    if (!accessCode.trim() || saving) return;
    setSaving(true);
    setSaved(false);
    try {
      await api.patch<{ isPublic: boolean; hasAccessCode: boolean }>("/api/settings", { accessCode: accessCode.trim() });
      setHasAccessCode(true);
      setAccessCode("");
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 whitespace-nowrap rounded-full border border-border px-2.5 py-1.5 text-xs text-ink-muted hover:border-accent sm:px-3"
        title="Quản trị"
      >
        <span className={`h-1.5 w-1.5 rounded-full ${isAdmin ? "bg-success" : "bg-ink-faint"}`} />
        <span className="hidden sm:inline">Quản trị</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border border-border bg-surface p-2 shadow-lg">
          {!isAdmin ? (
            <Link
              href="/admin-login"
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2 text-sm font-semibold text-ink hover:bg-surface2"
            >
              Đăng nhập quản trị
            </Link>
          ) : (
            <>
              <Link
                href="/trash"
                onClick={() => setOpen(false)}
                className={`block rounded-md px-3 py-2 text-sm font-semibold hover:bg-surface2 ${
                  pathname === "/trash" ? "text-accent" : "text-ink"
                }`}
              >
                Thùng rác
              </Link>

              <div className="my-2 border-t border-border" />

              <div className="px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">Public hệ thống</p>
                    <p className="text-xs text-ink-muted">
                      {isPublic === null ? "Đang tải..." : isPublic ? "Công khai — ai cũng vào được" : "Riêng tư — cần mã truy cập"}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isPublic ?? false}
                    onClick={handleTogglePublic}
                    disabled={isPublic === null || saving}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                      isPublic ? "bg-accent" : "bg-border"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        isPublic ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>

                {isPublic === false && (
                  <form onSubmit={handleSaveAccessCode} className="mt-3 flex flex-col gap-1.5">
                    <div className="relative">
                      <input
                        type={showAccessCode ? "text" : "password"}
                        value={accessCode}
                        onChange={(e) => {
                          setAccessCode(e.target.value);
                          setSaved(false);
                        }}
                        placeholder={hasAccessCode ? "Đổi mã bảo mật mới" : "Đặt mã bảo mật"}
                        className="w-full rounded-lg border border-border bg-surface2 px-3 py-1.5 pr-9 text-sm outline-none focus:border-accent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAccessCode((v) => !v)}
                        aria-label={showAccessCode ? "Ẩn mã" : "Hiện mã"}
                        className="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-ink-faint hover:text-ink-muted"
                      >
                        {showAccessCode ? (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        ) : (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 12s3.5-7 10-7c2.09 0 3.87.55 5.34 1.35M22 12s-3.5 7-10 7c-2.09 0-3.87-.55-5.34-1.35" />
                            <path d="M3 3l18 18" />
                            <path d="M9.5 9.9A3 3 0 0 0 12 15a3 3 0 0 0 2.1-.86" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={!accessCode.trim() || saving}
                      className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-strong disabled:opacity-50"
                    >
                      {saving ? "Đang lưu..." : "Lưu mã bảo mật"}
                    </button>
                    {saved && <p className="text-xs text-success">Đã lưu mã bảo mật mới.</p>}
                    {!hasAccessCode && <p className="text-xs text-ink-faint">Chưa đặt mã — khách sẽ không thể tự vào khi ở chế độ riêng tư.</p>}
                  </form>
                )}
              </div>

              <div className="my-2 border-t border-border" />

              <button
                type="button"
                onClick={handleLogout}
                className="block w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-danger hover:bg-surface2"
              >
                Đăng xuất quản trị
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
