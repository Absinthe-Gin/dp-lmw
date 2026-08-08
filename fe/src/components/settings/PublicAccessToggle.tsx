"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";

/**
 * The "Public hệ thống" toggle + access-code form — shared between
 * AdminMenu.tsx's dropdown and /access's "Quản lý truy cập" page so both
 * places can flip it and both stay showing the true current value. There's
 * no push/websocket between the two instances; each just fetches its own
 * fresh state on mount, so "in sync" here means "never stale on open/load",
 * not "updates live if the other one is toggled while this one is already
 * showing" — good enough for a control an admin uses occasionally, not
 * something two admins fight over in real time.
 */
export default function PublicAccessToggle() {
  const [isPublic, setIsPublic] = useState<boolean | null>(null);
  const [hasAccessCode, setHasAccessCode] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get<{ isPublic: boolean; hasAccessCode: boolean }>("/api/settings/public-status").then((s) => {
      setIsPublic(s.isPublic);
      setHasAccessCode(s.hasAccessCode);
    });
  }, []);

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
    <div>
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
            className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              isPublic ? "translate-x-5" : "translate-x-0"
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
  );
}
