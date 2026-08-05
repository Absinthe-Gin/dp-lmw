"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AlbumDTO } from "@memory-vault/shared";
import AlbumGrid from "@/components/albums/AlbumGrid";
import CreateAlbumDialog from "@/components/albums/CreateAlbumDialog";
import BackButton from "@/components/ui/BackButton";
import { api } from "@/lib/api-client";

export default function AlbumsPage() {
  const router = useRouter();
  const [albums, setAlbums] = useState<AlbumDTO[]>([]);
  const [generating, setGenerating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [query, setQuery] = useState("");

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return albums;
    return albums.filter((a) => a.title.toLowerCase().includes(q));
  }, [albums, query]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <BackButton />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Album</h1>
          <p className="mt-1.5 text-sm text-ink-muted">Gộp thủ công hoặc để hệ thống tự nhóm theo ngày và vị trí chụp.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleAutoGenerate}
            disabled={generating}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold hover:border-accent disabled:opacity-50"
          >
            {generating ? "Đang gộp..." : "⟳ Gộp tự động"}
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong"
          >
            + Album mới
          </button>
        </div>
      </div>

      <div className="relative mb-6 max-w-sm">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm album theo tên..."
          className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-accent"
        />
      </div>

      {query && filtered.length === 0 ? (
        <p className="text-sm text-ink-muted">Không tìm thấy album nào khớp với &quot;{query}&quot;.</p>
      ) : (
        <AlbumGrid albums={filtered} />
      )}

      {showCreate && (
        <CreateAlbumDialog
          onClose={() => setShowCreate(false)}
          onCreated={(album) => {
            setShowCreate(false);
            router.push(`/albums/${album.id}`);
          }}
        />
      )}
    </main>
  );
}
