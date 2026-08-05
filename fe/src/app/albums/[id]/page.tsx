"use client";

import { useEffect, useState } from "react";
import type { AlbumDetailDTO } from "@memory-vault/shared";
import MediaGrid from "@/components/media/MediaGrid";
import { api } from "@/lib/api-client";

export default function AlbumDetailPage({ params }: { params: { id: string } }) {
  const [album, setAlbum] = useState<AlbumDetailDTO | null>(null);

  useEffect(() => {
    api.get<AlbumDetailDTO>(`/api/albums/${params.id}`).then(setAlbum);
  }, [params.id]);

  if (!album) return null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">{album.title}</h1>
          {album.description && <p className="mt-1.5 text-sm text-ink-muted">{album.description}</p>}
          <div className="mt-2 flex gap-4 text-xs text-ink-muted">
            <span className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${album.source === "MANUAL" ? "bg-accent" : "bg-secondary"}`} />
              {album.source === "MANUAL" ? "Thủ công" : "Gộp tự động"}
            </span>
            <span className="font-mono">{album.mediaCount} mục</span>
          </div>
        </div>
        <button
          type="button"
          className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold hover:border-accent"
        >
          Tạo video từ album
        </button>
      </div>
      <MediaGrid items={album.media} />
    </main>
  );
}
