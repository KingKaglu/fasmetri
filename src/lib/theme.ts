// Colour theme preference: "system" (follow the OS), "light" or "dark".
//
// The CSS does the real work (globals.css, `@custom-variant dark`): dark
// tokens apply when the OS asks for dark unless <html data-theme="light">, or
// whenever <html data-theme="dark">. This module only stores the choice and
// sets that attribute. THEME_INIT_SCRIPT runs inline in <head>, before first
// paint, so a stored choice never flashes the other theme.

export type ThemePreference = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "fasmetri:theme";
export const THEME_CHANGE_EVENT = "fasmetri:theme-change";

/** theme-color for the browser chrome, per resolved theme. Mirrors --background. */
export const THEME_COLORS = { light: "#ffffff", dark: "#0b1120" } as const;

// Kept tiny and dependency-free; every storage access is guarded because
// Safari private mode and locked-down browsers throw on localStorage.
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

/** The attribute, not storage, is the source of truth: it is what the CSS sees. */
export function readThemePreference(): ThemePreference {
  const value = document.documentElement.getAttribute("data-theme");
  return value === "light" || value === "dark" ? value : "system";
}

export function resolvedTheme(preference: ThemePreference): "light" | "dark" {
  if (preference !== "system") return preference;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyThemePreference(preference: ThemePreference) {
  try {
    if (preference === "system") window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Not persisted, but still applied for this page view.
  }
  const root = document.documentElement;
  if (preference === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", preference);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}
