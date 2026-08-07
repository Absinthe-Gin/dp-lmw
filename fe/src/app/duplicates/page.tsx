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
  keepIds,
  onToggleKeep,
  onResolved,
}: {
  group: Group;
  keepIds: string[];
  onToggleKeep: (id: string) => void;
  onResolved: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);

  const hasVideo = group.some((m) => m.type === "VIDEO");
  // A pair only ever makes sense as "keep this one, drop the other" — the
  // multi-keep picker is for clusters of 3+, where it's plausible more
  // than one item genuinely deserves to survive (see onToggleKeep in the
  // parent for the actual single- vs multi-select behavior split).
  const allowMultiKeep = group.length > 2;
  const removeIds = group.filter((m) => !keepIds.includes(m.id)).map((m) => m.id);

  async function handleMerge() {
    if (!getSessionToken()) {
      router.push(`/admin-login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    const ok = await confirm({
      title: `Gộp ${group.length} mục thành ${keepIds.length}?`,
      description: `Giữ lại ${keepIds.length} mục đã chọn, ${removeIds.length} mục còn lại chuyển vào thùng rác — có thể khôi phục lại sau.`,
      confirmLabel: "Gộp",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await api.post("/api/duplicates/merge", { keepIds, removeIds });
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
        <p className="text-xs text-ink-faint">
          {allowMultiKeep ? "Bấm để chọn (có thể chọn nhiều) các mục muốn giữ lại" : "Bấm vào 1 mục để chọn ảnh/video muốn giữ lại"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {group.map((item) => (
          <MediaCard
            key={item.id}
            media={item}
            selectMode
            selected={keepIds.includes(item.id)}
            onOpen={() => onToggleKeep(item.id)}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleMerge}
          disabled={busy || removeIds.length === 0}
          title={removeIds.length === 0 ? "Chưa có mục nào bị loại — bỏ chọn bớt để gộp" : undefined}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-50"
        >
          Gộp làm {keepIds.length}
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
  // Which items to keep per group, keyed by groupKeyOf(group) — lifted up
  // from the card itself so "Gộp hàng loạt" can merge every group at once
  // using whatever's currently selected in each. A pair always holds
  // exactly one id (radio-style); a group of 3+ can hold more than one
  // (see handleToggleKeep below).
  const [keepIds, setKeepIds] = useState<Record<string, string[]>>({});
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
      // Default each new group to keeping just its newest item (groups are
      // built from an uploadedAt-desc list, so index 0 is newest) —
      // preserves any selection already made for a group that's still
      // present after a re-scan, rather than resetting everyone's picks.
      setKeepIds((prev) => {
        const next = { ...prev };
        for (const g of data.groups) {
          const key = groupKeyOf(g);
          if (!next[key]) next[key] = [g[0].id];
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

  // Pairs stay single-select (radio-like: clicking one replaces the pick —
  // keeping "both" would just mean nothing to merge). Groups of 3+ toggle
  // membership instead, and can't be emptied out entirely — there must
  // always be at least one item left to keep.
  function handleToggleKeep(group: Group, id: string) {
    const key = groupKeyOf(group);
    setKeepIds((prev) => {
      const current = prev[key] ?? [group[0].id];
      if (group.length <= 2) {
        return { ...prev, [key]: [id] };
      }
      if (current.includes(id)) {
        if (current.length === 1) return prev;
        return { ...prev, [key]: current.filter((x) => x !== id) };
      }
      return { ...prev, [key]: [...current, id] };
    });
  }

  async function handleBulkMerge() {
    if (!groups?.length) return;
    if (!getSessionToken()) {
      router.push(`/admin-login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    const mergeable = groups.filter((g) => (keepIds[groupKeyOf(g)] ?? [g[0].id]).length < g.length);
    if (!mergeable.length) return;
    const totalRemove = mergeable.reduce((sum, g) => sum + g.length - (keepIds[groupKeyOf(g)] ?? [g[0].id]).length, 0);
    const ok = await confirm({
      title: `Gộp hàng loạt ${mergeable.length} nhóm?`,
      description: `Mỗi nhóm giữ lại (các) mục đang được chọn, tổng cộng ${totalRemove} mục còn lại chuyển vào thùng rác — có thể khôi phục lại sau.`,
      confirmLabel: "Gộp hàng loạt",
      danger: true,
    });
    if (!ok) return;

    setBulkMerging(true);
    try {
      await Promise.all(
        mergeable.map((g) => {
          const keep = keepIds[groupKeyOf(g)] ?? [g[0].id];
          const removeIds = g.filter((m) => !keep.includes(m.id)).map((m) => m.id);
          return api.post("/api/duplicates/merge", { keepIds: keep, removeIds });
        })
      );
      const mergedKeys = new Set(mergeable.map((g) => groupKeyOf(g)));
      setGroups((prev) => (prev ? prev.filter((g) => !mergedKeys.has(groupKeyOf(g))) : prev));
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
            Ảnh/video giống hệt hoặc rất giống nhau — chọn mục để giữ lại rồi gộp, hoặc giữ nguyên nếu không phải trùng lặp.
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
                keepIds={keepIds[key] ?? [group[0].id]}
                onToggleKeep={(id) => handleToggleKeep(group, id)}
                onResolved={() => removeGroup(i)}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
