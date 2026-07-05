import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "#07111F",
        graphite: "#111827",
        "ice-panel": "#EAF6FF",
        cyan: "#38BDF8",
        "sterile-white": "#F8FAFC",
        "temp-blue": "#2563EB",
        amber: "#F59E0B",
        "critical-red": "#DC2626",
        "verified-green": "#16A34A",
        "muted-slate": "#64748B",
        "line-grey": "#CBD5E1",
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "Roboto Mono", "monospace"],
      },
      borderRadius: {
        sm: "2px",
        DEFAULT: "4px",
        md: "6px",
        lg: "8px",
      },
    },
  },
  plugins: [],
};

export default config;
