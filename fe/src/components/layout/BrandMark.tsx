/**
 * "DP" lettermark: a rounded-square badge split diagonally in the two brand
 * blues, with "DP" in cream serif centered on top. Simpler and more legible
 * at small sizes (nav bar, browser tab) than the earlier circular
 * "DP LMW" arc-text + pinwheel badge. Mirrored by hand into
 * fe/src/app/icon.svg (the favicon) since Next's icon route can't import a
 * React component — if this ever changes, update icon.svg to match.
 */
export default function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="brandClip">
          <rect x="1" y="1" width="38" height="38" rx="9" />
        </clipPath>
      </defs>
      <g clipPath="url(#brandClip)">
        <rect x="1" y="1" width="38" height="38" fill="#2f74ad" />
        <polygon points="1,1 39,1 1,39" fill="#1c3f63" />
      </g>
      <rect x="1" y="1" width="38" height="38" rx="9" fill="none" stroke="#f6f2ea" strokeWidth="1.5" opacity="0.35" />
      <text
        x="20"
        y="27"
        fontFamily="Merriweather, Georgia, serif"
        fontSize="18"
        fontWeight="700"
        fill="#f6f2ea"
        textAnchor="middle"
        letterSpacing="0.5"
      >
        DP
      </text>
    </svg>
  );
}
