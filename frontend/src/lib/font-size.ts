export const FONT_SIZES = [
  { value: "small", label: "Small", px: 14 },
  { value: "default", label: "Default", px: 16 },
  { value: "large", label: "Large", px: 18 },
  { value: "xlarge", label: "Extra large", px: 20 },
] as const;

export type FontSize = (typeof FONT_SIZES)[number]["value"];

const KEY = "jr_font_size";

/**
 * Sets the root font size. Tailwind sizes everything in rem, so this
 * scales text, spacing and components proportionally — layouts stay
 * intact instead of text overflowing fixed-size boxes.
 */
export function applyFontSize(size: FontSize) {
  const px = FONT_SIZES.find((f) => f.value === size)?.px ?? 16;
  document.documentElement.style.fontSize = `${px}px`;
}

export function loadFontSize(): FontSize {
  try {
    const v = localStorage.getItem(KEY);
    return FONT_SIZES.some((f) => f.value === v) ? (v as FontSize) : "default";
  } catch {
    return "default";
  }
}

export function saveFontSize(size: FontSize) {
  try {
    localStorage.setItem(KEY, size);
  } catch {
    // Storage unavailable (private mode etc.) — still applies for this visit.
  }
  applyFontSize(size);
}
