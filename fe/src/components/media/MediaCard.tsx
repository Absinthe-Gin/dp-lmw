"use client";

import type { MediaDTO } from "@memory-vault/shared";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api-client";
import { getSessionToken } from "@/lib/session";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import { downloadMediaItem } from "@/lib/download";
import { DownloadIcon } from "@/components/ui/icons";

export default function MediaCard({
  media,
  onOpen,
  onDeleted,
  onRemoveFromAlbum,
  selectMode = false,
  selected = false,
}: {
  media: MediaDTO;
  onOpen?: () => void;
  onDeleted?: (id: string) => void;
  /** Only passed from an album detail page — detaches from this album without deleting the media itself. */
  onRemoveFromAlbum?: () => void;
  /** When true (multi-select mode), clicking the card toggles selection instead of opening the lightbox, and per-item action buttons are hidden in favor of the selection checkmark. */
  selectMode?: boolean;
  selected?: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const confirm = useConfirm();

  useEffect(() => {
    let cancelled = false;
    api.get<{ url: string }>(`/api/media/${media.id}/url`).then((data) => {
      if (!cancelled) setUrl(data.url);
    });
    return () => {
      cancelled = true;
    };
  }, [media.id]);

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!getSessionToken()) {
      router.push(`/admin-login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    const ok = await confirm({
      title: "Xóa ảnh/video này?",
      description: "Chuyển vào thùng rác — có thể khôi phục lại sau.",
      confirmLabel: "Xóa",
      danger: true,
    });
    if (!ok) return;
    await api.delete(`/api/media/${media.id}`);
    onDeleted?.(media.id);
  }

  async function handleRemoveFromAlbum(e: React.MouseEvent) {
    e.stopPropagation();
    const ok = await confirm({
      title: "Gỡ khỏi album này?",
      description: "Ảnh/video vẫn còn trong hệ thống, chỉ không thuộc album này nữa.",
      confirmLabel: "Gỡ",
    });
    if (!ok) return;
    onRemoveFromAlbum?.();
  }

  async function handleDownload(e: React.MouseEvent) {
    e.stopPropagation();
    await downloadMediaItem(media.id);
  }

  return (
    <div
      data-media-id={media.id}
      className={`group relative aspect-square cursor-pointer overflow-hidden rounded-lg border bg-surface2 ${
        selected ? "border-accent ring-2 ring-accent" : "border-border"
      }`}
      onClick={onOpen}
    >
      {url ? (
        media.type === "IMAGE" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <video src={url} className="h-full w-full object-cover" muted />
        )
      ) : null}
      {media.type === "VIDEO" && (
        <span className="absolute bottom-2 left-2 rounded-md bg-black/65 px-1.5 py-0.5 text-[11px] font-semibold text-white">
          ▶ video
        </span>
      )}
      {selectMode ? (
        <div
          className={`absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold ${
            selected ? "border-accent bg-accent text-white" : "border-white/85 bg-black/35 text-transparent"
          }`}
        >
          ✓
        </div>
      ) : (
        <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-80 transition-opacity md:opacity-0 md:group-hover:opacity-100">
          <button
            type="button"
            onClick={handleDownload}
            aria-label="Tải xuống"
            title="Tải xuống"
            className="flex h-7 w-7 items-center justify-center rounded-md bg-black/55 text-white hover:bg-accent-strong"
          >
            <DownloadIcon className="h-3.5 w-3.5" />
          </button>
          {onRemoveFromAlbum && (
            <button
              type="button"
              onClick={handleRemoveFromAlbum}
              aria-label="Gỡ khỏi album"
              title="Gỡ khỏi album"
              className="flex h-7 w-7 items-center justify-center rounded-md bg-black/55 text-xs text-white hover:bg-accent-strong"
            >
              ⤬
            </button>
          )}
          {/* Inside an album, only download + "remove from album" are offered — no
              soft-delete-to-trash, since that's a global destructive action on the
              media itself, not something an album view should expose. */}
          {!onRemoveFromAlbum && (
            <button
              type="button"
              onClick={handleDelete}
              aria-label="Xóa"
              className="flex h-7 w-7 items-center justify-center rounded-md bg-black/55 text-xs text-white hover:bg-danger"
            >
              ×
            </button>
          )}
        </div>
      )}
    </div>
  );
}
