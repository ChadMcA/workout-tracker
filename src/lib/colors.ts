"use client";

import { useTheme } from "@/components/ThemeProvider";

export interface Palette {
  bg: string;
  bgRaised: string;
  bgInput: string;
  text: string;
  textDim: string;
  line: string;
  accent: string;
  accentDim: string;
  amber: string;
  green: string;
  terracotta: string;
  lavender: string;
  grey: string;
  slate: string;
  pendingBg: string;
  pendingBorder: string;
  doneBg: string;
  doneBorder: string;
}

export const NIGHT_COLORS: Palette = {
  bg: "#0d1420",
  bgRaised: "#16202e",
  bgInput: "#1c2836",
  text: "#e8edf3",
  textDim: "#7c8ba0",
  line: "#26374a",
  accent: "#6fa8dc",
  accentDim: "#2c4a66",
  amber: "#e0a458",
  green: "#5fae8c",
  terracotta: "#e08868",
  lavender: "#a98fd1",
  grey: "#6c7a8c",
  slate: "#8fa6be",
  pendingBg: "#22303f",
  pendingBorder: "#3d4d62",
  doneBg: "rgba(95,174,140,0.18)",
  doneBorder: "#3f8f6b",
};

export const DAY_COLORS: Palette = {
  bg: "#f6f2e9",
  bgRaised: "#ffffff",
  bgInput: "#eee8da",
  text: "#2b2a28",
  textDim: "#8a8578",
  line: "#e1dacb",
  accent: "#3d6690",
  accentDim: "#cfe0ec",
  amber: "#c97f1e",
  green: "#4f8f52",
  terracotta: "#c25d3f",
  lavender: "#7a5a9e",
  grey: "#85806f",
  slate: "#56697a",
  pendingBg: "#ece7d9",
  pendingBorder: "#cdc5b0",
  doneBg: "rgba(79,143,82,0.14)",
  doneBorder: "#3f7a42",
};

export function paletteFor(theme: "day" | "night"): Palette {
  return theme === "day" ? DAY_COLORS : NIGHT_COLORS;
}

/** Converts a "#rrggbb" hex string to an "rgba(r,g,b,alpha)" string. */
export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function muscleGroupColorsFor(theme: "day" | "night"): Record<string, string> {
  const c = paletteFor(theme);
  return {
    Chest: c.amber,
    Back: c.accent,
    Biceps: c.green,
    Triceps: c.terracotta,
    Shoulders: c.slate,
    Legs: c.lavender,
    Forearms: c.grey,
  };
}

export function cardioColorsFor(theme: "day" | "night"): Record<string, string> {
  const c = paletteFor(theme);
  return {
    Stairmaster: c.lavender,
    Treadmill: c.accent,
  };
}

/** Live theme-aware colors for components that need literal hex values (Recharts, calendar day cells). */
export function useThemeColors() {
  const { theme } = useTheme();
  return {
    theme,
    COLORS: paletteFor(theme),
    MUSCLE_GROUP_COLORS: muscleGroupColorsFor(theme),
    CARDIO_COLORS: cardioColorsFor(theme),
  };
}
