import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0F1115",
        surface: "#070e1b",
        "surface-bright": "#222c41",
        "surface-container-highest": "#0d1424",
        "primary-container": "#00eefc",
        panel: "#161A21",
        grid: "#1E242C",
        "primary-text": "#E5E7EB",
        "secondary-text": "#9CA3AF",
        "signal-blue": "#3B82F6",
        "signal-pink": "#F472B6",
      },
      fontFamily: {
        headline: ["Space Grotesk", "sans-serif"],
        body: ["Manrope", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
