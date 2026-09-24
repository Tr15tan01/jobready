import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  // Apply hover: styles only on devices that can actually hover. On touch
  // screens a tapped element otherwise keeps its hover style ("sticky
  // hover"), which flickers as the tap and hover states fight.
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-soft": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-in-right": { from: { transform: "translateX(100%)" }, to: { transform: "translateX(0)" } },
      },
      animation: {
        "fade-in": "fade-in 320ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-soft": "fade-soft 200ms ease-out both",
        "slide-in-right": "slide-in-right 280ms cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
export default config;
