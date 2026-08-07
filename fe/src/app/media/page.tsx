"use client";

import { useEffect, useMemo, useState } from "react";
import type { MediaDTO } from "@memory-vault/shared";
import MediaGrid from "@/components/media/MediaGrid";
import BackButton from "@/components/ui/BackButton";
import { api } from "@/lib/api-client";

type Filter = "ALL" | "IMAGE" | "VIDEO";
type GroupBy = "day" | "month";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "IMAGE", label: "Ảnh" },
  { value: "VIDEO", label: "Video" },
];

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: "day", label: "Ngày" },
  { value: "month", label: "Tháng" },
];

function StatCard({ value, label, tone }: { value: number; label: string; tone: "accent" | "secondary" | "tertiary" }) {
  const toneClass = { accent: "text-accent-strong", secondary: "text-secondary", tertiary: "text-tertiary" }[tone];
  return (
    <div className="flex-1 rounded-lg border border-border bg-surface px-4 py-3">
      <p className={`font-display text-2xl font-bold ${toneClass}`}>{value}</p>
      <p className="text-xs text-ink-muted">{label}</p>
    </div>
  );
}

export default function MediaPage() {
  const [media, setMedia] = useState<MediaDTO[] | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [groupBy, setGroupBy] = useState<GroupBy>("day");

  useEffect(() => {
    api.get<MediaDTO[]>("/api/media").then(setMedia);
  }, []);

  const filtered = useMemo(() => {
    if (!media) return null;
    if (filter === "ALL") return media;
    return media.filter((m) => m.type === filter);
  }, [media, filter]);

  const imageCount = media?.filter((m) => m.type === "IMAGE").length ?? 0;
  const videoCount = media?.filter((m) => m.type === "VIDEO").length ?? 0;

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

      <div className="mb-6 flex gap-3">
        <StatCard value={imageCount} label="Ảnh" tone="accent" />
        <StatCard value={videoCount} label="Video" tone="secondary" />
      </div>

      <div className="mb-4 flex justify-end">
        <div className="flex gap-1 rounded-full border border-border bg-surface2 p-1">
          {GROUP_OPTIONS.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => setGroupBy(g.value)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                groupBy === g.value ? "bg-accent text-white" : "text-ink-muted hover:text-ink"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {filtered ? <MediaGrid items={filtered} groupBy={groupBy} /> : null}
    </main>
  );
}
