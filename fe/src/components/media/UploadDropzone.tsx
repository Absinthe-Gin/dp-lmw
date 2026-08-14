"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { api } from "@/lib/api-client";

type QueueItem = {
  id: string;
  file: File;
  previewUrl: string | null; // null for video (no cheap client-side thumbnail)
  status: "uploading" | "done" | "error";
  error?: string;
};

export default function UploadDropzone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    // Show a preview + "uploading" status for every file immediately, before
    // any network request finishes — this is the actual upload UI, not a
    // separate confirm-then-upload step.
    const items: QueueItem[] = Array.from(files).map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      file,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      status: "uploading",
    }));
    setQueue((prev) => [...items, ...prev]);

    await Promise.all(
      items.map(async (item) => {
        try {
          const formData = new FormData();
          formData.append("file", item.file);
          await api.upload("/api/media", formData);
          setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: "done" } : q)));
        } catch {
          setQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, status: "error", error: "Tải lên thất bại" } : q))
          );
        }
      })
    );
  }

  const uploading = queue.some((q) => q.status === "uploading");
  const doneCount = queue.filter((q) => q.status === "done").length;
  const errorCount = queue.filter((q) => q.status === "error").length;
  const finished = queue.length > 0 && !uploading;

  return (
    <div className="flex flex-col gap-6">
      <div
        className={`flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-[1.5px] border-dashed p-8 text-center transition-colors sm:p-14 ${
          dragging ? "border-accent bg-accent-soft" : "border-border bg-surface hover:border-accent hover:bg-accent-soft"
        }`}
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
            <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
          </svg>
        </span>
        <div>
          <p className="font-semibold">Kéo thả tệp vào đây</p>
          <p className="text-xs text-ink-faint">hoặc bấm để chọn — JPG, PNG, WEBP, HEIC, MP4, MOV</p>
        </div>
        <span className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold">Chọn tệp</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Result banner — appears once every file in the current batch has settled. */}
      {finished && (
        <div className={`rounded-lg border bg-surface px-4 py-3 text-sm ${errorCount === 0 ? "border-success" : "border-danger"}`}>
          <span className={errorCount === 0 ? "text-success" : "text-danger"}>
            {errorCount === 0 ? (
              <>✓ Đã tải lên thành công {doneCount} tệp.</>
            ) : (
              <>Đã tải {doneCount} tệp thành công, {errorCount} tệp thất bại — thử tải lại tệp lỗi.</>
            )}
          </span>{" "}
          <Link href="/media" className="font-semibold text-accent underline">
            Xem ảnh &amp; video
          </Link>
        </div>
      )}

      {/* Live preview + per-file status, newest first. */}
      {queue.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {queue.map((item) => (
            <div key={item.id} className="relative aspect-square overflow-hidden rounded-lg border border-border bg-surface2">
              {item.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-ink-faint">Video</div>
              )}
              <div className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-2 py-1 text-[11px] text-white">
                {item.status === "uploading" && "Đang tải lên…"}
                {item.status === "done" && "✓ Đã tải lên"}
                {item.status === "error" && (item.error ?? "Lỗi")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
