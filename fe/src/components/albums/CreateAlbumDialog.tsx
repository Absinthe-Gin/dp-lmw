"use client";

import { useEffect, useState } from "react";
import type { AlbumDTO } from "@memory-vault/shared";
import { api } from "@/lib/api-client";

export default function CreateAlbumDialog({
  onClose,
  onCreated,
  initialMediaIds,
}: {
  onClose: () => void;
  onCreated: (album: AlbumDTO) => void;
  /** Passed when created from a multi-select "Tạo album" bulk action — added to the album immediately on create. */
  initialMediaIds?: string[];
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Nhập tên album.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const album = await api.post<AlbumDTO>("/api/albums", {
        title: title.trim(),
        description: description.trim() || undefined,
        mediaIds: initialMediaIds,
      });
      onCreated(album);
    } catch {
      setError("Không tạo được album, thử lại.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-border bg-surface p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-lg font-semibold">Album mới</h2>
        {initialMediaIds && initialMediaIds.length > 0 && (
          <p className="mt-1 text-xs text-ink-muted">Sẽ thêm {initialMediaIds.length} mục đã chọn vào album này.</p>
        )}
        <div className="mt-4 flex flex-col gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tên album"
            autoFocus
            className="rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-accent"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả (tuỳ chọn)"
            rows={2}
            className="resize-none rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-accent"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold hover:border-accent"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-50"
          >
            {saving ? "Đang tạo..." : "Tạo album"}
          </button>
        </div>
      </form>
    </div>
  );
}
