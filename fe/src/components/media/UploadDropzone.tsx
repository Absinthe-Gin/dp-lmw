"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/api-client";

export default function UploadDropzone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setStatus("uploading");

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        await api.upload("/api/media", formData);
      }
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
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
        <p className="text-xs text-ink-faint">hoặc bấm để chọn — JPG, PNG, HEIC, MP4, MOV</p>
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
      {status === "uploading" && <p className="text-sm text-ink-muted">Đang tải lên...</p>}
      {status === "done" && <p className="text-sm text-success">Tải lên thành công.</p>}
      {status === "error" && <p className="text-sm text-danger">Có lỗi xảy ra, thử lại.</p>}
    </div>
  );
}
