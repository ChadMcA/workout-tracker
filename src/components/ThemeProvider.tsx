"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type ThemeName = "day" | "night";

interface ThemeContextValue {
  theme: ThemeName;
  toggleTheme: () => void;
  setTheme: (t: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "workout-theme";

function readInitialTheme(): ThemeName {
  if (typeof document === "undefined") return "night";
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "day" || attr === "night" ? attr : "night";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // The inline script in layout.tsx already set data-theme on <html> before
  // hydration (reading localStorage synchronously, avoiding a flash of the
  // wrong theme). We just read that same value back here so React's state
  // matches what's already painted.
  const [theme, setThemeState] = useState<ThemeName>(readInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // localStorage unavailable (private browsing, etc.) — theme just won't persist.
    }

    // Keep the browser/PWA status bar tint in sync with the active theme.
    const bg = theme === "day" ? "#f6f2e9" : "#0d1420";
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", bg);
  }, [theme]);

  function setTheme(t: ThemeName) {
    setThemeState(t);
  }

  function toggleTheme() {
    setThemeState((prev) => (prev === "day" ? "night" : "day"));
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}

/**
 * Inline script source, injected directly into <head> so the correct theme
 * is applied before first paint (no flash of the wrong theme on load).
 * Defaults to "night" if nothing has been chosen yet.
 */
export const NO_FLASH_THEME_SCRIPT = `
(function() {
  try {
    var stored = localStorage.getItem('${STORAGE_KEY}');
    var theme = (stored === 'day' || stored === 'night') ? stored : 'night';
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'night');
  }
})();
`;
