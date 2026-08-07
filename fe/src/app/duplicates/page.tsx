"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { MediaDTO } from "@memory-vault/shared";
import MediaCard from "@/components/media/MediaCard";
import BackButton from "@/components/ui/BackButton";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import { getSessionToken } from "@/lib/session";
import { api } from "@/lib/api-client";

type Group = MediaDTO[];

function groupKeyOf(group: Group): string {
  return group.map((m) => m.id).join(",");
}

function DuplicateGroupCard({
  group,
  keepId,
  onSelectKeep,
  onResolved,
}: {
  group: Group;
  keepId: string;
  onSelectKeep: (id: string) => void;
  onResolved: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);

  const hasVideo = group.some((m) => m.type === "VIDEO");

  async function handleMerge() {
    if (!getSessionToken()) {
      router.push(`/admin-login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    const removeIds = group.filter((m) => m.id !== keepId).map((m) => m.id);
    const ok = await confirm({
      title: `Gộp ${group.length} mục thành 1?`,
      description: `Giữ lại 1 mục đã chọn, ${removeIds.length} mục còn lại chuyển vào thùng rác — có thể khôi phục lại sau.`,
      confirmLabel: "Gộp",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await api.post("/api/duplicates/merge", { keepId, removeIds });
      onResolved();
    } finally {
      setBusy(false);
    }
  }

  async function handleKeepAll() {
    setBusy(true);
    try {
      await api.post("/api/duplicates/dismiss", { mediaIds: group.map((m) => m.id) });
      onResolved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">
          {group.length} mục {hasVideo ? "giống/tương tự nhau" : "trùng lặp hoặc rất giống nhau"}
        </p>
        <p className="text-xs text-ink-faint">Bấm vào 1 mục để chọn ảnh/video muốn giữ lại</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {group.map((item) => (
          <MediaCard key={item.id} media={item} selectMode selected={item.id === keepId} onOpen={() => onSelectKeep(item.id)} />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleMerge}
          disabled={busy}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-50"
        >
          Gộp làm 1
        </button>
        <button
          type="button"
          onClick={handleKeepAll}
          disabled={busy}
          className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold hover:border-accent disabled:opacity-50"
        >
          Giữ nguyên
        </button>
      </div>
    </div>
  );
}

// Detection itself (be/src/routes/duplicates.ts) runs as one fast request —
// there's no chunked backend job to report real per-item progress from, so
// this bar is a client-side approximation: it eases toward 90% while the
// request is in flight, then snaps to 100% the moment the response lands,
// rather than fabricating a fake precise percentage tied to nothing real.
const SCAN_EASE_INTERVAL_MS = 120;

export default function DuplicatesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const confirm = useConfirm();
  const [groups, setGroups] = useState<Group[] | null>(null);
  // Which item to keep per group, keyed by groupKeyOf(group) — lifted up
  // from the card itself so "Gộp hàng loạt" can merge every group at once
  // using whatever's currently selected in each, without needing each card
  // to expose an imperative handle.
  const [keepIds, setKeepIds] = useState<Record<string, string>>({});
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [bulkMerging, setBulkMerging] = useState(false);
  const easeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopEasing() {
    if (easeTimerRef.current) {
      clearInterval(easeTimerRef.current);
      easeTimerRef.current = null;
    }
  }

  async function runScan() {
    setScanning(true);
    setScanProgress(0);
    stopEasing();
    easeTimerRef.current = setInterval(() => {
      setScanProgress((p) => (p >= 90 ? p : p + (90 - p) * 0.15));
    }, SCAN_EASE_INTERVAL_MS);

    try {
      const data = await api.get<{ groups: Group[] }>("/api/duplicates");
      stopEasing();
      setScanProgress(100);
      setGroups(data.groups);
      // Default each new group to keeping its newest item (groups are
      // built from an uploadedAt-desc list, so index 0 is newest) —
      // preserves any selection already made for a group that's still
      // present after a re-scan, rather than resetting everyone's picks.
      setKeepIds((prev) => {
        const next = { ...prev };
        for (const g of data.groups) {
          const key = groupKeyOf(g);
          if (!next[key]) next[key] = g[0].id;
        }
        return next;
      });
    } finally {
      stopEasing();
      setTimeout(() => setScanning(false), 350);
    }
  }

  useEffect(() => {
    runScan();
    return stopEasing;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function removeGroup(index: number) {
    setGroups((prev) => (prev ? prev.filter((_, i) => i !== index) : prev));
  }

  async function handleBulkMerge() {
    if (!groups?.length) return;
    if (!getSessionToken()) {
      router.push(`/admin-login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    const totalRemove = groups.reduce((sum, g) => sum + g.length - 1, 0);
    const ok = await confirm({
      title: `Gộp hàng loạt ${groups.length} nhóm?`,
      description: `Mỗi nhóm giữ lại 1 mục đang được chọn, tổng cộng ${totalRemove} mục còn lại chuyển vào thùng rác — có thể khôi phục lại sau.`,
      confirmLabel: "Gộp hàng loạt",
      danger: true,
    });
    if (!ok) return;

    setBulkMerging(true);
    try {
      await Promise.all(
        groups.map((g) => {
          const keepId = keepIds[groupKeyOf(g)] ?? g[0].id;
          const removeIds = g.filter((m) => m.id !== keepId).map((m) => m.id);
          return api.post("/api/duplicates/merge", { keepId, removeIds });
        })
      );
      setGroups([]);
    } finally {
      setBulkMerging(false);
    }
  }

  // Total individual items across every group, not the group count — "3
  // nhóm" would undercount how many actual photos/videos are involved.
  const totalDuplicateCount = groups?.reduce((sum, g) => sum + g.length, 0) ?? 0;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <BackButton />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Trùng lặp</h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Ảnh/video giống hệt hoặc rất giống nhau — chọn 1 mục để giữ lại rồi gộp, hoặc giữ nguyên nếu không phải trùng lặp.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {groups && groups.length > 0 && (
            <button
              type="button"
              onClick={handleBulkMerge}
              disabled={scanning || bulkMerging}
              className="whitespace-nowrap rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-50"
            >
              {bulkMerging ? "Đang gộp..." : "Gộp hàng loạt"}
            </button>
          )}
          <button
            type="button"
            onClick={runScan}
            disabled={scanning || bulkMerging}
            className="whitespace-nowrap rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold hover:border-accent disabled:opacity-50"
          >
            {scanning ? "Đang quét..." : "⟳ Kiểm tra"}
          </button>
        </div>
      </div>

      {scanning && (
        <div className="mb-6">
          <div className="h-2 overflow-hidden rounded-full bg-surface2">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-150 ease-out"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-ink-muted">Đang quét ảnh/video để tìm nội dung trùng lặp...</p>
        </div>
      )}

      {groups !== null && !scanning && (
        <p className="mb-4 text-sm font-semibold text-ink">
          {totalDuplicateCount > 0 ? `Có ${totalDuplicateCount} mục đang trùng lặp.` : "Không tìm thấy ảnh/video trùng lặp nào."}
        </p>
      )}

      {groups && groups.length > 0 && (
        <div className="flex flex-col gap-4">
          {groups.map((group, i) => {
            const key = groupKeyOf(group);
            return (
              <DuplicateGroupCard
                key={key}
                group={group}
                keepId={keepIds[key] ?? group[0].id}
                onSelectKeep={(id) => setKeepIds((prev) => ({ ...prev, [key]: id }))}
                onResolved={() => removeGroup(i)}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
