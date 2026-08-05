"use client";

import { useEffect, useMemo, useState } from "react";
import type { MediaDTO } from "@memory-vault/shared";
import MediaGrid from "@/components/media/MediaGrid";
import BackButton from "@/components/ui/BackButton";
import { api } from "@/lib/api-client";

type Filter = "ALL" | "IMAGE" | "VIDEO";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "IMAGE", label: "Ảnh" },
  { value: "VIDEO", label: "Video" },
];

export default function MediaPage() {
  const [media, setMedia] = useState<MediaDTO[] | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");

  useEffect(() => {
    api.get<MediaDTO[]>("/api/media").then(setMedia);
  }, []);

  const filtered = useMemo(() => {
    if (!media) return null;
    if (filter === "ALL") return media;
    return media.filter((m) => m.type === filter);
  }, [media, filter]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <BackButton />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Tất cả ảnh &amp; video</h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Toàn bộ tệp đã tải lên, kể cả những tệp chưa nằm trong album nào.
          </p>
        </div>
        <div className="flex gap-1 rounded-full border border-border bg-surface2 p-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                filter === f.value ? "bg-accent text-white" : "text-ink-muted hover:text-ink"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      {filtered ? <MediaGrid items={filtered} /> : null}
    </main>
  );
}
