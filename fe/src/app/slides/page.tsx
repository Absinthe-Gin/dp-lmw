"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { HomeSlideDTO } from "@memory-vault/shared";
import { api } from "@/lib/api-client";
import { getSessionToken, clearSessionToken } from "@/lib/session";
import { isAdminUnauthorized } from "@/lib/adminAuthError";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import BackButton from "@/components/ui/BackButton";

function SlideThumb({ slide }: { slide: HomeSlideDTO }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get<{ url: string }>(`/api/home-slides/${slide.id}/url`).then((data) => {
      if (!cancelled) setUrl(data.url);
    });
    return () => {
      cancelled = true;
    };
  }, [slide.id]);

  if (!url) return <div className="flex h-full w-full items-center justify-center text-xs text-ink-faint">…</div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className="h-full w-full object-cover" />;
}

export default function SlidesAdminPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const [slides, setSlides] = useState<HomeSlideDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [intervalSec, setIntervalSec] = useState("");
  const [savingInterval, setSavingInterval] = useState(false);
  const [savedInterval, setSavedInterval] = useState(false);

  function reload() {
    Promise.all([
      api.get<HomeSlideDTO[]>("/api/home-slides"),
      api.get<{ homeSlideIntervalSec: number }>("/api/settings/public-status"),
    ])
      .then(([data, settings]) => {
        setSlides(data);
        setIntervalSec(String(settings.homeSlideIntervalSec));
        setLoading(false);
      })
      .catch((err) => {
        if (isAdminUnauthorized(err)) {
          clearSessionToken();
          router.push("/admin-login?next=/slides");
        }
      });
  }

  useEffect(() => {
    if (!getSessionToken()) {
      router.push("/admin-login?next=/slides");
      return;
    }
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("files", file));
      await api.upload<HomeSlideDTO[]>("/api/home-slides", formData);
      reload();
    } catch {
      setUploadError("Tải lên thất bại — chỉ chấp nhận tệp ảnh (JPG, PNG, ...).");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (folderInputRef.current) folderInputRef.current.value = "";
    }
  }

  async function handleDelete(slide: HomeSlideDTO) {
    const ok = await confirm({
      title: "Xóa slide này?",
      description: "Slide sẽ bị xóa hẳn khỏi trình chiếu trang chủ — không thể hoàn tác.",
      confirmLabel: "Xóa",
      danger: true,
    });
    if (!ok) return;
    await api.delete(`/api/home-slides/${slide.id}`);
    setSlides((prev) => prev.filter((s) => s.id !== slide.id));
  }

  async function handleSaveInterval(e: React.FormEvent) {
    e.preventDefault();
    const sec = parseInt(intervalSec, 10);
    if (!sec || sec < 1) return;
    setSavingInterval(true);
    setSavedInterval(false);
    try {
      await api.patch("/api/settings", { homeSlideIntervalSec: sec });
      setSavedInterval(true);
    } finally {
      setSavingInterval(false);
    }
  }

  if (loading) return null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <BackButton />
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold">Quản lý slide</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Ảnh hiển thị trong khung trình chiếu ở đầu trang chủ — ai cũng xem được, chỉ quản trị viên mới thêm/xóa.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-ink">Thời gian tự động chuyển slide</h2>
        <form onSubmit={handleSaveInterval} className="mt-3 flex gap-2">
          <div className="relative flex-1 max-w-[10rem]">
            <input
              type="number"
              min="1"
              step="1"
              value={intervalSec}
              onChange={(e) => {
                setIntervalSec(e.target.value);
                setSavedInterval(false);
              }}
              className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 pr-12 text-sm outline-none focus:border-accent"
            />
            <span className="absolute inset-y-0 right-3 flex items-center text-xs text-ink-faint">giây</span>
          </div>
          <button
            type="submit"
            disabled={!intervalSec || savingInterval}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-50"
          >
            {savingInterval ? "Đang lưu..." : "Lưu"}
          </button>
        </form>
        {savedInterval && <p className="mt-2 text-xs text-success">Đã cập nhật thời gian chuyển slide.</p>}
      </section>

      <section className="mt-6 rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-ink">Thêm ảnh</h2>
        <p className="mt-1 text-xs text-ink-muted">Chỉ chấp nhận ảnh — không hỗ trợ video.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-border bg-surface2 px-4 py-2 text-sm font-semibold hover:border-accent disabled:opacity-50"
          >
            + Chọn ảnh
          </button>
          <button
            type="button"
            disabled={uploading}
            onClick={() => folderInputRef.current?.click()}
            className="rounded-lg border border-border bg-surface2 px-4 py-2 text-sm font-semibold hover:border-accent disabled:opacity-50"
          >
            + Chọn thư mục ảnh
          </button>
          {uploading && <span className="self-center text-xs text-ink-faint">Đang tải lên…</span>}
        </div>
        {uploadError && <p className="mt-2 text-xs text-danger">{uploadError}</p>}
        <input
          ref={fileInputRef}
          type="file"
          // ",.webp" alongside the MIME wildcard: on Windows, the native file
          // picker's "image/*" filter (and the File object's reported .type)
          // both come from the OS's registered MIME associations — on a
          // machine where .webp isn't registered, "image/*" alone can hide
          // .webp files from the dialog entirely. Listing the extension
          // explicitly keeps them selectable regardless.
          accept="image/*,.webp"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
        <input
          ref={(el) => {
            folderInputRef.current = el;
            // webkitdirectory isn't a typed JSX prop — set imperatively.
            if (el) el.setAttribute("webkitdirectory", "");
          }}
          type="file"
          accept="image/*,.webp"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-ink-muted">{slides.length} slide</h2>
        {slides.length === 0 ? (
          <p className="text-sm text-ink-faint">Chưa có slide nào — thêm ảnh ở trên.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {slides.map((slide) => (
              <div key={slide.id} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-surface2">
                <SlideThumb slide={slide} />
                <button
                  type="button"
                  onClick={() => handleDelete(slide)}
                  aria-label="Xóa slide"
                  className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm text-white opacity-80 hover:bg-danger md:opacity-0 md:group-hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
