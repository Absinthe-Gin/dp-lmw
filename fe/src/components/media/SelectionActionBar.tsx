"use client";

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
  onDelete: () => void;
  /** Only passed on an album detail page — bulk-detaches the selection instead of deleting it. */
  onRemoveFromAlbum?: () => void;
  onClear: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-20 z-40 px-4 sm:inset-x-auto sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2 sm:px-0">
      <div className="mx-auto flex max-w-xl flex-wrap items-center justify-center gap-2 rounded-xl border border-border bg-surface/95 px-4 py-3 shadow-lg backdrop-blur">
        <span className="font-mono text-sm text-ink-muted">{count} đã chọn</span>
        <button
          type="button"
          onClick={onCreateAlbum}
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-strong"
        >
          + Tạo album
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold hover:border-accent"
        >
          ⬇ Tải xuống (.zip)
        </button>
        {onRemoveFromAlbum && (
          <button
            type="button"
            onClick={onRemoveFromAlbum}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold hover:border-accent"
          >
            Gỡ khỏi album
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg border border-danger px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger hover:text-white"
        >
          Xóa
        </button>
        <button type="button" onClick={onClear} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-muted hover:text-ink">
          Bỏ chọn
        </button>
      </div>
    </div>
  );
}
