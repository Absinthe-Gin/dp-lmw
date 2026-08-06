"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { AlbumDTO } from "@memory-vault/shared";
import { api } from "@/lib/api-client";
import { getSessionToken } from "@/lib/session";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";

export default function AlbumCard({
  album,
  onDeleted,
  selectMode = false,
  selected = false,
  onToggleSelected,
}: {
  album: AlbumDTO;
  onDeleted?: (id: string) => void;
  /** When true (multi-select mode), clicking the card toggles selection instead of navigating, and the delete button is hidden in favor of the selection checkmark. */
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelected?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const confirm = useConfirm();
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (album.mediaCount === 0) return;
    api.get<{ url: string | null }>(`/api/albums/${album.id}/cover-url`).then((data) => {
      if (!cancelled) setCoverUrl(data.url);
    });
    return () => {
      cancelled = true;
    };
  }, [album.id, album.mediaCount]);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    if (!getSessionToken()) {
      router.push(`/admin-login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    const ok = await confirm({
      title: `Xóa album "${album.title}"?`,
      description: "Chuyển vào thùng rác — có thể khôi phục lại sau. Ảnh/video bên trong không bị xóa.",
      confirmLabel: "Xóa",
      danger: true,
    });
    if (!ok) return;
    await api.delete(`/api/albums/${album.id}`);
    onDeleted?.(album.id);
  }

  function handleCardClick(e: React.MouseEvent) {
    if (selectMode) {
      e.preventDefault();
      onToggleSelected?.();
    }
  }

  return (
    <div
      className={`group relative overflow-hidden rounded-lg border bg-surface transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(15,32,54,0.25)] ${
        selected ? "border-accent ring-2 ring-accent" : "border-border"
      }`}
    >
      <Link href={`/albums/${album.id}`} className="block" onClick={handleCardClick}>
        <div className="relative aspect-[16/10] bg-surface2">
          {coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
          <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
            {album.mediaCount} mục
          </span>
          {selectMode && (
            <div
              className={`absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold ${
                selected ? "border-accent bg-accent text-white" : "border-white/85 bg-black/35 text-transparent"
              }`}
            >
              ✓
            </div>
          )}
        </div>
        <div className="p-3.5">
          <p className="text-sm font-semibold">{album.title}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
            <span className={`h-1.5 w-1.5 rounded-full ${album.source === "MANUAL" ? "bg-accent" : "bg-secondary"}`} />
            {album.source === "MANUAL" ? "Thủ công" : "Tự động"}
          </p>
        </div>
      </Link>
      {!selectMode && (
        <button
          type="button"
          onClick={handleDelete}
          aria-label="Xóa album"
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-black/55 text-sm text-white opacity-80 transition-opacity hover:bg-danger md:opacity-0 md:group-hover:opacity-100"
        >
          ×
        </button>
      )}
    </div>
  );
}
