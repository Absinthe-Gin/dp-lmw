"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { getSessionToken, clearSessionToken } from "@/lib/session";
import { isAdminUnauthorized } from "@/lib/adminAuthError";
import BackButton from "@/components/ui/BackButton";

const POLL_INTERVAL_MS = 5000;
const GIB = 1024 * 1024 * 1024;

type Usage = {
  storageUsedBytes: number;
  storageQuotaBytes: number;
  untrackedMediaCount: number;
  mediaCount: number;
  albumCount: number;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

export default function SystemPage() {
  const router = useRouter();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [quotaInputGiB, setQuotaInputGiB] = useState("");
  const [savingQuota, setSavingQuota] = useState(false);
  const [saved, setSaved] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function reload() {
    api
      .get<Usage>("/api/settings/usage")
      .then((data) => {
        setUsage(data);
        setLastUpdated(new Date());
      })
      .catch((err) => {
        if (isAdminUnauthorized(err)) {
          // The admin session expired mid-visit — polling forever with a
          // 401 every 5s and nothing to show for it is worse than just
          // sending them back to log in again.
          if (pollRef.current) clearInterval(pollRef.current);
          clearSessionToken();
          router.push("/admin-login?next=/system");
          return;
        }
        // Any other failure (e.g. Render cold-starting) shouldn't wipe the
        // last known numbers off the screen — just skip this tick.
      });
  }

  useEffect(() => {
    if (!getSessionToken()) {
      router.push("/admin-login?next=/system");
      return;
    }
    reload();
    pollRef.current = setInterval(reload, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSaveQuota(e: React.FormEvent) {
    e.preventDefault();
    const gib = parseFloat(quotaInputGiB);
    if (!gib || gib <= 0) return;
    setSavingQuota(true);
    setSaved(false);
    try {
      await api.patch("/api/settings", { storageQuotaBytes: gib * GIB });
      setQuotaInputGiB("");
      setSaved(true);
      reload();
    } finally {
      setSavingQuota(false);
    }
  }

  if (!usage) return null;

  const percent = usage.storageQuotaBytes > 0 ? Math.min(100, (usage.storageUsedBytes / usage.storageQuotaBytes) * 100) : 0;
  const nearLimit = percent >= 80;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <BackButton />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Quản lý hệ thống</h1>
          <p className="mt-1.5 text-sm text-ink-muted">Dung lượng lưu trữ đã dùng so với ngưỡng bạn tự đặt.</p>
        </div>
        <span className="flex items-center gap-1.5 whitespace-nowrap text-xs text-ink-faint">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
          Tự cập nhật mỗi {POLL_INTERVAL_MS / 1000}s
          {lastUpdated && <span className="font-mono">· {lastUpdated.toLocaleTimeString("vi-VN")}</span>}
        </span>
      </div>

      <section className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-baseline justify-between">
          <p className="font-display text-2xl font-bold text-ink">
            {formatBytes(usage.storageUsedBytes)} <span className="text-sm font-normal text-ink-muted">/ {formatBytes(usage.storageQuotaBytes)}</span>
          </p>
          <p className={`font-mono text-sm font-semibold ${nearLimit ? "text-danger" : "text-ink-muted"}`}>{percent.toFixed(1)}%</p>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-surface2">
          <div
            className={`h-full rounded-full transition-all ${nearLimit ? "bg-danger" : "bg-accent"}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        {nearLimit && <p className="mt-2 text-xs text-danger">Sắp chạm ngưỡng — cân nhắc dọn bớt hoặc tăng ngưỡng bên dưới.</p>}
        {usage.untrackedMediaCount > 0 && (
          <p className="mt-2 text-xs text-ink-faint">
            {usage.untrackedMediaCount} tệp tải lên trước khi có tính năng này chưa được tính vào dung lượng ở trên.
          </p>
        )}
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-surface px-4 py-3">
          <p className="font-display text-2xl font-bold text-accent-strong">{usage.mediaCount}</p>
          <p className="text-xs text-ink-muted">Ảnh &amp; video</p>
        </div>
        <div className="rounded-lg border border-border bg-surface px-4 py-3">
          <p className="font-display text-2xl font-bold text-tertiary">{usage.albumCount}</p>
          <p className="text-xs text-ink-muted">Album</p>
        </div>
      </div>

      <section className="mt-6 rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-ink">Đặt ngưỡng dung lượng</h2>
        <p className="mt-1 text-xs text-ink-muted">
          Không có API để lấy giới hạn thật từ nhà cung cấp lưu trữ — đây là ngưỡng bạn tự đặt để theo dõi.
        </p>
        <form onSubmit={handleSaveQuota} className="mt-3 flex gap-2">
          <div className="relative flex-1">
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={quotaInputGiB}
              onChange={(e) => {
                setQuotaInputGiB(e.target.value);
                setSaved(false);
              }}
              placeholder={`Hiện tại: ${formatBytes(usage.storageQuotaBytes)}`}
              className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 pr-12 text-sm outline-none focus:border-accent"
            />
            <span className="absolute inset-y-0 right-3 flex items-center text-xs text-ink-faint">GiB</span>
          </div>
          <button
            type="submit"
            disabled={!quotaInputGiB || savingQuota}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-50"
          >
            {savingQuota ? "Đang lưu..." : "Lưu"}
          </button>
        </form>
        {saved && <p className="mt-2 text-xs text-success">Đã cập nhật ngưỡng dung lượng.</p>}
      </section>
    </main>
  );
}
