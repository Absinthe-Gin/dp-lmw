export type Theme = "light" | "dark";

const THEME_KEY = "mv_theme";

/**
 * Reads the user's saved theme choice. Defaults to "light" — there is no
 * system-preference fallback here on purpose: the app always opens in light
 * mode unless someone has explicitly toggled dark via ThemeToggle before.
 */
export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
}

/** Applies the theme to the document root and persists it for next visit. */
export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
}

/**
 * Source for the blocking inline script in layout.tsx's <head> — runs before
 * hydration so a returning visitor who chose dark doesn't see a light flash.
 * Deliberately does nothing (no data-theme attribute) when nothing was saved
 * or the saved value is "light", since :root's default CSS is already light.
 */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    if (localStorage.getItem("${THEME_KEY}") === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  } catch (e) {}
})();
`;
