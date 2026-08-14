"use client";

import { useEffect, useState } from "react";
import type { HomeSlideDTO } from "@memory-vault/shared";
import { api } from "@/lib/api-client";

const DEFAULT_INTERVAL_SEC = 5;

/**
 * Home-page hero slideshow — admin-curated images only, visible to every
 * visitor (no login needed to view, matching this app's public-vault auth
 * model). Renders nothing when there are no slides yet, so a fresh deploy
 * with an empty HomeSlide table doesn't leave a blank box on the home page.
 *
 * Deliberately simpler than AlbumSlideshow.tsx (fe/src/components/albums/AlbumSlideshow.tsx):
 * inline (not full-screen), auto-advance only, no manual arrows/click — just
 * non-interactive dot indicators — since this is decorative curated content,
 * not a personal-media viewer.
 */
export default function HomeSlideshow() {
  const [slides, setSlides] = useState<HomeSlideDTO[] | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [intervalSec, setIntervalSec] = useState(DEFAULT_INTERVAL_SEC);

  useEffect(() => {
    Promise.all([
      api.get<HomeSlideDTO[]>("/api/home-slides"),
      api.get<{ homeSlideIntervalSec: number }>("/api/settings/public-status"),
    ]).then(([data, settings]) => {
      setSlides(data);
      if (settings.homeSlideIntervalSec) setIntervalSec(settings.homeSlideIntervalSec);
    });
  }, []);

  useEffect(() => {
    if (!slides?.length) return;
    let cancelled = false;
    const slide = slides[index % slides.length];
    if (!urls[slide.id]) {
      api.get<{ url: string }>(`/api/home-slides/${slide.id}/url?original=1`).then((data) => {
        if (!cancelled) setUrls((prev) => ({ ...prev, [slide.id]: data.url }));
      });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides, index]);

  useEffect(() => {
    if (!slides || slides.length < 2) return;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % slides.length), intervalSec * 1000);
    return () => clearTimeout(timer);
  }, [slides, index, intervalSec]);

  if (!slides || slides.length === 0) return null;

  const current = slides[index % slides.length];
  const url = urls[current.id];

  return (
    <section className="mb-8">
      <div className="relative aspect-[16/7] w-full overflow-hidden rounded-xl border border-border bg-surface2 sm:aspect-[16/5]">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        )}
        {slides.length > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {slides.map((s, i) => (
              <span
                key={s.id}
                className={`h-1.5 rounded-full transition-all ${
                  i === index % slides.length ? "w-5 bg-white" : "w-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
