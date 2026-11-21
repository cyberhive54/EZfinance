/**
 * Categorical palette for charts and pickers.
 * Deliberate Apple system colors — one source of truth, no violet/indigo,
 * no Tailwind rainbow. Every value has a role and reads in both themes.
 */
export const CATEGORICAL_COLORS = [
  "#0A84FF", // blue
  "#34C759", // green
  "#FF9F0A", // orange
  "#FF453A", // red
  "#30D5C8", // teal
  "#5AC8FA", // light blue
  "#A2845E", // brown
  "#8E8E93", // gray
] as const;

export const SEMANTIC_COLORS = {
  income: "#34C759",
  expense: "#FF453A",
  warning: "#FF9F0A",
  neutral: "#8E8E93",
  primary: "#0A84FF",
} as const;

export function paletteColor(index: number): string {
  return CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length];
}
