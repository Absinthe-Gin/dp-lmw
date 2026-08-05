"use client";

import { useRouter } from "next/navigation";

/**
 * Goes back in browser history when there's somewhere to go back to;
 * falls back to a fixed route (default "/") when the page was opened
 * directly (no in-app history — e.g. a bookmarked/shared link).
 */
export default function BackButton({ fallbackHref = "/" }: { fallbackHref?: string }) {
  const router = useRouter();

  function handleClick() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M5 12l6 6M5 12l6-6" />
      </svg>
      Quay lại
    </button>
  );
}
