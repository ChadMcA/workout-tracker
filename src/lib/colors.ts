export const COLORS = {
  bg: "#1c1b1a",
  bgRaised: "#242220",
  bgInput: "#2a2825",
  text: "#edeae4",
  textDim: "#9c9890",
  line: "#37342f",
  accent: "#5b7fa3",
  accentDim: "#3e5a75",
  amber: "#b8863b",
  green: "#6e9c6e",
  terracotta: "#c97b63",
  lavender: "#8b6fa8",
  grey: "#6b6863",
  slate: "#7a8a99",
} as const;

export const MUSCLE_GROUP_COLORS: Record<string, string> = {
  Chest: COLORS.amber,
  Back: COLORS.accent,
  Biceps: COLORS.green,
  Triceps: COLORS.terracotta,
  Shoulders: COLORS.slate,
  Legs: COLORS.lavender,
  Forearms: COLORS.grey,
};

export const CARDIO_COLORS: Record<string, string> = {
  Stairmaster: COLORS.lavender,
  Treadmill: COLORS.accent,
};
