/**
 * Circular badge mark: teal coin-edge ring, "DP LMW" arced across the top,
 * an 8-wedge pinwheel in the center. Mirrored by hand into
 * fe/src/app/icon.svg (the favicon) since Next's icon route can't import a
 * React component — if this ever changes, update icon.svg to match.
 */
export default function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="96" fill="#f6f2ea" stroke="#2f6f6d" strokeWidth="6" />
      <circle cx="100" cy="100" r="84" fill="none" stroke="#2f6f6d" strokeWidth="2" opacity="0.55" />
      <path id="brandArc" d="M 26.70 73.32 A 78 78 0 0 1 173.30 73.32" fill="none" />
      <text fontFamily="Merriweather, Georgia, serif" fontSize="22" fontWeight="700" fill="#1f3a5f" letterSpacing="2">
        <textPath href="#brandArc" startOffset="50%" textAnchor="middle">
          DP LMW
        </textPath>
      </text>
      <g>
        <path d="M 100 126 L 100.00 76.00 A 50 50 0 0 1 135.36 90.64 Z" fill="#1c3f63" />
        <path d="M 100 126 L 135.36 90.64 A 50 50 0 0 1 150.00 126.00 Z" fill="#2f74ad" />
        <path d="M 100 126 L 150.00 126.00 A 50 50 0 0 1 135.36 161.36 Z" fill="#1c3f63" />
        <path d="M 100 126 L 135.36 161.36 A 50 50 0 0 1 100.00 176.00 Z" fill="#2f74ad" />
        <path d="M 100 126 L 100.00 176.00 A 50 50 0 0 1 64.64 161.36 Z" fill="#1c3f63" />
        <path d="M 100 126 L 64.64 161.36 A 50 50 0 0 1 50.00 126.00 Z" fill="#2f74ad" />
        <path d="M 100 126 L 50.00 126.00 A 50 50 0 0 1 64.64 90.64 Z" fill="#1c3f63" />
        <path d="M 100 126 L 64.64 90.64 A 50 50 0 0 1 100.00 76.00 Z" fill="#2f74ad" />
      </g>
      <circle cx="100" cy="126" r="50" fill="none" stroke="#f6f2ea" strokeWidth="3" />
    </svg>
  );
}
