import UploadDropzone from "@/components/media/UploadDropzone";

export default function UploadPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-display text-2xl font-semibold">Tải ảnh / video lên</h1>
      <p className="mt-1.5 text-sm text-ink-muted">
        Không cần đăng nhập. Kéo thả nhiều tệp cùng lúc — hệ thống tự đọc ngày chụp và vị trí để gộp album sau.
      </p>
      <div className="mt-8">
        <UploadDropzone />
      </div>
    </main>
  );
}
