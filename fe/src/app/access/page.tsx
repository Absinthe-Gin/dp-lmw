"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { getSessionToken } from "@/lib/session";
import BackButton from "@/components/ui/BackButton";
import PublicAccessToggle from "@/components/settings/PublicAccessToggle";

const POLL_INTERVAL_MS = 15000;

type AccessLogEntry = {
  id: string;
  ipAddress: string;
  location: string | null;
  userAgent: string | null;
  startedAt: string;
  lastSeenAt: string;
  durationSec: number;
  isActive: boolean;
};

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec} giây`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m} phút ${s} giây` : `${m} phút`;
}

export default function AccessPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AccessLogEntry[] | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function reload() {
    api
      .get<AccessLogEntry[]>("/api/access-logs")
      .then((data) => {
        setLogs(data);
        setLastUpdated(new Date());
      })
      .catch(() => {
        // A single missed poll shouldn't wipe the last known list off the screen.
      });
  }

  useEffect(() => {
    if (!getSessionToken()) {
      router.push("/admin-login?next=/access");
      return;
    }
    reload();
    pollRef.current = setInterval(reload, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!logs) return null;

  const activeCount = logs.filter((l) => l.isActive).length;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <BackButton />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Quản lý truy cập</h1>
          <p className="mt-1.5 text-sm text-ink-muted">Thiết bị đã truy cập hệ thống — IP, vị trí và thời lượng.</p>
        </div>
        <span className="flex items-center gap-1.5 whitespace-nowrap text-xs text-ink-faint">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
          Tự cập nhật mỗi {POLL_INTERVAL_MS / 1000}s
          {lastUpdated && <span className="font-mono">· {lastUpdated.toLocaleTimeString("vi-VN")}</span>}
        </span>
      </div>

      <section className="mb-6 rounded-xl border border-border bg-surface p-5">
        <PublicAccessToggle />
      </section>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-surface px-4 py-3">
          <p className="font-display text-2xl font-bold text-accent-strong">{activeCount}</p>
          <p className="text-xs text-ink-muted">Đang truy cập</p>
        </div>
        <div className="rounded-lg border border-border bg-surface px-4 py-3">
          <p className="font-display text-2xl font-bold text-tertiary">{logs.length}</p>
          <p className="text-xs text-ink-muted">Tổng số lượt (gần đây)</p>
        </div>
      </div>

      {logs.length === 0 ? (
        <p className="text-sm text-ink-muted">Chưa ghi nhận lượt truy cập nào.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-semibold text-ink-muted">
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">IP</th>
                <th className="px-4 py-3">Vị trí</th>
                <th className="px-4 py-3">Bắt đầu</th>
                <th className="px-4 py-3">Thời lượng</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 whitespace-nowrap text-xs">
                      <span className={`h-1.5 w-1.5 rounded-full ${l.isActive ? "bg-success" : "bg-ink-faint"}`} />
                      {l.isActive ? "Đang truy cập" : "Đã rời đi"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{l.ipAddress}</td>
                  <td className="px-4 py-3 text-ink-muted">{l.location ?? "Không xác định"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                    {new Date(l.startedAt).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-4 py-3">{formatDuration(l.durationSec)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
