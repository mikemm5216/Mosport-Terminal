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
        panel: "#161A21",
        grid: "#1E242C",
        "primary-text": "#E5E7EB",
        "secondary-text": "#9CA3AF",
        "signal-blue": "#3B82F6",
        "signal-pink": "#F472B6",
      },
    },
  },
  plugins: [],
};
export default config;
