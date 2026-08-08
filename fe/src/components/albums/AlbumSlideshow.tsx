"use client";

import { useEffect, useState } from "react";
import type { MediaDTO } from "@memory-vault/shared";
import { api } from "@/lib/api-client";

const AUTO_ADVANCE_MS = 5000;

/**
 * Full-screen slideshow over an album's items — replaces the old "Tạo
 * video từ album" button (which only ever called a stubbed 501 endpoint,
 * ai/src/video.ts). Entirely client-side: no encoding, just cycling
 * through the same signed full-size URLs MediaLightbox already uses.
 * Click anywhere (or the arrow keys) to advance/go back manually.
 *
 * Auto-advance: images use a flat 5s timer. Videos DON'T — a video longer
 * than 5s would otherwise get cut off mid-playback, which defeats the
 * point of including it. Videos instead advance on their own "ended"
 * event (see the <video onEnded> below), so a video always plays to
 * completion before the slideshow moves on, however long that takes; a
 * click still skips it early either way.
 */
export default function AlbumSlideshow({ items, onClose }: { items: MediaDTO[]; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const current = items[index];

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    api.get<{ url: string }>(`/api/media/${current.id}/url?original=1`).then((data) => {
      if (!cancelled) setUrl(data.url);
    });
    return () => {
      cancelled = true;
    };
  }, [current.id]);

  function next() {
    setIndex((i) => (i + 1) % items.length);
  }
  function prev() {
    setIndex((i) => (i - 1 + items.length) % items.length);
  }

  useEffect(() => {
    if (current.type === "VIDEO") return; // advances via onEnded on the <video> below instead
    const timer = setTimeout(next, AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black"
      onClick={next}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Đóng trình chiếu"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        ✕
      </button>

      <span className="absolute left-4 top-4 rounded-full bg-white/10 px-3 py-1.5 font-mono text-xs text-white/80">
        {index + 1} / {items.length}
      </span>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          prev();
        }}
        aria-label="Ảnh trước"
        className="absolute left-4 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:flex"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          next();
        }}
        aria-label="Ảnh tiếp theo"
        className="absolute right-4 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:flex"
      >
        ›
      </button>

      {url &&
        (current.type === "IMAGE" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="max-h-full max-w-full object-contain" />
        ) : (
          <video src={url} className="max-h-full max-w-full object-contain" autoPlay muted playsInline onEnded={next} />
        ))}
    </div>
  );
}
