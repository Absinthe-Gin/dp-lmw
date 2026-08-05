"use client";

import type { MediaDTO } from "@memory-vault/shared";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api-client";
import { getSessionToken } from "@/lib/session";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";

export default function MediaCard({
  media,
  onOpen,
  onDeleted,
  onRemoveFromAlbum,
}: {
  media: MediaDTO;
  onOpen?: () => void;
  onDeleted?: (id: string) => void;
  /** Only passed from an album detail page — detaches from this album without deleting the media itself. */
  onRemoveFromAlbum?: () => void;
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

  return (
    <div
      className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border border-border bg-surface2"
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
      <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-80 transition-opacity md:opacity-0 md:group-hover:opacity-100">
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
        <button
          type="button"
          onClick={handleDelete}
          aria-label="Xóa"
          className="flex h-7 w-7 items-center justify-center rounded-md bg-black/55 text-xs text-white hover:bg-danger"
        >
          ×
        </button>
      </div>
    </div>
  );
}
