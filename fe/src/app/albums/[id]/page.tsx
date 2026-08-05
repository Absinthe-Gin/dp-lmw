"use client";

import { useEffect, useState } from "react";
import type { AlbumDetailDTO } from "@memory-vault/shared";
import MediaGrid from "@/components/media/MediaGrid";
import AddMediaDialog from "@/components/albums/AddMediaDialog";
import BackButton from "@/components/ui/BackButton";
import { api } from "@/lib/api-client";
import { recordView } from "@/lib/recentlyViewed";
import { albumDownloadUrl } from "@/lib/download";

export default function AlbumDetailPage({ params }: { params: { id: string } }) {
  const [album, setAlbum] = useState<AlbumDetailDTO | null>(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAddMedia, setShowAddMedia] = useState(false);

  function reload() {
    api.get<AlbumDetailDTO>(`/api/albums/${params.id}`).then(setAlbum);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    recordView("album", params.id);
  }, [params.id]);

  function startEditing() {
    if (!album) return;
    setTitle(album.title);
    setDescription(album.description ?? "");
    setEditing(true);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await api.patch(`/api/albums/${params.id}`, { title: title.trim(), description: description.trim() || undefined });
      setEditing(false);
      reload();
    } finally {
      setSaving(false);
    }
  }

  async function handleAddMedia(ids: string[]) {
    await api.patch(`/api/albums/${params.id}`, { addMediaIds: ids });
    setShowAddMedia(false);
    reload();
  }

  async function handleRemoveFromAlbum(mediaIds: string[]) {
    await api.patch(`/api/albums/${params.id}`, { removeMediaIds: mediaIds });
    setAlbum((prev) =>
      prev
        ? { ...prev, media: prev.media.filter((m) => !mediaIds.includes(m.id)), mediaCount: prev.mediaCount - mediaIds.length }
        : prev
    );
  }

  if (!album) return null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <BackButton fallbackHref="/albums" />
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        {editing ? (
          <form onSubmit={saveEdit} className="flex max-w-md flex-1 flex-col gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="rounded-lg border border-border bg-surface px-3 py-2 font-display text-lg font-semibold outline-none focus:border-accent"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả (tuỳ chọn)"
              rows={2}
              className="resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold hover:border-accent"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-strong disabled:opacity-50"
              >
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-semibold">{album.title}</h1>
              <button
                type="button"
                onClick={startEditing}
                aria-label="Sửa album"
                title="Sửa tên/mô tả"
                className="rounded-md p-1 text-ink-faint hover:bg-surface2 hover:text-ink-muted"
              >
                ✎
              </button>
            </div>
            {album.description && <p className="mt-1.5 text-sm text-ink-muted">{album.description}</p>}
            <div className="mt-2 flex gap-4 text-xs text-ink-muted">
              <span className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${album.source === "MANUAL" ? "bg-accent" : "bg-secondary"}`} />
                {album.source === "MANUAL" ? "Thủ công" : "Gộp tự động"}
              </span>
              <span className="font-mono">{album.mediaCount} mục</span>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowAddMedia(true)}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold hover:border-accent"
          >
            + Thêm ảnh/video
          </button>
          {album.mediaCount > 0 && (
            <a
              href={albumDownloadUrl(album.id)}
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold hover:border-accent"
            >
              ⬇ Tải xuống (.zip)
            </a>
          )}
          <button
            type="button"
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold hover:border-accent"
          >
            Tạo video từ album
          </button>
        </div>
      </div>
      <MediaGrid
        items={album.media}
        onRemoveFromAlbum={(id) => handleRemoveFromAlbum([id])}
        onBulkRemoveFromAlbum={handleRemoveFromAlbum}
      />
      {showAddMedia && (
        <AddMediaDialog
          excludeIds={new Set(album.media.map((m) => m.id))}
          onClose={() => setShowAddMedia(false)}
          onAdd={handleAddMedia}
        />
      )}
    </main>
  );
}
