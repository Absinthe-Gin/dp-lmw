"use client";

import { DownloadIcon } from "@/components/ui/icons";

export default function SelectionActionBar({
  count,
  onCreateAlbum,
  onDownload,
  onDelete,
  onRemoveFromAlbum,
  onClear,
}: {
  count: number;
  onCreateAlbum: () => void;
  onDownload: () => void;
  /** Omitted on an album detail page — deleting (soft-delete to trash) isn't offered
   * from inside an album; only download + "remove from album" are. */
  onDelete?: () => void;
  /** Only passed on an album detail page — bulk-detaches the selection instead of deleting it. */
  onRemoveFromAlbum?: () => void;
  onClear: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface shadow-[0_-4px_16px_rgba(0,0,0,0.12)] sm:inset-x-auto sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2 sm:border sm:rounded-xl sm:shadow-lg">
      <div className="mx-auto flex max-w-xl flex-col gap-2 px-4 py-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
        <div className="flex items-center justify-between sm:contents">
          <span className="font-mono text-sm font-semibold text-ink">{count} đã chọn</span>
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-muted hover:text-ink sm:order-last"
          >
            Bỏ chọn
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onCreateAlbum}
            className="flex-1 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white hover:bg-accent-strong sm:flex-none sm:py-1.5"
          >
            + Tạo album
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-ink hover:border-accent sm:flex-none sm:py-1.5"
          >
            <DownloadIcon className="h-3.5 w-3.5" />
            Tải xuống (.zip)
          </button>
          {onRemoveFromAlbum && (
            <button
              type="button"
              onClick={onRemoveFromAlbum}
              className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-ink hover:border-accent sm:flex-none sm:py-1.5"
            >
              Gỡ khỏi album
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="flex-1 rounded-lg border border-danger bg-danger/10 px-3 py-2 text-xs font-semibold text-danger hover:bg-danger hover:text-white sm:flex-none sm:bg-transparent sm:py-1.5"
            >
              Xóa
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
