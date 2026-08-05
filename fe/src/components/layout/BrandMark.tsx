/**
 * Original DP LMW mark: two overlapping rounded squares (a stack of
 * photos), rendered as inline SVG so it's crisp at any size — used both
 * in the TopBar (h-8 w-8) and as the browser favicon (fe/src/app/icon.svg
 * is the same glyph, kept in sync manually since Next's icon.svg can't
 * import a React component). Uses fixed hex values (not the --secondary/
 * --tertiary CSS vars) since it must render identically inside the fixed
 * blue container regardless of light/dark theme.
 */
export default function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3.5" y="8" width="12" height="12" rx="2.75" fill="#3ec0ad" />
      <rect x="8.5" y="3.5" width="12" height="12" rx="2.75" fill="#f7b083" />
    </svg>
  );
}
