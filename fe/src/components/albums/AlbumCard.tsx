"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import type { AlbumDTO } from "@memory-vault/shared";
import { api } from "@/lib/api-client";
import { getSessionToken } from "@/lib/session";

export default function AlbumCard({ album, onDeleted }: { album: AlbumDTO; onDeleted?: (id: string) => void }) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    if (!getSessionToken()) {
      router.push(`/admin-login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!confirm(`Xóa album "${album.title}"?`)) return;
    await api.delete(`/api/albums/${album.id}`);
    onDeleted?.(album.id);
  }

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-surface transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(15,32,54,0.25)]">
      <Link href={`/albums/${album.id}`} className="block">
        <div className="relative aspect-[16/10] bg-surface2">
          <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
            {album.mediaCount} mục
          </span>
        </div>
        <div className="p-3.5">
          <p className="text-sm font-semibold">{album.title}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
            <span className={`h-1.5 w-1.5 rounded-full ${album.source === "MANUAL" ? "bg-accent" : "bg-secondary"}`} />
            {album.source === "MANUAL" ? "Thủ công" : "Tự động"}
          </p>
        </div>
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        aria-label="Xóa album"
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-black/55 text-sm text-white opacity-80 transition-opacity hover:bg-danger md:opacity-0 md:group-hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}
