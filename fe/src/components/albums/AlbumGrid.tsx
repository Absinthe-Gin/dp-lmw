"use client";

import { useState } from "react";
import type { AlbumDTO } from "@memory-vault/shared";
import AlbumCard from "./AlbumCard";

export default function AlbumGrid({ albums }: { albums: AlbumDTO[] }) {
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const visible = albums.filter((a) => !deletedIds.has(a.id));

  if (visible.length === 0) {
    return <p className="text-ink-muted">Chưa có album nào. Tạo album thủ công hoặc chạy gộp tự động.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {visible.map((album) => (
        <AlbumCard
          key={album.id}
          album={album}
          onDeleted={(id) => setDeletedIds((prev) => new Set(prev).add(id))}
        />
      ))}
    </div>
  );
}
