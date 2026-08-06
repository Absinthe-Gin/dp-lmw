"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { AlbumDTO, MediaDTO } from "@memory-vault/shared";
import MediaCard from "./MediaCard";
import MediaLightbox from "./MediaLightbox";
import SelectionActionBar from "./SelectionActionBar";
import CreateAlbumDialog from "@/components/albums/CreateAlbumDialog";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import { getSessionToken } from "@/lib/session";
import { api } from "@/lib/api-client";
import { downloadSelectionZip } from "@/lib/download";

export default function MediaGrid({
  items,
  onRemoveFromAlbum,
  onBulkRemoveFromAlbum,
}: {
  items: MediaDTO[];
  /** Passed only from an album detail page — renders a "remove from album" action per card. */
  onRemoveFromAlbum?: (id: string) => void;
  /** Passed only from an album detail page — bulk equivalent for the selection action bar. */
  onBulkRemoveFromAlbum?: (ids: string[]) => void;
}) {
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCreateAlbum, setShowCreateAlbum] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const confirm = useConfirm();

  const visible = items.filter((item) => !deletedIds.has(item.id));

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

  async function handleBulkDelete() {
    if (!getSessionToken()) {
      router.push(`/admin-login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    const ok = await confirm({
      title: `Xóa ${selectedIds.size} mục đã chọn?`,
      description: "Chuyển vào thùng rác — có thể khôi phục lại sau.",
      confirmLabel: "Xóa",
      danger: true,
    });
    if (!ok) return;
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map((id) => api.delete(`/api/media/${id}`)));
    setDeletedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
    setSelectedIds(new Set());
    setSelectMode(false);
  }

  async function handleBulkRemoveFromAlbum() {
    const ok = await confirm({
      title: `Gỡ ${selectedIds.size} mục khỏi album này?`,
      description: "Ảnh/video vẫn còn trong hệ thống, chỉ không thuộc album này nữa.",
      confirmLabel: "Gỡ",
    });
    if (!ok) return;
    onBulkRemoveFromAlbum?.(Array.from(selectedIds));
    setSelectedIds(new Set());
    setSelectMode(false);
  }

  async function handleBulkDownload() {
    await downloadSelectionZip(Array.from(selectedIds));
  }

  function handleAlbumCreated(album: AlbumDTO) {
    setShowCreateAlbum(false);
    setSelectedIds(new Set());
    setSelectMode(false);
    router.push(`/albums/${album.id}`);
  }

  if (visible.length === 0) {
    return <p className="text-ink-muted">Chưa có ảnh/video nào.</p>;
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
        className={`grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 ${
          selectMode && selectedIds.size > 0 ? "pb-32 sm:pb-24" : ""
        }`}
      >
        {visible.map((item, i) => (
          <MediaCard
            key={item.id}
            media={item}
            selectMode={selectMode}
            selected={selectedIds.has(item.id)}
            onOpen={() => (selectMode ? toggleSelected(item.id) : setOpenIndex(i))}
            onDeleted={(id) => setDeletedIds((prev) => new Set(prev).add(id))}
            onRemoveFromAlbum={onRemoveFromAlbum ? () => onRemoveFromAlbum(item.id) : undefined}
          />
        ))}
      </div>

      {selectMode && selectedIds.size > 0 && (
        <SelectionActionBar
          count={selectedIds.size}
          onCreateAlbum={() => setShowCreateAlbum(true)}
          onDownload={handleBulkDownload}
          onDelete={onBulkRemoveFromAlbum ? undefined : handleBulkDelete}
          onRemoveFromAlbum={onBulkRemoveFromAlbum ? handleBulkRemoveFromAlbum : undefined}
          onClear={clearSelection}
        />
      )}

      {openIndex !== null && (
        <MediaLightbox items={visible} index={openIndex} onClose={() => setOpenIndex(null)} onNavigate={setOpenIndex} />
      )}

      {showCreateAlbum && (
        <CreateAlbumDialog
          initialMediaIds={Array.from(selectedIds)}
          onClose={() => setShowCreateAlbum(false)}
          onCreated={handleAlbumCreated}
        />
      )}
    </>
  );
}
