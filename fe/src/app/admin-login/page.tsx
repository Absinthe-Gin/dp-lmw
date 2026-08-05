"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { setSessionToken } from "@/lib/session";
import BackButton from "@/components/ui/BackButton";

/**
 * The only login screen in this app. Everyone can view/upload/edit
 * without an account — this exists solely to unlock delete actions.
 */
export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { token } = await api.post<{ token: string }>("/api/auth/admin-login", { password });
      setSessionToken(token);
      router.push(searchParams.get("next") ?? "/albums");
    } catch {
      setError("Sai mật khẩu quản trị.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-6 py-20">
      <BackButton />
      <div>
        <h1 className="font-display text-2xl font-semibold">Đăng nhập quản trị</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Chỉ cần thiết để xóa ảnh/video/album. Xem, tải lên và chỉnh sửa không cần đăng nhập.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mật khẩu quản trị"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 pr-10 outline-none focus:border-accent"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink-faint hover:text-ink-muted"
          >
            {showPassword ? (
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
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-50"
        >
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>
    </main>
  );
}
