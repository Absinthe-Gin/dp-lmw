"use client";

import { useEffect, useState } from "react";
import type { MediaDTO } from "@memory-vault/shared";
import MediaGrid from "@/components/media/MediaGrid";
import { api } from "@/lib/api-client";

export default function MediaPage() {
  const [media, setMedia] = useState<MediaDTO[] | null>(null);

  useEffect(() => {
    api.get<MediaDTO[]>("/api/media").then(setMedia);
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold">Tất cả ảnh &amp; video</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Toàn bộ tệp đã tải lên, kể cả những tệp chưa nằm trong album nào.
        </p>
      </div>
      {media ? <MediaGrid items={media} /> : null}
    </main>
  );
}
