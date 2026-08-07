"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { MediaDTO } from "@memory-vault/shared";
import MediaCard from "@/components/media/MediaCard";
import BackButton from "@/components/ui/BackButton";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import { getSessionToken } from "@/lib/session";
import { api } from "@/lib/api-client";

type Group = MediaDTO[];

function DuplicateGroupCard({ group, onResolved }: { group: Group; onResolved: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const confirm = useConfirm();
  // Default to keeping the newest item (list is already uploadedAt desc, so
  // the first item in each group is the newest) — just a sensible default,
  // the admin can click any other thumbnail to keep that one instead.
  const [keepId, setKeepId] = useState(group[0].id);
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
          <MediaCard key={item.id} media={item} selectMode selected={item.id === keepId} onOpen={() => setKeepId(item.id)} />
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

export default function DuplicatesPage() {
  const [groups, setGroups] = useState<Group[] | null>(null);

  function reload() {
    api.get<{ groups: Group[] }>("/api/duplicates").then((data) => setGroups(data.groups));
  }

  useEffect(reload, []);

  function removeGroup(index: number) {
    setGroups((prev) => (prev ? prev.filter((_, i) => i !== index) : prev));
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <BackButton />
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold">Trùng lặp</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Ảnh/video giống hệt hoặc rất giống nhau — chọn 1 mục để giữ lại rồi gộp, hoặc giữ nguyên nếu không phải trùng lặp.
        </p>
      </div>

      {groups === null ? null : groups.length === 0 ? (
        <p className="text-sm text-ink-muted">Không tìm thấy ảnh/video trùng lặp nào.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group, i) => (
            <DuplicateGroupCard key={group.map((m) => m.id).join(",")} group={group} onResolved={() => removeGroup(i)} />
          ))}
        </div>
      )}
    </main>
  );
}
