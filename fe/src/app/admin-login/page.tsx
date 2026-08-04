"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { setSessionToken } from "@/lib/session";

/**
 * The only login screen in this app. Everyone can view/upload/edit
 * without an account — this exists solely to unlock delete actions.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
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
      <div>
        <h1 className="font-display text-2xl font-semibold">Đăng nhập quản trị</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Chỉ cần thiết để xóa ảnh/video/album. Xem, tải lên và chỉnh sửa không cần đăng nhập.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mật khẩu quản trị"
          className="rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-accent"
          autoFocus
        />
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
