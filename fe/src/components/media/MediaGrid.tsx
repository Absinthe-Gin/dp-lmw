"use client";

import { useState } from "react";
import type { MediaDTO } from "@memory-vault/shared";
import MediaCard from "./MediaCard";
import MediaLightbox from "./MediaLightbox";

export default function MediaGrid({ items }: { items: MediaDTO[] }) {
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const visible = items.filter((item) => !deletedIds.has(item.id));

  if (visible.length === 0) {
    return <p className="text-ink-muted">Chưa có ảnh/video nào.</p>;
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {visible.map((item, i) => (
          <MediaCard
            key={item.id}
            media={item}
            onOpen={() => setOpenIndex(i)}
            onDeleted={(id) => setDeletedIds((prev) => new Set(prev).add(id))}
          />
        ))}
      </div>
      {openIndex !== null && (
        <MediaLightbox
          items={visible}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onNavigate={setOpenIndex}
        />
      )}
    </>
  );
}
