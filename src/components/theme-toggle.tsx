"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import {
  THEME_CHANGE_EVENT,
  THEME_COLORS,
  applyThemePreference,
  readThemePreference,
  resolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

// System / light / dark switch. The preference lives on <html data-theme>
// (set before paint by THEME_INIT_SCRIPT) and in localStorage; this reads it
// through useSyncExternalStore so the server render ("system") hydrates
// cleanly and then shows the real choice.

const OPTIONS: Array<{ value: ThemePreference; label: string; Icon: typeof Sun }> = [
  { value: "system", label: "სისტემური", Icon: Monitor },
  { value: "light", label: "ღია", Icon: Sun },
  { value: "dark", label: "მუქი", Icon: Moon },
];

function subscribe(listener: () => void) {
  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  window.addEventListener(THEME_CHANGE_EVENT, listener);
  window.addEventListener("storage", listener);
  media?.addEventListener("change", listener);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, listener);
    window.removeEventListener("storage", listener);
    media?.removeEventListener("change", listener);
  };
}

function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, readThemePreference, () => "system");
}

/** Keeps the browser chrome colour (theme-color meta) in step with the theme. */
function useThemeColorMeta(preference: ThemePreference) {
  useEffect(() => {
    const sync = () => {
      const color = THEME_COLORS[resolvedTheme(preference)];
      for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
        meta.setAttribute("content", color);
      }
    };
    sync();
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    media?.addEventListener("change", sync);
    return () => media?.removeEventListener("change", sync);
  }, [preference]);
}

/** Header icon button: cycles system -> light -> dark. */
export function ThemeToggleButton() {
  const preference = useThemePreference();
  useThemeColorMeta(preference);
  const index = OPTIONS.findIndex((option) => option.value === preference);
  const current = OPTIONS[index];
  const next = OPTIONS[(index + 1) % OPTIONS.length];
  const { Icon } = current;
  return (
    <button
      type="button"
      onClick={() => applyThemePreference(next.value)}
      aria-label={`თემა: ${current.label}. დააჭირე „${next.label}“-ზე გადასართავად`}
      title={`თემა: ${current.label}`}
      className="grid size-9 place-items-center rounded-full border border-line bg-surface text-ink-soft hover:bg-surface-soft hover:text-ink"
    >
      <Icon className="size-4" />
    </button>
  );
}

/** Mobile menu: the three options side by side. */
export function ThemeToggleGroup() {
  const preference = useThemePreference();
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2">
      <span id="theme-group-label" className="text-sm font-semibold text-ink-soft">
        თემა
      </span>
      <div role="radiogroup" aria-labelledby="theme-group-label" className="flex rounded-full border border-line bg-surface-soft p-0.5">
        {OPTIONS.map(({ value, label, Icon }) => {
          const active = value === preference;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => applyThemePreference(value)}
              className={`inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold ${
                active ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
              }`}
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
