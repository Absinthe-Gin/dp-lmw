"use client";

import { useEffect, useState } from "react";
import type { MediaDTO } from "@memory-vault/shared";
import { api } from "@/lib/api-client";
import { recordView } from "@/lib/recentlyViewed";

function formatMeta(media: MediaDTO): string {
  const date = new Date(media.takenAt ?? media.uploadedAt);
  const parts = [date.toLocaleString("vi-VN")];
  if (media.width && media.height) parts.push(`${media.width}×${media.height}`);
  return parts.join(" · ");
}

export default function MediaLightbox({
  items,
  index,
  onClose,
  onNavigate,
}: {
  items: MediaDTO[];
  index: number;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
}) {
  const media = items[index];
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    recordView("media", media.id);
  }, [media.id]);

  useEffect(() => {
    setUrl(null);
    let cancelled = false;
    api.get<{ url: string }>(`/api/media/${media.id}/url?original=1`).then((data) => {
      if (!cancelled) setUrl(data.url);
    });
    return () => {
      cancelled = true;
    };
  }, [media.id]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && index < items.length - 1) onNavigate(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onNavigate(index - 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, items.length, onClose, onNavigate]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 sm:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Đóng"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        ✕
      </button>

      {index > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(index - 1);
          }}
          aria-label="Ảnh trước"
          className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20 sm:left-4"
        >
          ‹
        </button>
      )}
      {index < items.length - 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(index + 1);
          }}
          aria-label="Ảnh sau"
          className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20 sm:right-4"
        >
          ›
        </button>
      )}

      <div className="flex max-h-full max-w-3xl flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
        {url ? (
          media.type === "IMAGE" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="max-h-[75vh] max-w-full rounded-lg object-contain" />
          ) : (
            <video src={url} controls autoPlay className="max-h-[75vh] max-w-full rounded-lg" />
          )
        ) : (
          <div className="flex h-64 w-64 items-center justify-center text-sm text-white/60">Đang tải…</div>
        )}
        <div className="rounded-lg bg-black/50 px-3 py-1.5 font-mono text-xs text-white/80">
          {formatMeta(media)} · {index + 1}/{items.length}
        </div>
      </div>
    </div>
  );
}
