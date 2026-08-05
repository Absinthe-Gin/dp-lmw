"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AlbumDTO, MediaDTO } from "@memory-vault/shared";
import { api } from "@/lib/api-client";
import { getSessionToken } from "@/lib/session";

function TrashThumb({ media }: { media: MediaDTO }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get<{ url: string }>(`/api/media/${media.id}/trash-url`).then((data) => {
      if (!cancelled) setUrl(data.url);
    });
    return () => {
      cancelled = true;
    };
  }, [media.id]);

  if (!url) return <div className="flex h-full w-full items-center justify-center text-xs text-ink-faint">…</div>;
  return media.type === "IMAGE" ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="h-full w-full object-cover" />
  ) : (
    <video src={url} className="h-full w-full object-cover" muted />
  );
}

export default function TrashPage() {
  const router = useRouter();
  const [media, setMedia] = useState<MediaDTO[]>([]);
  const [albums, setAlbums] = useState<AlbumDTO[]>([]);
  const [loading, setLoading] = useState(true);

  function reload() {
    Promise.all([
      api.get<MediaDTO[]>("/api/media/trash/list"),
      api.get<AlbumDTO[]>("/api/albums/trash/list"),
    ]).then(([m, a]) => {
      setMedia(m);
      setAlbums(a);
      setLoading(false);
    });
  }

  useEffect(() => {
    if (!getSessionToken()) {
      router.push("/admin-login?next=/trash");
      return;
    }
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function restoreMedia(id: string) {
    await api.post(`/api/media/${id}/restore`, {});
    setMedia((prev) => prev.filter((m) => m.id !== id));
  }

  async function purgeMedia(id: string) {
    if (!confirm("Xoá vĩnh viễn ảnh/video này? Không thể hoàn tác.")) return;
    await api.delete(`/api/media/${id}/permanent`);
    setMedia((prev) => prev.filter((m) => m.id !== id));
  }

  async function restoreAlbum(id: string) {
    await api.post(`/api/albums/${id}/restore`, {});
    setAlbums((prev) => prev.filter((a) => a.id !== id));
  }

  async function purgeAlbum(id: string) {
    if (!confirm("Xoá vĩnh viễn album này? Không thể hoàn tác (ảnh bên trong vẫn giữ nguyên).")) return;
    await api.delete(`/api/albums/${id}/permanent`);
    setAlbums((prev) => prev.filter((a) => a.id !== id));
  }

  if (loading) return null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold">Thùng rác</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Ảnh, video và album đã xoá nằm ở đây — khôi phục lại hoặc xoá vĩnh viễn.
        </p>
      </div>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold text-ink-muted">Ảnh &amp; video ({media.length})</h2>
        {media.length === 0 ? (
          <p className="text-sm text-ink-faint">Không có gì trong thùng rác.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {media.map((m) => (
              <div key={m.id} className="overflow-hidden rounded-lg border border-border bg-surface2">
                <div className="aspect-square">
                  <TrashThumb media={m} />
                </div>
                <div className="flex gap-1 p-2">
                  <button
                    type="button"
                    onClick={() => restoreMedia(m.id)}
                    className="flex-1 rounded-md border border-border bg-surface px-2 py-1 text-xs font-semibold hover:border-accent"
                  >
                    Khôi phục
                  </button>
                  <button
                    type="button"
                    onClick={() => purgeMedia(m.id)}
                    className="flex-1 rounded-md border border-danger px-2 py-1 text-xs font-semibold text-danger hover:bg-danger hover:text-white"
                  >
                    Xoá hẳn
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink-muted">Album ({albums.length})</h2>
        {albums.length === 0 ? (
          <p className="text-sm text-ink-faint">Không có gì trong thùng rác.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {albums.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">{a.title}</p>
                  <p className="text-xs text-ink-muted">{a.mediaCount} mục</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => restoreAlbum(a.id)}
                    className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-semibold hover:border-accent"
                  >
                    Khôi phục
                  </button>
                  <button
                    type="button"
                    onClick={() => purgeAlbum(a.id)}
                    className="rounded-md border border-danger px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger hover:text-white"
                  >
                    Xoá hẳn
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
