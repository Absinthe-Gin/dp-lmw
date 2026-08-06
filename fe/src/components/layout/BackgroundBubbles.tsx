/**
 * Purely decorative — fixed, full-viewport, behind all real content
 * (pointer-events-none, -z-10) and hidden from assistive tech. Mounted once
 * in layout.tsx like ScrollToTopButton/TopBar, so every page gets it without
 * per-page setup.
 *
 * Both a clouds layer and a stars layer are always in the DOM; which one is
 * visible is decided in globals.css purely via the `[data-theme="dark"]`
 * attribute selector (ThemeToggle.tsx flips that attribute on <html>), so
 * switching theme swaps the decoration instantly with no re-render needed
 * here. Positions/timings are hardcoded rather than randomized so server and
 * client render the same markup (Math.random() here would cause a hydration
 * mismatch).
 */

const CLOUDS: Array<{ width: number; top: string; left?: string; right?: string; duration: number; delay: number; driftX: number; opacity: number }> = [
  { width: 140, top: "10%", left: "4%", duration: 34, delay: 0, driftX: 30, opacity: 0.55 },
  { width: 90, top: "20%", right: "10%", duration: 26, delay: 3, driftX: -22, opacity: 0.45 },
  { width: 170, top: "42%", left: "-2%", duration: 40, delay: 6, driftX: 34, opacity: 0.4 },
  { width: 110, top: "66%", right: "6%", duration: 30, delay: 2, driftX: -26, opacity: 0.5 },
  { width: 80, top: "80%", left: "22%", duration: 24, delay: 5, driftX: 20, opacity: 0.4 },
  { width: 130, top: "6%", right: "28%", duration: 36, delay: 1, driftX: -28, opacity: 0.35 },
];

const STARS: Array<{ size: number; top: string; left: string; duration: number; delay: number }> = [
  { size: 2, top: "8%", left: "12%", duration: 3.2, delay: 0 },
  { size: 3, top: "14%", left: "26%", duration: 4, delay: 0.6 },
  { size: 2, top: "6%", left: "42%", duration: 3.6, delay: 1.2 },
  { size: 4, top: "18%", left: "58%", duration: 4.4, delay: 0.3 },
  { size: 2, top: "10%", left: "72%", duration: 3, delay: 1.8 },
  { size: 3, top: "22%", left: "88%", duration: 3.8, delay: 0.9 },
  { size: 2, top: "30%", left: "8%", duration: 3.4, delay: 2.2 },
  { size: 3, top: "36%", left: "34%", duration: 4.2, delay: 1.4 },
  { size: 2, top: "40%", left: "64%", duration: 3.1, delay: 0.5 },
  { size: 4, top: "34%", left: "92%", duration: 4.6, delay: 2.6 },
  { size: 2, top: "52%", left: "18%", duration: 3.6, delay: 1.1 },
  { size: 3, top: "58%", left: "48%", duration: 4, delay: 0.2 },
  { size: 2, top: "62%", left: "78%", duration: 3.3, delay: 1.9 },
  { size: 2, top: "70%", left: "6%", duration: 3.7, delay: 0.8 },
  { size: 3, top: "76%", left: "38%", duration: 4.3, delay: 2.4 },
  { size: 2, top: "80%", left: "60%", duration: 3.2, delay: 1.6 },
  { size: 4, top: "74%", left: "94%", duration: 4.8, delay: 0.4 },
  { size: 2, top: "90%", left: "24%", duration: 3.5, delay: 2.0 },
  { size: 3, top: "94%", left: "54%", duration: 4.1, delay: 1.3 },
  { size: 2, top: "88%", left: "84%", duration: 3.9, delay: 0.7 },
];

function Cloud({ width, top, left, right, duration, delay, driftX, opacity }: (typeof CLOUDS)[number]) {
  const height = width * 0.42;
  return (
    <div
      className="cloud absolute"
      style={{
        width,
        height,
        top,
        left,
        right,
        opacity,
        animation: `cloud-drift ${duration}s ease-in-out ${delay}s infinite`,
        ["--cloud-drift-x" as string]: `${driftX}px`,
      }}
    >
      <div className="absolute inset-x-0 bottom-0 h-3/5 rounded-full bg-white blur-[2px]" />
      <div className="absolute left-[8%] top-0 h-4/5 w-[42%] rounded-full bg-white blur-[2px]" />
      <div className="absolute right-[10%] top-[4%] h-full w-[52%] rounded-full bg-white blur-[2px]" />
    </div>
  );
}

function Star({ size, top, left, duration, delay }: (typeof STARS)[number]) {
  return (
    <span
      className="star absolute rounded-full bg-white"
      style={{
        width: size,
        height: size,
        top,
        left,
        boxShadow: `0 0 ${size * 2}px ${size * 0.5}px rgba(255,255,255,0.55)`,
        animation: `star-twinkle ${duration}s ease-in-out ${delay}s infinite`,
      }}
    />
  );
}

export default function BackgroundBubbles() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Ambient color depth — soft, huge, heavily blurred. Reacts to theme
          automatically since accent/tertiary/secondary-soft are CSS vars. */}
      <div className="absolute -left-24 -top-32 h-80 w-80 rounded-full bg-accent-soft opacity-80 blur-3xl" />
      <div className="absolute -right-28 top-1/4 h-[26rem] w-[26rem] rounded-full bg-tertiary-soft opacity-70 blur-3xl" />
      <div className="absolute -bottom-32 left-1/4 h-96 w-96 rounded-full bg-secondary-soft opacity-60 blur-3xl" />

      {/* Light mode: drifting clouds. */}
      <div className="clouds-layer">
        {CLOUDS.map((c, i) => (
          <Cloud key={i} {...c} />
        ))}
      </div>

      {/* Dark mode: twinkling stars. */}
      <div className="stars-layer">
        {STARS.map((s, i) => (
          <Star key={i} {...s} />
        ))}
      </div>
    </div>
  );
}
