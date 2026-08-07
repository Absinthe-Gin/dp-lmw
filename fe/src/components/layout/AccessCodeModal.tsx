"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { setSiteAccessToken } from "@/lib/siteAccess";

/**
 * Full-screen blocking gate shown by SiteAccessGate.tsx whenever the system
 * has been switched to private mode (AdminMenu.tsx's "Public hệ thống"
 * toggle) and this browser has neither an admin session nor a previously-
 * granted site-access token. Two ways out: enter the access code, or hit
 * "Site admin" to log in as admin instead (no code needed for admins).
 */
export default function AccessCodeModal({ onUnlock }: { onUnlock: () => void }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { token } = await api.post<{ token: string }>("/api/settings/verify-access", { code });
      setSiteAccessToken(token);
      onUnlock();
    } catch {
      setError("Mã truy cập không đúng.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-lg">
        <h1 className="font-display text-xl font-semibold">Xác nhận truy cập</h1>
        <p className="mt-1.5 text-sm text-ink-muted">Hệ thống hiện đang ở chế độ riêng tư.</p>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <div className="relative">
            <input
              type={showCode ? "text" : "password"}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Nhập mã để truy cập hệ thống"
              className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 pr-10 outline-none focus:border-accent"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowCode((v) => !v)}
              aria-label={showCode ? "Ẩn mã" : "Hiện mã"}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink-faint hover:text-ink-muted"
            >
              {showCode ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3.5-7 10-7c2.09 0 3.87.55 5.34 1.35M22 12s-3.5 7-10 7c-2.09 0-3.87-.55-5.34-1.35" />
                  <path d="M3 3l18 18" />
                  <path d="M9.5 9.9A3 3 0 0 0 12 15a3 3 0 0 0 2.1-.86" />
                </svg>
              )}
            </button>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-50"
            >
              {loading ? "Đang kiểm tra..." : "Xác nhận"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin-login")}
              title="Truy cập với quyền quản trị — không cần mã bảo mật"
              className="whitespace-nowrap rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:border-accent"
            >
              Site admin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
