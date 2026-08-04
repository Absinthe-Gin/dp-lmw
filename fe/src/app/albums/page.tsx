"use client";

import { useEffect, useState } from "react";
import type { AlbumDTO } from "@memory-vault/shared";
import AlbumGrid from "@/components/albums/AlbumGrid";
import { api } from "@/lib/api-client";

export default function AlbumsPage() {
  const [albums, setAlbums] = useState<AlbumDTO[]>([]);
  const [generating, setGenerating] = useState(false);

  function reload() {
    api.get<AlbumDTO[]>("/api/albums").then(setAlbums);
  }

  useEffect(reload, []);

  async function handleAutoGenerate() {
    setGenerating(true);
    try {
      await api.post("/api/albums/auto-generate", {});
      reload();
    } finally {
      setGenerating(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Album</h1>
          <p className="mt-1.5 text-sm text-ink-muted">Gộp thủ công hoặc để hệ thống tự nhóm theo ngày và vị trí chụp.</p>
        </div>
        <button
          type="button"
          onClick={handleAutoGenerate}
          disabled={generating}
          className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold hover:border-accent disabled:opacity-50"
        >
          {generating ? "Đang gộp..." : "⟳ Gộp tự động"}
        </button>
      </div>
      <AlbumGrid albums={albums} />
    </main>
  );
}
