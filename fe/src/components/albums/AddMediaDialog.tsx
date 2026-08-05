"use client";

import { useEffect, useState } from "react";
import type { MediaDTO } from "@memory-vault/shared";
import { api } from "@/lib/api-client";

function PickerThumb({ media }: { media: MediaDTO }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get<{ url: string }>(`/api/media/${media.id}/url`).then((data) => {
      if (!cancelled) setUrl(data.url);
    });
    return () => {
      cancelled = true;
    };
  }, [media.id]);

  if (!url) return <div className="h-full w-full bg-surface2" />;
  return media.type === "IMAGE" ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="h-full w-full object-cover" />
  ) : (
    <video src={url} className="h-full w-full object-cover" muted />
  );
}

export default function AddMediaDialog({
  excludeIds,
  onClose,
  onAdd,
}: {
  excludeIds: Set<string>;
  onClose: () => void;
  onAdd: (ids: string[]) => Promise<void>;
}) {
  const [all, setAll] = useState<MediaDTO[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<MediaDTO[]>("/api/media").then(setAll);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const candidates = (all ?? []).filter((m) => !excludeIds.has(m.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAdd() {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      await onAdd(Array.from(selected));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-lg border border-border bg-surface p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-lg font-semibold">Thêm ảnh/video vào album</h2>
        <p className="mt-1 text-sm text-ink-muted">Chọn ảnh/video muốn thêm, có thể chọn nhiều.</p>
        <div className="mt-4 flex-1 overflow-y-auto">
          {all === null ? (
            <p className="text-sm text-ink-faint">Đang tải…</p>
          ) : candidates.length === 0 ? (
            <p className="text-sm text-ink-faint">Không còn ảnh/video nào để thêm.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {candidates.map((m) => {
                const isSelected = selected.has(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggle(m.id)}
                    className={`relative aspect-square overflow-hidden rounded-lg border-2 ${
                      isSelected ? "border-accent" : "border-transparent"
                    }`}
                  >
                    <PickerThumb media={m} />
                    {isSelected && (
                      <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs text-white">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
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
            type="button"
            onClick={handleAdd}
            disabled={saving || selected.size === 0}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-50"
          >
            {saving ? "Đang thêm..." : selected.size > 0 ? `Thêm (${selected.size})` : "Thêm"}
          </button>
        </div>
      </div>
    </div>
  );
}
