"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AlbumDTO, MediaDTO } from "@memory-vault/shared";
import AlbumGrid from "@/components/albums/AlbumGrid";
import MediaGrid from "@/components/media/MediaGrid";
import { api } from "@/lib/api-client";
import { getRecentIds } from "@/lib/recentlyViewed";

const RECENT_MEDIA_LIMIT = 8;
const RECENT_ALBUMS_LIMIT = 4;

export default function HomePage() {
  const [recentMedia, setRecentMedia] = useState<MediaDTO[]>([]);
  const [recentAlbums, setRecentAlbums] = useState<AlbumDTO[]>([]);

  useEffect(() => {
    const recentMediaIds = getRecentIds("media");
    const recentAlbumIds = getRecentIds("album");
    if (recentMediaIds.length === 0 && recentAlbumIds.length === 0) return;

    Promise.all([api.get<MediaDTO[]>("/api/media"), api.get<AlbumDTO[]>("/api/albums")]).then(([media, albums]) => {
      const mediaById = new Map(media.map((m) => [m.id, m]));
      const albumById = new Map(albums.map((a) => [a.id, a]));
      setRecentMedia(
        recentMediaIds
          .map((id) => mediaById.get(id))
          .filter((m): m is MediaDTO => Boolean(m))
          .slice(0, RECENT_MEDIA_LIMIT)
      );
      setRecentAlbums(
        recentAlbumIds
          .map((id) => albumById.get(id))
          .filter((a): a is AlbumDTO => Boolean(a))
          .slice(0, RECENT_ALBUMS_LIMIT)
      );
    });
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Kỷ niệm của bạn</h1>
          <p className="mt-1.5 max-w-[46ch] text-sm text-ink-muted">
            Toàn bộ ảnh và video được lưu chung — ai cũng xem và thêm được, chỉ quản trị viên mới xóa.
          </p>
        </div>
        <Link href="/upload" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong">
          + Tải lên
        </Link>
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row">
        <Link href="/albums" className="flex-1 rounded-lg border border-border bg-surface px-5 py-4 hover:border-accent">
          <span className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-tertiary-soft text-tertiary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
          </span>
          <p className="text-sm font-semibold">Xem album</p>
          <p className="mt-1 text-xs text-ink-muted">Gộp thủ công hoặc tự động theo ngày/vị trí chụp</p>
        </Link>
        <Link href="/upload" className="flex-1 rounded-lg border border-border bg-surface px-5 py-4 hover:border-accent">
          <span className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-secondary-soft text-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M12 4l-4 4M12 4l4 4" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></svg>
          </span>
          <p className="text-sm font-semibold">Tải ảnh/video</p>
          <p className="mt-1 text-xs text-ink-muted">Không cần đăng nhập, kéo thả nhiều tệp cùng lúc</p>
        </Link>
      </div>

      {recentAlbums.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-ink-muted">Album xem gần đây</h2>
          <AlbumGrid albums={recentAlbums} />
        </section>
      )}

      {recentMedia.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink-muted">Ảnh &amp; video xem gần đây</h2>
          <MediaGrid items={recentMedia} />
        </section>
      )}
    </main>
  );
}
