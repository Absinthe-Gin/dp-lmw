/** Shared inline icons (solid style, currentColor fill so they inherit text color/hover states). */

export function DownloadIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path d="M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 1 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3Z" />
      <path d="M3.5 15.75a.75.75 0 0 1 .75.75v.75c0 .414.336.75.75.75h10a.75.75 0 0 0 .75-.75v-.75a.75.75 0 0 1 1.5 0v.75a2.25 2.25 0 0 1-2.25 2.25h-10a2.25 2.25 0 0 1-2.25-2.25v-.75a.75.75 0 0 1 .75-.75Z" />
    </svg>
  );
}
