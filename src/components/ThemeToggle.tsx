"use client";

import { useTheme } from "@/components/ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === "day" ? "Switch to night mode" : "Switch to day mode"}
      className="fixed top-3.5 right-4 z-40 w-9 h-9 rounded-full flex items-center justify-center bg-bg-raised border border-line shadow-sm"
    >
      {theme === "day" ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-[18px] h-[18px] text-accent">
          <circle cx="12" cy="12" r="4.5" />
          <path
            d="M12 2.5v2.2M12 19.3v2.2M4.5 12H2.3M21.7 12h-2.2M6 6l-1.5-1.5M19.5 19.5L18 18M6 18l-1.5 1.5M19.5 4.5L18 6"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-[18px] h-[18px] text-accent">
          <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
