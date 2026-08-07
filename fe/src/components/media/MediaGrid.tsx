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

type GroupBy = "day" | "month";

/** Local calendar day/month of uploadedAt, not takenAt — matches the "theo ngày tải lên" (by upload day) framing on /media. */
function groupKeyAndLabel(item: MediaDTO, mode: GroupBy): { key: string; label: string } {
  const d = new Date(item.uploadedAt);
  if (mode === "month") {
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString("vi-VN", { month: "long", year: "numeric" }),
    };
  }
  return {
    key: d.toISOString().slice(0, 10),
    label: d.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }),
  };
}

export default function MediaGrid({
  items,
  groupBy,
  onRemoveFromAlbum,
  onBulkRemoveFromAlbum,
}: {
  items: MediaDTO[];
  /** When set, renders items in sections headed by upload day/month instead of one flat grid — see /media's toggle. Omit for a plain flat grid (album detail pages, etc.). */
  groupBy?: GroupBy;
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

  function renderCard(item: MediaDTO, index: number) {
    return (
      <MediaCard
        key={item.id}
        media={item}
        selectMode={selectMode}
        selected={selectedIds.has(item.id)}
        onOpen={() => (selectMode ? toggleSelected(item.id) : setOpenIndex(index))}
        onDeleted={(id) => setDeletedIds((prev) => new Set(prev).add(id))}
        onRemoveFromAlbum={onRemoveFromAlbum ? () => onRemoveFromAlbum(item.id) : undefined}
      />
    );
  }

  // Sections are just a display grouping — selection and the lightbox's
  // prev/next both still operate over the whole flat `visible` array (via
  // the global `index` threaded through here), so a day boundary never
  // splits those.
  const groups: { key: string; label: string; entries: { item: MediaDTO; index: number }[] }[] = [];
  if (groupBy) {
    visible.forEach((item, index) => {
      const { key, label } = groupKeyAndLabel(item, groupBy);
      const current = groups[groups.length - 1];
      if (current && current.key === key) current.entries.push({ item, index });
      else groups.push({ key, label, entries: [{ item, index }] });
    });
  }

  const bottomPad = selectMode && selectedIds.size > 0 ? "pb-32 sm:pb-24" : "";

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

      {groupBy ? (
        <div className={`flex flex-col gap-6 ${bottomPad}`}>
          {groups.map((g) => (
            <div key={g.key}>
              <h2 className="mb-2.5 text-sm font-semibold capitalize text-ink-muted">
                {g.label} <span className="font-mono text-xs font-normal text-ink-faint">· {g.entries.length} mục</span>
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {g.entries.map(({ item, index }) => renderCard(item, index))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 ${bottomPad}`}>
          {visible.map((item, i) => renderCard(item, i))}
        </div>
      )}

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
