"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { AlbumDTO } from "@memory-vault/shared";
import AlbumCard from "./AlbumCard";
import AlbumSelectionActionBar from "./AlbumSelectionActionBar";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import { getSessionToken } from "@/lib/session";
import { api } from "@/lib/api-client";
import { downloadMultipleAlbums } from "@/lib/download";

export default function AlbumGrid({ albums }: { albums: AlbumDTO[] }) {
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const router = useRouter();
  const pathname = usePathname();
  const confirm = useConfirm();

  const visible = albums.filter((a) => !deletedIds.has(a.id));

  function toggleSelectMode() {
    setSelectMode((v) => !v);
    setSelectedIds(new Set());
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function handleBulkDownload() {
    await downloadMultipleAlbums(Array.from(selectedIds));
  }

  async function handleBulkDelete() {
    if (!getSessionToken()) {
      router.push(`/admin-login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    const ok = await confirm({
      title: `Xóa ${selectedIds.size} album đã chọn?`,
      description: "Chuyển vào thùng rác — có thể khôi phục lại sau. Ảnh/video bên trong không bị xóa.",
      confirmLabel: "Xóa",
      danger: true,
    });
    if (!ok) return;
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map((id) => api.delete(`/api/albums/${id}`)));
    setDeletedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
    setSelectedIds(new Set());
    setSelectMode(false);
  }

  if (visible.length === 0) {
    return <p className="text-ink-muted">Chưa có album nào. Tạo album thủ công hoặc chạy gộp tự động.</p>;
  }

  return (
    <>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={toggleSelectMode}
          className={`rounded-lg border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
            selectMode ? "border-accent bg-accent-soft text-accent-strong" : "border-border bg-surface hover:border-accent"
          }`}
        >
          {selectMode ? "Hủy chọn" : "Chọn nhiều"}
        </button>
      </div>

      <div
        className={`grid grid-cols-2 gap-4 sm:grid-cols-3 ${
          selectMode && selectedIds.size > 0 ? "pb-32 sm:pb-24" : ""
        }`}
      >
        {visible.map((album) => (
          <AlbumCard
            key={album.id}
            album={album}
            onDeleted={(id) => setDeletedIds((prev) => new Set(prev).add(id))}
            selectMode={selectMode}
            selected={selectedIds.has(album.id)}
            onToggleSelected={() => toggleSelected(album.id)}
          />
        ))}
      </div>

      {selectMode && selectedIds.size > 0 && (
        <AlbumSelectionActionBar
          count={selectedIds.size}
          onDownload={handleBulkDownload}
          onDelete={handleBulkDelete}
          onClear={clearSelection}
        />
      )}
    </>
  );
}
